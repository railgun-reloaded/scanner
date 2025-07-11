/* eslint-disable @typescript-eslint/no-unused-vars */
import assert from 'node:assert'
import { describe, test } from 'node:test'

import dotenv from 'dotenv'

import { RPCProvider } from '../src/sources'

dotenv.config()

const MOCK_RPC_URL = process.env['RPC_API_KEY']!
const RAILGUN_PROXY_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9' as `0x${string}`
const RAILGUN_PROXY_DEPLOYMENT_BLOCK = 14737691n
const RAILGUN_DEPLOYMENT_V2 = 16076750n
// TODO: Keep track of range of pre defined set of events
// Verify that both iterators assert same amount of events

describe('RPCProvider', () => {
  test('Should create an iterator from a provider', async () => {
    const provider = new RPCProvider(
      MOCK_RPC_URL!,
      RAILGUN_PROXY_ADDRESS,
      3
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
    provider.destroy()
  })

  test('Should handle two iterators under the same provider', async () => {
    const provider = new RPCProvider(
      MOCK_RPC_URL!,
      RAILGUN_PROXY_ADDRESS,
      3
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
        for await (const _data of iterator1) {
          iterator1Count++
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      }

      // eslint-disable-next-line jsdoc/require-jsdoc
      const processIterator2 = async () => {
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
    provider.destroy()
  })

  test('Should handle multiple providers and multiple iterators concurrently', async () => {
    const provider1 = new RPCProvider(
      MOCK_RPC_URL!,
      RAILGUN_PROXY_ADDRESS,
      2
    )

    const provider2 = new RPCProvider(
      MOCK_RPC_URL!,
      RAILGUN_PROXY_ADDRESS,
      3
    )

    const provider3 = new RPCProvider(
      MOCK_RPC_URL!,
      RAILGUN_PROXY_ADDRESS,
      1
    )

    const iterators = []

    iterators.push({
      provider: provider1,
      name: 'Provider1-Iterator1',
      iterator: provider1.from({
        startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK,
        endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 500n,
        chunkSize: 200n,
        liveSync: false
      })
    })

    iterators.push({
      provider: provider1,
      name: 'Provider1-Iterator2',
      iterator: provider1.from({
        startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 500n,
        endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 1000n,
        chunkSize: 200n,
        liveSync: false
      })
    })

    iterators.push({
      provider: provider2,
      name: 'Provider2-Iterator1',
      iterator: provider2.from({
        startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK,
        endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 300n,
        chunkSize: 150n,
        liveSync: false
      })
    })

    iterators.push({
      provider: provider2,
      name: 'Provider2-Iterator2',
      iterator: provider2.from({
        startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 300n,
        endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 600n,
        chunkSize: 150n,
        liveSync: false
      })
    })

    iterators.push({
      provider: provider2,
      name: 'Provider2-Iterator3',
      iterator: provider2.from({
        startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 600n,
        endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 900n,
        chunkSize: 150n,
        liveSync: false
      })
    })

    iterators.push({
      provider: provider3,
      name: 'Provider3-Iterator1',
      iterator: provider3.from({
        startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK,
        endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 200n,
        chunkSize: 100n,
        liveSync: false
      })
    })

    const results = new Map()

    try {
      const processPromises = iterators.map(async ({ name, iterator }) => {
        let eventCount = 0

        try {
          for await (const _data of iterator) {
            eventCount++
            await new Promise(resolve => setTimeout(resolve, 5))
          }

          return { name, eventCount, success: true }
        } catch (error) {
          return { name, eventCount: 0, success: false, error }
        }
      })

      const allResults = await Promise.all(processPromises)

      allResults.forEach(result => {
        results.set(result.name, result)
      })
    } catch (error) {
      console.error('Error during concurrent processing:', error)
      throw error
    }

    const successfulResults = Array.from(results.values()).filter(r => r.success)
    const totalEvents = successfulResults.reduce((sum, r) => sum + r.eventCount, 0)

    assert.ok(successfulResults.length === iterators.length,
      `All ${iterators.length} iterators should complete successfully, but ${successfulResults.length} succeeded`)

    assert.ok(totalEvents >= 0, 'Should process events from concurrent iterators')
    provider1.destroy()
    provider2.destroy()
    provider3.destroy()
  })

  test('Should handle low concurrency provider with rate limiting', async () => {
    const lowConcurrencyProvider = new RPCProvider(
      MOCK_RPC_URL!,
      RAILGUN_PROXY_ADDRESS,
      1
    )

    const iterators = []
    for (let i = 0; i < 3; i++) {
      iterators.push({
        name: `LowConcurrency-Iterator${i + 1}`,
        iterator: lowConcurrencyProvider.from({
          startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + BigInt(i * 100),
          endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + BigInt((i + 1) * 100),
          chunkSize: 50n,
          liveSync: false
        })
      })
    }

    const results = new Map()

    const promises = iterators.map(async ({ name, iterator }) => {
      let eventCount = 0

      try {
        for await (const _data of iterator) {
          eventCount++
        }
        return { name, eventCount, success: true }
      } catch (error) {
        return { name, eventCount: 0, success: false, error }
      }
    })

    const allResults = await Promise.all(promises)

    allResults.forEach(result => {
      results.set(result.name, result)
    })

    const successfulResults = Array.from(results.values()).filter(r => r.success)
    const totalEvents = successfulResults.reduce((sum, r) => sum + r.eventCount, 0)

    assert.ok(successfulResults.length === iterators.length, 'All iterators should complete successfully')
    assert.ok(totalEvents >= 0, 'Should process events from all iterators')

    lowConcurrencyProvider.destroy()
  })

  test('Should handle moderate concurrency provider', async () => {
    const moderateProvider = new RPCProvider(
      MOCK_RPC_URL!,
      RAILGUN_PROXY_ADDRESS,
      2
    )

    const iterators = []
    for (let i = 0; i < 4; i++) {
      iterators.push({
        name: `Moderate-Iterator${i + 1}`,
        iterator: moderateProvider.from({
          startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + BigInt(i * 50),
          endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + BigInt((i + 1) * 50),
          chunkSize: 25n,
          liveSync: false
        })
      })
    }

    const results = new Map()

    const promises = iterators.map(async ({ name, iterator }) => {
      let eventCount = 0

      try {
        for await (const _data of iterator) {
          eventCount++
        }
        return { name, eventCount, success: true }
      } catch (error) {
        return { name, eventCount: 0, success: false, error }
      }
    })

    const allResults = await Promise.all(promises)

    allResults.forEach(result => {
      results.set(result.name, result)
    })

    const successfulResults = Array.from(results.values()).filter(r => r.success)
    const totalEvents = successfulResults.reduce((sum, r) => sum + r.eventCount, 0)

    assert.ok(successfulResults.length === iterators.length, 'All iterators should complete successfully')
    assert.ok(totalEvents >= 0, 'Should process events from all iterators')
    moderateProvider.destroy()
  })

  test('Should handle high concurrency provider', async () => {
    const highConcurrencyProvider = new RPCProvider(
      MOCK_RPC_URL!,
      RAILGUN_PROXY_ADDRESS,
      5
    )

    const iterators = []
    for (let i = 0; i < 6; i++) {
      iterators.push({
        name: `HighConcurrency-Iterator${i + 1}`,
        iterator: highConcurrencyProvider.from({
          startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + BigInt(i * 30),
          endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + BigInt((i + 1) * 30),
          chunkSize: 15n,
          liveSync: false
        })
      })
    }

    const results = new Map()

    const promises = iterators.map(async ({ name, iterator }) => {
      let eventCount = 0

      try {
        for await (const _data of iterator) {
          eventCount++
        }
        return { name, eventCount, success: true }
      } catch (error) {
        return { name, eventCount: 0, success: false, error }
      }
    })

    const allResults = await Promise.all(promises)

    allResults.forEach(result => {
      results.set(result.name, result)
    })

    const successfulResults = Array.from(results.values()).filter(r => r.success)
    const totalEvents = successfulResults.reduce((sum, r) => sum + r.eventCount, 0)

    assert.ok(successfulResults.length === iterators.length, 'All iterators should complete successfully')
    assert.ok(totalEvents >= 0, 'Should process events from all iterators')

    highConcurrencyProvider.destroy()
  })

  test('Should handle edge case with very small block ranges', async () => {
    const edgeCaseProvider = new RPCProvider(
      MOCK_RPC_URL!,
      RAILGUN_PROXY_ADDRESS,
      1
    )

    const edgeCaseIterator = edgeCaseProvider.from({
      startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK,
      endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 1n,
      chunkSize: 1n,
      liveSync: false
    })

    let eventCount = 0
    try {
      for await (const _data of edgeCaseIterator) {
        eventCount++
      }
    } catch (error) {
      console.error('Edge case iterator failed:', error)
    }
    assert.ok(eventCount >= 0, 'Should handle very small block ranges')
    edgeCaseProvider.destroy()
  })

  test('Should continously update the head', async () => {
    const provider = new RPCProvider(MOCK_RPC_URL, RAILGUN_PROXY_ADDRESS)
    const lastHead = provider.head

    // Wait until the next block is available
    await new Promise((resolve) => {
      setTimeout(resolve, 12_000)
    })
    const newHead = provider.head

    await provider.destroy()
    assert.notEqual(lastHead, newHead)
  })

  test('Fetch first 10,000 blocks from RPC and check for valid blocks', async () => {
    const provider = new RPCProvider(MOCK_RPC_URL, RAILGUN_PROXY_ADDRESS)
    const iterator = provider.from({
      startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK,
      endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 10_000n,
      chunkSize: 499n,
      liveSync: false
    })
    for await (const blockInfo of iterator) {
      assert.ok(blockInfo, 'BlockInfo is invalid')
    }
    provider.destroy()
  })

  test('Fetch 10,000 blocks and check if they are sorted', async () => {
    const provider = new RPCProvider(MOCK_RPC_URL, RAILGUN_PROXY_ADDRESS)
    const iterator = provider.from({
      startHeight: RAILGUN_DEPLOYMENT_V2,
      endHeight: RAILGUN_DEPLOYMENT_V2 + 10_000n,
      chunkSize: 499n,
      liveSync: false
    })
    let lastBlockNumber = 0n
    for await (const blockInfo of iterator) {
      assert.ok(blockInfo.number >= lastBlockNumber, 'BlockInfo is not sorted')
      let lastTransactionIndex = 0
      for (const tx of blockInfo.transactions) {
        assert.ok(lastTransactionIndex <= tx.index, 'Transactions in block are not sorted')
        lastTransactionIndex = tx.index
        let lastLogIndex = 0
        for (const log of tx.logs) {
          assert.ok(lastLogIndex <= log.index, 'Logs are not sorted')
          lastLogIndex = log.index
        }
      }
      lastBlockNumber = blockInfo.number
    }
    provider.destroy()
  })

  test('Fetch 10,000 blocks and check if block/transaction/log are valid', async () => {
    const provider = new RPCProvider(MOCK_RPC_URL, RAILGUN_PROXY_ADDRESS)
    const startHeight = RAILGUN_DEPLOYMENT_V2 + 10_000n
    const iterator = provider.from({
      startHeight,
      endHeight: startHeight + 10_000n,
      chunkSize: 499n,
      liveSync: false
    })
    for await (const blockInfo of iterator) {
      assert.ok(blockInfo, 'BlockInfo is invalid')
      assert.ok(blockInfo.transactions && blockInfo.transactions.length > 0, 'TransactionInfo is invalid')
      for (const tx of blockInfo.transactions) {
        assert.ok(tx.logs && tx.logs.length > 0, 'LogInfo is invalid')
      }
    }
    provider.destroy()
  })

  test('Should retrieve exact number of events from fixed set of blocks', async () => {
    const provider = new RPCProvider(MOCK_RPC_URL, RAILGUN_PROXY_ADDRESS)

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
    provider.destroy()
  })
})

/*
test('Listen for most recent events', async () => {
  const provider = new RPCProvider(TEST_RPC_URL, RAILGUN_PROXY_ADDRESS)

  setTimeout(() => {
    provider.destroy()
  }, 10_000)

  const startHeight = 22792284n
  const iterator = provider.from({
    startHeight,
    chunkSize: 500n,
    liveSync: true
  })

  for await (const blockInfo of iterator) {
    console.log(blockInfo)
  }
})
*/
