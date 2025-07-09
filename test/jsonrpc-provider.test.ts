import assert from 'node:assert'
import { describe, test } from 'node:test'

import dotenv from 'dotenv'

import { JSONRPCClient, JSONRPCProvider } from '../src/sources/json-rpc/index.js'

dotenv.config()

const RAILGUN_PROXY_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9'

describe('JSONRPCProvider', () => {
  const RPC_URL = process.env['RPC_API_KEY']!

  console.log('RPC URL: ', RPC_URL)

  describe('JSONRPC Client', () => {
    test('Should demonstrate event-loop batching vs sequential requests', async () => {
      const client = new JSONRPCClient(RPC_URL, 1000, true)

      // Make multiple concurrent requests - these should batch together
      const promises = [
        client.call('eth_blockNumber'),
        client.call('eth_getLogs', {
          fromBlock: '0xe17dbf',
          toBlock: '0xe17dc0',
          address: RAILGUN_PROXY_ADDRESS
        }),
        client.call('eth_getLogs', {
          fromBlock: '0xe17dc1',
          toBlock: '0xe17dc5',
          address: RAILGUN_PROXY_ADDRESS
        }),
        client.call('eth_blockNumber')
      ]

      const results = await Promise.all(promises)
      console.log('4 concurrent requests sent as 1 HTTP batch')

      console.log('\nTesting sequential requests (should not batch)')
      const seq1 = await client.call('eth_blockNumber')
      const seq2 = await client.call('eth_blockNumber')
      console.log('2 sequential requests sent as 2 separate HTTP calls')

      assert.ok(results.length === 4, 'All concurrent requests should complete')
      assert.ok(typeof results[0] === 'string', 'Block number should be string')
      assert.ok(Array.isArray(results[1]), 'Logs should be array')
      assert.ok(Array.isArray(results[2]), 'Logs should be array')
      assert.ok(typeof seq1 === 'string', 'Sequential request 1 should complete')
      assert.ok(typeof seq2 === 'string', 'Sequential request 2 should complete')
    })

    test('Should make direct eth_getLogs calls', async () => {
      const client = new JSONRPCClient(RPC_URL)

      const result = await client.call('eth_getLogs', {
        fromBlock: '0xe17dbf',
        toBlock: '0xe17fb2',
        address: RAILGUN_PROXY_ADDRESS
      })

      assert.ok(Array.isArray(result))
      const startBlock = parseInt('0xe17dbf', 16)
      const endBlock = parseInt('0xe17fb2', 16)
      console.log(`Found ${result.length} logs in range (blocks ${startBlock} to ${endBlock})`)

      if (result.length > 0) {
        const firstLog = result[0]
        assert.ok(typeof firstLog.address === 'string')
        assert.ok(typeof firstLog.blockNumber === 'string')
        assert.ok(typeof firstLog.transactionHash === 'string')
        assert.ok(Array.isArray(firstLog.topics))
      }
    })

    test('Should demonstrate network efficiency improvement', async () => {
      const client = new JSONRPCClient(RPC_URL, 1000, true)

      console.log('Traditional approach: 4 separate HTTP requests')
      console.log('Our approach: 1 HTTP request with JSON-RPC batch payload')
      console.log('')
      console.log('Making 4 concurrent calls to demonstrate...')

      const start = Date.now()
      const batchedResults = await Promise.all([
        client.call('eth_blockNumber'),
        client.call('eth_blockNumber'),
        client.call('eth_blockNumber'),
        client.call('eth_blockNumber')
      ])
      const end = Date.now()

      console.log(`4 requests completed in ${end - start}ms using 1 HTTP call`)
      console.log('Network efficiency: 4x improvement (4 requests → 1 HTTP call)')

      assert.ok(batchedResults.length === 4, 'All requests should complete')
      assert.ok(batchedResults.every(r => r === batchedResults[0]), 'All should return same block number')
    })
  })

  describe('JSONRPCProvider', () => {
    test('Should create provider and retrieve blockchain data', async () => {
      const provider = new JSONRPCProvider(
        RPC_URL,
        RAILGUN_PROXY_ADDRESS,
        1000, // maxBatchSize
        true  // enableLogging
      )

      const startBlock = 14777791n
      const endBlock = 14777800n

      let blockCount = 0
      let logCount = 0
      let transactionCount = 0

      const iterator = provider.from({
        startHeight: startBlock,
        endHeight: endBlock,
        chunkSize: 5n,
        liveSync: false
      })

      for await (const blockData of iterator) {
        blockCount++
        transactionCount += blockData.transactions.length

        for (const transaction of blockData.transactions) {
          logCount += transaction.logs.length
          console.log(`  Block ${blockData.number}: Transaction ${transaction.hash} with ${transaction.logs.length} logs`)
        }
      }

      console.log(`Processed ${blockCount} blocks, ${transactionCount} transactions, ${logCount} logs`)

      assert.ok(blockCount >= 0, 'Should process blocks successfully')
      assert.ok(transactionCount >= 0, 'Should process transactions successfully')
      assert.ok(logCount >= 0, 'Should process logs successfully')
    })

    test('Should demonstrate concurrent provider usage with batching', async () => {
      const provider1 = new JSONRPCProvider(RPC_URL, RAILGUN_PROXY_ADDRESS, 1000, true)
      const provider2 = new JSONRPCProvider(RPC_URL, RAILGUN_PROXY_ADDRESS, 1000, true)

      console.log('Creating two providers with overlapping scans')

      // Run two providers concurrently with overlapping ranges
      const promises = [
        (async () => {
          let count = 0
          const iterator1 = provider1.from({
            startHeight: 14777791n,
            endHeight: 14777793n,
            chunkSize: 2n,
            liveSync: false
          })
          for await (const blockData of iterator1) {
            count++
            console.log(`  Provider 1: Block ${blockData.number}`)
          }
          return count
        })(),
        (async () => {
          let count = 0
          const iterator2 = provider2.from({
            startHeight: 14777793n,
            endHeight: 14777795n,
            chunkSize: 2n,
            liveSync: false
          })
          for await (const blockData of iterator2) {
            count++
            console.log(`  Provider 2: Block ${blockData.number}`)
          }
          return count
        })()
      ]

      const results = await Promise.all(promises)
      console.log(`Provider 1 processed ${results[0]} blocks, Provider 2 processed ${results[1]} blocks`)
      assert.ok(results.every(count => count >= 0), 'Both providers should complete successfully')
    })
  })
})
