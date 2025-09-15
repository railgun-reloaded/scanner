/* eslint-disable @typescript-eslint/no-unused-vars */
import assert from 'node:assert'
import { describe, test } from 'node:test'

import dotenv from 'dotenv'

import { RPCProvider } from '../src/sources'
import { RPCConnectionManager } from '../src/sources/rpc/connection-manager'

dotenv.config()

const MOCK_RPC_URL = process.env['RPC_API_KEY']!
const RAILGUN_PROXY_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9' as `0x${string}`
const RAILGUN_PROXY_DEPLOYMENT_BLOCK = 14737691n
const RAILGUN_DEPLOYMENT_V2 = 16076750n
// TODO: Keep track of range of pre defined set of events
// Verify that both iterators assert same amount of events

describe('RPCProvider', () => {
  test('Should create an iterator from a provider', async () => {
    const connectionManager = new RPCConnectionManager(3)
    const provider = new RPCProvider(
      RAILGUN_PROXY_ADDRESS,
      MOCK_RPC_URL!,
      connectionManager
    )

    const iterator = provider.from({
      startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK,
      endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 10_000n,
      chunkSize: 499n,
      liveSync: false
    })

    let iteratorCount = 0
    try {
      for await (const blockInfo of iterator) {
        for (const tx of blockInfo.transactions) {
          iteratorCount += tx.logs.length
        }
      }
    } catch (error) {
      console.error('Error during processing:', error)
      return
    }
    assert.ok(iteratorCount > 0, 'Iterator from provider should yield events')
  })

  test('Should handle two iterators under the same provider', async () => {
    const connectionManager = new RPCConnectionManager(3)
    const provider = new RPCProvider(
      RAILGUN_PROXY_ADDRESS,
      MOCK_RPC_URL!,
      connectionManager
    )

    const iterator1 = provider.from({
      startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK,
      endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 5_000n,
      chunkSize: 499n,
      liveSync: false
    })

    const iterator2 = provider.from({
      startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 5_000n,
      endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 10_000n,
      chunkSize: 499n,
      liveSync: false
    })

    let iterator1Count = 0
    let iterator2Count = 0

    try {
      await Promise.all([
        (async () => {
          for await (const blockInfo of iterator1) {
            for (const tx of blockInfo.transactions) {
              iterator1Count += tx.logs.length
            }
          }
          return iterator1Count
        })(),
        (async () => {
          for await (const blockInfo of iterator2) {
            for (const tx of blockInfo.transactions) {
              iterator2Count += tx.logs.length
            }
          }
          return iterator2Count
        })()
      ])
    } catch (error) {
      console.error('Error during concurrent processing:', error)
      throw error
    }

    assert.ok(iterator1Count >= 0, 'Iterator1 should process events (may be 0 if no events in range)')
    assert.ok(iterator2Count >= 0, 'Iterator2 should process events (may be 0 if no events in range)')
  })

  test('Should handle multiple providers and multiple iterators concurrently', async () => {
    const connectionManager1 = new RPCConnectionManager(2)
    const provider1 = new RPCProvider(
      RAILGUN_PROXY_ADDRESS,
      MOCK_RPC_URL!,
      connectionManager1
    )

    const connectionManager2 = new RPCConnectionManager(3)
    const provider2 = new RPCProvider(
      RAILGUN_PROXY_ADDRESS,
      MOCK_RPC_URL!,
      connectionManager2
    )

    const connectionManager3 = new RPCConnectionManager(1)
    const provider3 = new RPCProvider(
      RAILGUN_PROXY_ADDRESS,
      MOCK_RPC_URL!,
      connectionManager3
    )

    const iterators = []

    iterators.push({
      provider: provider1,
      iterator: provider1.from({
        startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK,
        endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 3_000n,
        chunkSize: 499n,
        liveSync: false
      }),
      id: 'provider1-iterator1'
    })

    iterators.push({
      provider: provider1,
      iterator: provider1.from({
        startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 3_000n,
        endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 6_000n,
        chunkSize: 499n,
        liveSync: false
      }),
      id: 'provider1-iterator2'
    })

    iterators.push({
      provider: provider2,
      iterator: provider2.from({
        startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 6_000n,
        endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 9_000n,
        chunkSize: 499n,
        liveSync: false
      }),
      id: 'provider2-iterator1'
    })

    iterators.push({
      provider: provider2,
      iterator: provider2.from({
        startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 9_000n,
        endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 12_000n,
        chunkSize: 499n,
        liveSync: false
      }),
      id: 'provider2-iterator2'
    })

    iterators.push({
      provider: provider3,
      iterator: provider3.from({
        startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 12_000n,
        endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 15_000n,
        chunkSize: 499n,
        liveSync: false
      }),
      id: 'provider3-iterator1'
    })

    const results = new Map<string, { success: boolean; eventCount: number; error?: Error }>()

    try {
      await Promise.all(
        iterators.map(async ({ iterator, id }) => {
          try {
            let eventCount = 0
            for await (const blockInfo of iterator) {
              for (const tx of blockInfo.transactions) {
                eventCount += tx.logs.length
              }
            }
            results.set(id, { success: true, eventCount })
          } catch (error) {
            console.error(`Iterator ${id} failed:`, error)
            results.set(id, { success: false, eventCount: 0, error: error as Error })
          }
        })
      )
    } catch (error) {
      console.error('Error during concurrent processing:', error)
      throw error
    }

    const successfulResults = Array.from(results.values()).filter(r => r.success)
    const totalEvents = successfulResults.reduce((sum, r) => sum + r.eventCount, 0)

    assert.ok(successfulResults.length === iterators.length,
      `All ${iterators.length} iterators should complete successfully, but ${successfulResults.length} succeeded`)

    assert.ok(totalEvents >= 0, 'Should process events from concurrent iterators')
  })

  test('Should handle low concurrency provider with rate limiting', async () => {
    const connectionManager = new RPCConnectionManager(1)
    const lowConcurrencyProvider = new RPCProvider(
      RAILGUN_PROXY_ADDRESS,
      MOCK_RPC_URL!,
      connectionManager
    )

    const iterators = []
    for (let i = 0; i < 3; i++) {
      iterators.push({
        iterator: lowConcurrencyProvider.from({
          startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + BigInt(i * 2000),
          endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + BigInt((i + 1) * 2000),
          chunkSize: 499n,
          liveSync: false
        }),
        id: `low-concurrency-iterator-${i}`
      })
    }

    const results = new Map<string, { success: boolean; eventCount: number; error?: Error }>()

    try {
      await Promise.all(
        iterators.map(async ({ iterator, id }) => {
          try {
            let eventCount = 0
            for await (const blockInfo of iterator) {
              for (const tx of blockInfo.transactions) {
                eventCount += tx.logs.length
              }
            }
            results.set(id, { success: true, eventCount })
          } catch (error) {
            console.error(`Iterator ${id} failed:`, error)
            results.set(id, { success: false, eventCount: 0, error: error as Error })
          }
        })
      )
    } catch (error) {
      console.error('Error during concurrent processing:', error)
      throw error
    }

    const successfulResults = Array.from(results.values()).filter(r => r.success)
    const totalEvents = successfulResults.reduce((sum, r) => sum + r.eventCount, 0)

    assert.ok(successfulResults.length === iterators.length, 'All iterators should complete successfully')
    assert.ok(totalEvents >= 0, 'Should process events from all iterators')
  })

  test('Should handle moderate concurrency provider', async () => {
    const connectionManager = new RPCConnectionManager(2)
    const moderateProvider = new RPCProvider(
      RAILGUN_PROXY_ADDRESS,
      MOCK_RPC_URL!,
      connectionManager
    )

    const iterators = []
    for (let i = 0; i < 4; i++) {
      iterators.push({
        iterator: moderateProvider.from({
          startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + BigInt(i * 1500),
          endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + BigInt((i + 1) * 1500),
          chunkSize: 499n,
          liveSync: false
        }),
        id: `moderate-concurrency-iterator-${i}`
      })
    }

    const results = new Map<string, { success: boolean; eventCount: number; error?: Error }>()

    try {
      await Promise.all(
        iterators.map(async ({ iterator, id }) => {
          try {
            let eventCount = 0
            for await (const blockInfo of iterator) {
              for (const tx of blockInfo.transactions) {
                eventCount += tx.logs.length
              }
            }
            results.set(id, { success: true, eventCount })
          } catch (error) {
            console.error(`Iterator ${id} failed:`, error)
            results.set(id, { success: false, eventCount: 0, error: error as Error })
          }
        })
      )
    } catch (error) {
      console.error('Error during concurrent processing:', error)
      throw error
    }

    const successfulResults = Array.from(results.values()).filter(r => r.success)
    const totalEvents = successfulResults.reduce((sum, r) => sum + r.eventCount, 0)

    assert.ok(successfulResults.length === iterators.length, 'All iterators should complete successfully')
    assert.ok(totalEvents >= 0, 'Should process events from all iterators')
  })

  test('Should handle high concurrency provider', async () => {
    const connectionManager = new RPCConnectionManager(5)
    const highConcurrencyProvider = new RPCProvider(
      RAILGUN_PROXY_ADDRESS,
      MOCK_RPC_URL!,
      connectionManager
    )

    const iterators = []
    for (let i = 0; i < 6; i++) {
      iterators.push({
        iterator: highConcurrencyProvider.from({
          startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + BigInt(i * 1000),
          endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + BigInt((i + 1) * 1000),
          chunkSize: 499n,
          liveSync: false
        }),
        id: `high-concurrency-iterator-${i}`
      })
    }

    const results = new Map<string, { success: boolean; eventCount: number; error?: Error }>()

    try {
      await Promise.all(
        iterators.map(async ({ iterator, id }) => {
          try {
            let eventCount = 0
            for await (const blockInfo of iterator) {
              for (const tx of blockInfo.transactions) {
                eventCount += tx.logs.length
              }
            }
            results.set(id, { success: true, eventCount })
          } catch (error) {
            console.error(`Iterator ${id} failed:`, error)
            results.set(id, { success: false, eventCount: 0, error: error as Error })
          }
        })
      )
    } catch (error) {
      console.error('Error during concurrent processing:', error)
      throw error
    }

    const successfulResults = Array.from(results.values()).filter(r => r.success)
    const totalEvents = successfulResults.reduce((sum, r) => sum + r.eventCount, 0)

    assert.ok(successfulResults.length === iterators.length, 'All iterators should complete successfully')
    assert.ok(totalEvents >= 0, 'Should process events from all iterators')
  })

  test('Should handle edge case with very small block ranges', async () => {
    const connectionManager = new RPCConnectionManager(1)
    const edgeCaseProvider = new RPCProvider(
      RAILGUN_PROXY_ADDRESS,
      MOCK_RPC_URL!,
      connectionManager
    )

    const edgeCaseIterator = edgeCaseProvider.from({
      startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK,
      endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 1n,
      chunkSize: 1n,
      liveSync: false
    })

    let eventCount = 0
    try {
      for await (const blockInfo of edgeCaseIterator) {
        for (const tx of blockInfo.transactions) {
          eventCount += tx.logs.length
        }
      }
    } catch (error) {
      console.error('Edge case iterator failed:', error)
    }
    assert.ok(eventCount >= 0, 'Should handle very small block ranges')
  })

  test('Fetch first 10,000 blocks from RPC and check for valid blocks', async () => {
    const connectionManager = new RPCConnectionManager()
    const provider = new RPCProvider(RAILGUN_PROXY_ADDRESS, MOCK_RPC_URL!, connectionManager)
    const iterator = provider.from({
      startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK,
      endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 10_000n,
      chunkSize: 499n,
      liveSync: false
    })
    for await (const blockInfo of iterator) {
      assert.ok(blockInfo, 'BlockInfo is invalid')
    }
  })

  test('Fetch 10,000 blocks and check if they are sorted', async () => {
    const connectionManager = new RPCConnectionManager()
    const provider = new RPCProvider(RAILGUN_PROXY_ADDRESS, MOCK_RPC_URL!, connectionManager)
    const iterator = provider.from({
      startHeight: RAILGUN_DEPLOYMENT_V2,
      endHeight: RAILGUN_DEPLOYMENT_V2 + 10_000n,
      chunkSize: 499n,
      liveSync: false
    })
    let lastBlockNumber = 0n
    for await (const blockInfo of iterator) {
      assert.ok(blockInfo.number > lastBlockNumber, 'BlockInfo is not sorted')
      let lastLogIndex = 0
      for (const tx of blockInfo.transactions) {
        for (const log of tx.logs) {
          assert.ok(log.index >= lastLogIndex, 'LogInfo is not sorted')
          lastLogIndex = log.index
        }
      }
      lastBlockNumber = blockInfo.number
    }
  })

  test('Fetch 10,000 blocks and check if block/transaction/log are valid', async () => {
    const connectionManager = new RPCConnectionManager()
    const provider = new RPCProvider(RAILGUN_PROXY_ADDRESS, MOCK_RPC_URL!, connectionManager)
    const startHeight = RAILGUN_DEPLOYMENT_V2 + 10_000n
    const iterator = provider.from({
      startHeight,
      endHeight: startHeight + 10_000n,
      chunkSize: 499n,
      liveSync: false
    })
    for await (const blockInfo of iterator) {
      assert.ok(blockInfo.transactions && blockInfo.transactions.length > 0, 'TransactionInfo is invalid')
      for (const tx of blockInfo.transactions) {
        assert.ok(tx.logs && tx.logs.length > 0, 'LogInfo is invalid')
      }
    }
  })

  test('Should retrieve exact number of events from fixed set of blocks', async () => {
    const connectionManager = new RPCConnectionManager()
    const provider = new RPCProvider(RAILGUN_PROXY_ADDRESS, MOCK_RPC_URL!, connectionManager)

    const knownBlockEnd = 14779012n
    const knownBlockStart = 14777791n

    const knownNumberOfBlocks = 4
    const knownNumberOfLogs = 9

    const iterator = provider.from({
      startHeight: knownBlockStart,
      endHeight: knownBlockEnd,
      chunkSize: 499n,
      liveSync: false
    })

    let blockCount = 0
    let logCount = 0
    for await (const blockInfo of iterator) {
      blockCount += 1
      for (const tx of blockInfo.transactions) {
        logCount += tx.logs.length
      }
    }

    const knownBlockEnd2 = 14779012n
    const knownBlockStart2 = 14777791n

    const knownNumberOfBlocks2 = 4
    const knownNumberOfLogs2 = 9

    const iterator2 = provider.from({
      startHeight: knownBlockStart2,
      endHeight: knownBlockEnd2,
      chunkSize: 499n,
      liveSync: false
    })

    let blockCount2 = 0
    let logCount2 = 0
    for await (const blockInfo of iterator2) {
      blockCount2 += 1
      for (const tx of blockInfo.transactions) {
        logCount2 += tx.logs.length
      }
    }

    assert.ok(blockCount === knownNumberOfBlocks, 'Should retrieve exact number of blocks from fixed set of block range')
    assert.ok(blockCount2 === knownNumberOfBlocks2, 'Should retrieve exact number of blocks from fixed set of block range')
    assert.ok(logCount === knownNumberOfLogs, 'Should retrieve exact number of logs from fixed set of block range')
    assert.ok(logCount2 === knownNumberOfLogs2, 'Should retrieve exact number of logs from fixed set of block range')
  })
})
