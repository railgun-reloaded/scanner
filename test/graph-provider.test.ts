import assert from 'node:assert'
import { describe, test } from 'node:test'

import dotenv from 'dotenv'

import { SubsquidProvider } from '../src/index.js'

dotenv.config()

const MOCK_SQUID_URL = process.env['SQUID_ENDPOINT']!
const RAILGUN_PROXY_DEPLOYMENT_BLOCK = 5944769n
const DEFAULT_CHUNK_SIZE = 5_000n

describe('GraphProvider[Ethereum]', () => {
  test('Should fetch the current head', async () => {
    const provider = new SubsquidProvider(MOCK_SQUID_URL)
    const head = await provider.head()
    assert.ok(head >= RAILGUN_PROXY_DEPLOYMENT_BLOCK)
  })

  test('Should retrieve known events in block order', async () => {
    const provider = new SubsquidProvider(MOCK_SQUID_URL)

    const knownBlockEnd = 6066713n
    const knownBlockStart = 5944769n

    const knownNumberOfBlocks = 10
    const knownNumberOfActions = 14

    const knownNumberOfBlocks2 = 10
    const knownNumberOfActions2 = 15

    const iterator = provider.from({
      startHeight: knownBlockStart,
      endHeight: knownBlockEnd,
      chunkSize: DEFAULT_CHUNK_SIZE,
      liveSync: false
    })

    const knownBlockEnd2 = 6093952n
    const knownBlockStart2 = 6093627n

    const iterator2 = provider.from({
      startHeight: knownBlockStart2,
      endHeight: knownBlockEnd2,
      chunkSize: DEFAULT_CHUNK_SIZE,
      liveSync: false
    })

    let blockCount = 0
    let actionCount = 0
    const blockNumbers: bigint[] = []

    for await (const _data of iterator) {
      blockCount++
      actionCount += _data.transactions.reduce((acc, tx) => acc + tx.actions.flat().length, 0)
      blockNumbers.push(_data.number)
    }

    let blockCount2 = 0
    let actionCount2 = 0
    const blockNumbers2: bigint[] = []
    for await (const _data of iterator2) {
      blockCount2++
      actionCount2 += _data.transactions.reduce((acc, tx) => acc + tx.actions.flat().length, 0)
      blockNumbers2.push(_data.number)
    }
    assert.strictEqual(blockCount, knownNumberOfBlocks)
    assert.strictEqual(blockCount2, knownNumberOfBlocks2)
    assert.strictEqual(actionCount, knownNumberOfActions)
    assert.strictEqual(actionCount2, knownNumberOfActions2)
    assert.deepStrictEqual(blockNumbers, blockNumbers.toSorted((a, b) => a < b ? -1 : a > b ? 1 : 0))
    assert.deepStrictEqual(blockNumbers2, blockNumbers2.toSorted((a, b) => a < b ? -1 : a > b ? 1 : 0))
  })
})
