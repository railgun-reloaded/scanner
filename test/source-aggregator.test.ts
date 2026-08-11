import assert from 'node:assert'
import { describe, test } from 'node:test'

import type { EVMBlock } from '../src/models/index.js'
import type { DataSource, SyncOptions } from '../src/sources/data-source.js'
import { SourceAggregator } from '../src/sources/source-aggregator.js'

/**
 * In-memory DataSource used to drive SourceAggregator tests.
 */
class MockSource implements DataSource<EVMBlock> {
  /**
   * Create a mock source.
   * @param headHeight - Height returned by head().
   * @param isLiveProvider - Whether this source reports as live.
   * @param blocks - Blocks yielded by from().
   */
  constructor (
    private readonly headHeight: bigint,
    readonly isLiveProvider: boolean,
    private readonly blocks: EVMBlock[] = []
  ) {}

  /**
   * Return the configured head height.
   * @returns The head height.
   */
  async head (): Promise<bigint> {
    return this.headHeight
  }

  /**
   * Yield the configured blocks.
   * @param _options - Sync options.
   * @yields The configured blocks.
   */
  async * from (_options: SyncOptions): AsyncGenerator<EVMBlock> {
    for (const block of this.blocks) {
      yield block
    }
  }

  /**
   * No-op destroy.
   */
  destroy (): void {}
}

/**
 * Build a minimal EVMBlock at the given height.
 * @param number - Block number.
 * @returns The block.
 */
const makeBlock = (number: bigint): EVMBlock => ({
  number,
  hash: new Uint8Array(),
  timestamp: 0n,
  transactions: []
})

/**
 * Drain an async iterator into an array.
 * @param iterator - Block iterator.
 * @returns The collected blocks.
 */
const collect = async (iterator: AsyncGenerator<EVMBlock>): Promise<EVMBlock[]> => {
  const blocks: EVMBlock[] = []

  for await (const block of iterator) {
    blocks.push(block)
  }

  return blocks
}

describe('SourceAggregator', () => {
  test('resets lastIteratedHeight when from is called', async () => {
    const source = new MockSource(5n, false, [makeBlock(5n)])
    const aggregator = new SourceAggregator([source])

    await collect(aggregator.from({
      startHeight: 5n,
      endHeight: 5n,
      liveSync: false
    }))

    assert.strictEqual(aggregator.lastIteratedHeight, 5n)

    const iterator = aggregator.from({
      startHeight: 6n,
      endHeight: 6n,
      liveSync: false
    })

    assert.strictEqual(aggregator.lastIteratedHeight, undefined)
    await iterator.return(undefined)
  })

  test('sets lastIteratedHeight to finite sourceEnd when no blocks are yielded', async () => {
    const source = new MockSource(12n, false)
    const aggregator = new SourceAggregator([source])

    const blocks = await collect(aggregator.from({
      startHeight: 5n,
      endHeight: 20n,
      liveSync: false
    }))

    assert.deepStrictEqual(blocks, [])
    assert.strictEqual(aggregator.lastIteratedHeight, 12n)
  })

  test('updates lastIteratedHeight for yielded event-bearing blocks', async () => {
    const source = new MockSource(20n, false, [
      makeBlock(7n),
      makeBlock(11n)
    ])
    const aggregator = new SourceAggregator([source])
    const yieldedHeights: bigint[] = []

    for await (const block of aggregator.from({
      startHeight: 5n,
      endHeight: 20n,
      liveSync: false
    })) {
      yieldedHeights.push(block.number)
      assert.strictEqual(aggregator.lastIteratedHeight, block.number)
    }

    assert.deepStrictEqual(yieldedHeights, [7n, 11n])
    assert.strictEqual(aggregator.lastIteratedHeight, 20n)
  })

  test('records finite sourceEnd for skipped sources', async () => {
    const source = new MockSource(10n, false, [makeBlock(9n)])
    const aggregator = new SourceAggregator([source])

    const blocks = await collect(aggregator.from({
      startHeight: 15n,
      endHeight: 20n,
      liveSync: false
    }))

    assert.deepStrictEqual(blocks, [])
    assert.strictEqual(aggregator.lastIteratedHeight, 10n)
  })
})
