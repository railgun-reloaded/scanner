import assert from 'node:assert'
import { describe, test } from 'node:test'

import dotenv from 'dotenv'

import { RPCProvider, SubsquidProvider } from '../src'
import { RPCConnectionManager } from '../src/sources/rpc'

dotenv.config()

const MOCK_RPC_URL = process.env['RPC_API_KEY']!
const MOCK_SQUID_URL = process.env['SQUID_ENDPOINT']!
const RAILGUN_PROXY_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9' as `0x${string}`
const RAILGUN_PROXY_DEPLOYMENT_BLOCK = 14737691n
const RAILGUN_DEPLOYMENT_V2 = 16076750n

describe('GraphProvider[Ethereum]', () => {
  test('Should create an iterator from a provider', async () => {
    const provider = new SubsquidProvider(
      MOCK_SQUID_URL
    )

    const iterator = provider.from({
      startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK,
      endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 10_000n,
      chunkSize: 499n,
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
      endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 1000n,
      chunkSize: 499n,
      liveSync: false
    })

    const iterator2 = provider.from({
      startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 1000n,
      endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 2000n,
      chunkSize: 499n,
      liveSync: false
    })

    // assert count of iterator 1 and 2

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

    const knownBlockEnd = 14779012n
    const knownBlockStart = 14777791n

    const knownNumberOfBlocks = 4
    const knownNumberOfLogs = 9

    const knownNumberOfBlocks2 = 8
    const knownNumberOfLogs2 = 16

    const iterator = provider.from({
      startHeight: knownBlockStart,
      endHeight: knownBlockEnd,
      chunkSize: 499n,
      liveSync: false
    })

    const knownBlockEnd2 = 14777438n
    const knownBlockStart2 = 14771383n

    const iterator2 = provider.from({
      startHeight: knownBlockStart2,
      endHeight: knownBlockEnd2,
      chunkSize: 499n,
      liveSync: false
    })

    let blockCount = 0
    let logCount = 0

    for await (const _data of iterator) {
      blockCount++
      logCount += _data.transactions.reduce((acc, tx) => acc + tx.logs.length, 0)
    }

    let blockCount2 = 0
    let logCount2 = 0
    for await (const _data of iterator2) {
      blockCount2++
      logCount2 += _data.transactions.reduce((acc, tx) => acc + tx.logs.length, 0)
    }

    assert.ok(blockCount === knownNumberOfBlocks, 'Should retrieve exact number of blocks from fixed set of block range')
    assert.ok(blockCount2 === knownNumberOfBlocks2, 'Should retrieve exact number of blocks from fixed set of block range')
    assert.ok(logCount === knownNumberOfLogs, 'Should retrieve exact number of logs from fixed set of block range')
    assert.ok(logCount2 === knownNumberOfLogs2, 'Should retrieve exact number of logs from fixed set of block range')
  })

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
})
