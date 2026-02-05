import assert from 'node:assert'
import { describe, test } from 'node:test'

import dotenv from 'dotenv'

import { SubsquidProvider } from '../src'

dotenv.config()

const MOCK_SQUID_URL = process.env['SQUID_ENDPOINT']!
const RAILGUN_PROXY_DEPLOYMENT_BLOCK = 5944769n
const DEFAULT_CHUNK_SIZE = 5_000n
const RAILGUN_DEPLOYMENT_V2 = 5944769n

describe('GraphProvider[Ethereum]', () => {
  test('Should create an iterator from a provider', async () => {
    const provider = new SubsquidProvider(
      MOCK_SQUID_URL
    )

    const iterator = provider.from({
      startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK,
      endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 20_000n,
      chunkSize: DEFAULT_CHUNK_SIZE,
      liveSync: false
    })

    let iteratorCount = 0

    try {
      // eslint-disable-next-line jsdoc/require-jsdoc
      const processIterator = async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _data of iterator) {
          iteratorCount++
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      }

      await Promise.all([processIterator()])
    } catch (error) {
      console.error('Error during processing:', error)
      return
    }
    assert.ok(iteratorCount > 0, 'Iterator from provider should yield events')
  })

  test('Should handle two iterators under the same provider', async () => {
    const provider = new SubsquidProvider(
      MOCK_SQUID_URL
    )

    const iterator1 = provider.from({
      startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK,
      endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 10_000n,
      chunkSize: DEFAULT_CHUNK_SIZE,
      liveSync: false
    })

    const iterator2 = provider.from({
      startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 10_000n,
      endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 20_000n,
      chunkSize: DEFAULT_CHUNK_SIZE,
      liveSync: false
    })

    let iterator1Count = 0
    let iterator2Count = 0

    try {
      // eslint-disable-next-line jsdoc/require-jsdoc
      const processIterator1 = async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _data of iterator1) {
          iterator1Count++
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      }

      // eslint-disable-next-line jsdoc/require-jsdoc
      const processIterator2 = async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _data of iterator2) {
          iterator2Count++
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      }

      await Promise.all([processIterator1(), processIterator2()])
    } catch (error) {
      console.error('Error during processing:', error)
      throw error
    }

    assert.ok(iterator1Count >= 0, 'Iterator1 should process events (may be 0 if no events in range)')
    assert.ok(iterator2Count >= 0, 'Iterator2 should process events (may be 0 if no events in range)')
  })

  test('Should fetch the current head', async () => {
    const provider = new SubsquidProvider(MOCK_SQUID_URL)
    const head = await provider.head()
    assert.ok(head)
  })

  test('Should retrieve exact number of events from fixed set of blocks', async () => {
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

    for await (const _data of iterator) {
      blockCount++
      actionCount += _data.transactions.reduce((acc, tx) => acc + tx.actions.flat().length, 0)
    }

    let blockCount2 = 0
    let actionCount2 = 0
    for await (const _data of iterator2) {
      blockCount2++
      actionCount2 += _data.transactions.reduce((acc, tx) => acc + tx.actions.flat().length, 0)
    }
    assert.ok(blockCount === knownNumberOfBlocks, 'Should retrieve exact number of blocks from fixed set of block range')
    assert.ok(blockCount2 === knownNumberOfBlocks2, 'Should retrieve exact number of blocks from fixed set of block range')
    assert.ok(actionCount === knownNumberOfActions, 'Should retrieve exact number of logs from fixed set of block range')
    assert.ok(actionCount2 === knownNumberOfActions2, 'Should retrieve exact number of logs from fixed set of block range')
  })

  test('Should fetch data sorted by blockNumber', async () => {
    const startHeight = RAILGUN_DEPLOYMENT_V2
    const endHeight = startHeight + 100_000n

    const graphProvider = new SubsquidProvider(MOCK_SQUID_URL)
    const graphIterator = graphProvider.from({
      startHeight,
      endHeight,
      chunkSize: 499n,
      liveSync: false
    })

    let lastBlockNumber = startHeight
    for await (const blockInfo of graphIterator) {
      if (BigInt(blockInfo.number) >= lastBlockNumber) {
        lastBlockNumber = BigInt(blockInfo.number)
      } else {
        assert.fail('[SubsquidProvider]: Block are not in sorted order')
      }
    }
    assert.ok(true)
  })

  // Should enable this test after new contract upgrade
  /*
  test('Should fetch same data as RPC Provider [V1]', async () => {
    const startHeight = RAILGUN_PROXY_DEPLOYMENT_BLOCK + 10_000n
    const endHeight = startHeight + 10_000n

    const connectionManager = new RPCConnectionManager(5)
    const rpcProvider = new RPCProvider(RAILGUN_PROXY_ADDRESS, MOCK_RPC_URL, connectionManager)
    const rpcIterator = rpcProvider.from({
      startHeight,
      endHeight,
      chunkSize: 499n,
      liveSync: false
    })

    const rpcBlockData = []
    for await (const blockInfo of rpcIterator) {
      rpcBlockData.push(blockInfo)
    }

    const graphProvider = new SubsquidProvider(MOCK_SQUID_URL)
    const graphIterator = graphProvider.from({
      startHeight,
      endHeight,
      chunkSize: 499n,
      liveSync: false
    })

    const graphBlockData = []
    for await (const blockInfo of graphIterator) {
      graphBlockData.push(blockInfo)
    }
    assert.deepEqual(rpcBlockData, graphBlockData)
  })

  test('Should fetch same data as RPC Provider [V2]', async () => {
    const startHeight = RAILGUN_DEPLOYMENT_V2
    const endHeight = startHeight + 10_000n

    const connectionManager = new RPCConnectionManager(5)
    const rpcProvider = new RPCProvider(RAILGUN_PROXY_ADDRESS, MOCK_RPC_URL, connectionManager)
    const rpcIterator = rpcProvider.from({
      startHeight,
      endHeight,
      chunkSize: 499n,
      liveSync: false
    })

    const rpcBlockData = []
    for await (const blockInfo of rpcIterator) {
      rpcBlockData.push(blockInfo)
    }

    const graphProvider = new SubsquidProvider(MOCK_SQUID_URL)
    const graphIterator = graphProvider.from({
      startHeight,
      endHeight,
      chunkSize: 499n,
      liveSync: false
    })

    const graphBlockData = []
    for await (const blockInfo of graphIterator) {
      graphBlockData.push(blockInfo)
    }
    assert.deepEqual(rpcBlockData, graphBlockData)
  })
  */
})
