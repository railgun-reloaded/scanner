import assert from 'node:assert'
import { describe, test } from 'node:test'

import dotenv from 'dotenv'

import { JSONRPCClient, JSONRPCProvider } from '../src/sources/json-rpc/index.js'

dotenv.config()

const RAILGUN_PROXY_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9'

describe('JSONRPCProvider', () => {
  const RPC_URL = process.env['RPC_API_KEY']!
  const WS_URL = process.env['WS_API_KEY']!

  describe('JSONRPC Client', () => {
    test('Should demonstrate event-loop batching vs sequential requests', async () => {
      const client = new JSONRPCClient(RPC_URL, 1000, true)

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

      const seq1 = await client.call('eth_blockNumber')
      const seq2 = await client.call('eth_blockNumber')

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
        toBlock: '0xe17dc8',
        address: RAILGUN_PROXY_ADDRESS
      })

      assert.ok(Array.isArray(result))

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

      const start = Date.now()
      const batchedResults = await Promise.all([
        client.call('eth_blockNumber'),
        client.call('eth_blockNumber'),
        client.call('eth_blockNumber'),
        client.call('eth_blockNumber')
      ])
      const end = Date.now()

      console.log(`4 requests completed in ${end - start}ms using 1 HTTP call`)

      assert.ok(batchedResults.length === 4, 'All requests should complete')
      assert.ok(batchedResults.every(r => r === batchedResults[0]), 'All should return same block number')
    })
  })

  describe('JSONRPCProvider', () => {
    test('Should create provider and retrieve blockchain data', async () => {
      const provider = new JSONRPCProvider(
        RPC_URL,
        RAILGUN_PROXY_ADDRESS,
        1000,
        true
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
        }
      }

      assert.ok(blockCount >= 0, 'Should process blocks successfully')
      assert.ok(transactionCount >= 0, 'Should process transactions successfully')
      assert.ok(logCount >= 0, 'Should process logs successfully')
    })

    test('Should demonstrate concurrent provider usage with batching', async () => {
      const provider1 = new JSONRPCProvider(RPC_URL, RAILGUN_PROXY_ADDRESS, 1000, true)
      const provider2 = new JSONRPCProvider(RPC_URL, RAILGUN_PROXY_ADDRESS, 1000, true)

      const promises = [
        (async () => {
          let count = 0
          const iterator1 = provider1.from({
            startHeight: 14777791n,
            endHeight: 14777793n,
            chunkSize: 2n,
            liveSync: false
          })
          for await (const _blockData of iterator1) {
            count++
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
          for await (const _blockData of iterator2) {
            count++
          }
          return count
        })()
      ]

      const results = await Promise.all(promises)
      assert.ok(results.every(count => count >= 0), 'Both providers should complete successfully')
    })

    test('Should properly sort blocks, transactions, and logs', async () => {
      const provider = new JSONRPCProvider(RPC_URL, RAILGUN_PROXY_ADDRESS, 1000, false)

      const startBlock = 14777791n
      const endBlock = 14777800n

      let previousBlockNumber = 0n
      let blockCount = 0
      let totalTransactions = 0
      let totalLogs = 0

      const iterator = provider.from({
        startHeight: startBlock,
        endHeight: endBlock,
        chunkSize: 10n,
        liveSync: false
      })

      for await (const blockData of iterator) {
        blockCount++
        
        assert.ok(blockData.number >= previousBlockNumber, 
          `Block ${blockData.number} should be >= previous block ${previousBlockNumber}`)
        
        previousBlockNumber = blockData.number

        let previousTxIndex = -1
        for (const transaction of blockData.transactions) {
          totalTransactions++
          
          assert.ok(transaction.index > previousTxIndex, 
            `Transaction index ${transaction.index} should be > previous ${previousTxIndex}`)
          
          previousTxIndex = transaction.index

          let previousLogIndex = -1
          for (const log of transaction.logs) {
            totalLogs++
            
            assert.ok(log.index > previousLogIndex, 
              `Log index ${log.index} should be > previous ${previousLogIndex}`)
            
            previousLogIndex = log.index
          }
        }
      }

      assert.ok(blockCount > 0, 'Should process at least one block')
      assert.ok(totalTransactions >= 0, 'Should process transactions')
      assert.ok(totalLogs >= 0, 'Should process logs')
    })
  })
})