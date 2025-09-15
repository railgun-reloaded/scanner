import assert from 'node:assert'
import { describe, test } from 'node:test'
import { performance } from 'perf_hooks'

import dotenv from 'dotenv'

import { JSONRPCClient, JSONRPCProvider } from '../src/sources/json-rpc/index.js'
import { RPCConnectionManager, RPCProvider } from '../src/sources/rpc/index.js'

dotenv.config()

const RAILGUN_PROXY_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9'

describe('Performance Benchmarks', () => {
  const RPC_URL = process.env['RPC_API_KEY']!

  /**
   * Function to profile the Provider
   * @param provider - Provider
   * @param startBlock - Starting block height
   * @param endBlock - Ending block height
   * @param chunkSize - Chunk size
   * @returns - Stats of the benchmark
   */
  async function measureProvider (
    provider: JSONRPCProvider<any> | RPCProvider<any>,
    startBlock: bigint,
    endBlock: bigint,
    chunkSize: bigint
  ) {
    const startTime = performance.now()

    let totalBlocks = 0
    let totalTransactions = 0
    let totalLogs = 0

    const iterator = provider.from({
      startHeight: startBlock,
      endHeight: endBlock,
      chunkSize,
      liveSync: false
    })

    for await (const blockData of iterator) {
      totalBlocks++
      totalTransactions += blockData.transactions.length

      for (const transaction of blockData.transactions) {
        totalLogs += transaction.logs.length
      }
    }

    const endTime = performance.now()
    const duration = (endTime - startTime) / 1000

    return {
      duration,
      totalBlocks,
      totalTransactions,
      totalLogs,
      throughput: totalBlocks / duration
    }
  }

  test('Provider speed comparison', async () => {
    console.log('Running provider comparison...')

    const startBlock = 14777791n
    const endBlock = 14777801n
    const chunkSize = 5n

    const jsonrpcProvider = new JSONRPCProvider(RAILGUN_PROXY_ADDRESS, RPC_URL)
    const jsonrpcResult = await measureProvider(jsonrpcProvider, startBlock, endBlock, chunkSize)

    const connectionManager = new RPCConnectionManager(5)
    const rpcProvider = new RPCProvider(RAILGUN_PROXY_ADDRESS, RPC_URL, connectionManager)
    const rpcResult = await measureProvider(rpcProvider, startBlock, endBlock, chunkSize)

    console.log(`JSONRPCProvider: ${jsonrpcResult.duration.toFixed(3)}s (${jsonrpcResult.throughput.toFixed(2)} blocks/sec)`)
    console.log(`RPCProvider: ${rpcResult.duration.toFixed(3)}s (${rpcResult.throughput.toFixed(2)} blocks/sec)`)

    const speedup = rpcResult.duration / jsonrpcResult.duration
    console.log(`Relative performance: ${speedup.toFixed(2)}x`)

    assert.ok(jsonrpcResult.totalBlocks > 0, 'JSONRPCProvider should process blocks')
    assert.ok(rpcResult.totalBlocks > 0, 'RPCProvider should process blocks')
    assert.ok(jsonrpcResult.totalBlocks === rpcResult.totalBlocks, 'Should process same number of blocks')
  })

  test('Event decoding verification', async () => {
    console.log('Verifying event decoding...')

    const startBlock = 14777791n
    const endBlock = 14777795n
    const chunkSize = 2n

    const jsonrpcProvider = new JSONRPCProvider(RAILGUN_PROXY_ADDRESS, RPC_URL)
    const jsonrpcEventTypes = new Set<string>()

    const jsonrpcIterator = jsonrpcProvider.from({
      startHeight: startBlock,
      endHeight: endBlock,
      chunkSize,
      liveSync: false
    })

    for await (const blockData of jsonrpcIterator) {
      for (const transaction of blockData.transactions) {
        for (const log of transaction.logs) {
          jsonrpcEventTypes.add(log.name)
        }
      }
    }

    const connectionManager = new RPCConnectionManager(1)
    const rpcProvider = new RPCProvider(RAILGUN_PROXY_ADDRESS, RPC_URL, connectionManager)
    const rpcEventTypes = new Set<string>()

    const rpcIterator = rpcProvider.from({
      startHeight: startBlock,
      endHeight: endBlock,
      chunkSize,
      liveSync: false
    })

    for await (const blockData of rpcIterator) {
      for (const transaction of blockData.transactions) {
        for (const log of transaction.logs) {
          rpcEventTypes.add(log.name)
        }
      }
    }

    console.log(`JSONRPCProvider event types: [${Array.from(jsonrpcEventTypes).join(', ')}]`)
    console.log(`RPCProvider event types: [${Array.from(rpcEventTypes).join(', ')}]`)

    assert.ok(jsonrpcEventTypes.size > 0, 'JSONRPCProvider should decode events')
    assert.ok(rpcEventTypes.size > 0, 'RPCProvider should decode events')
    assert.ok(!jsonrpcEventTypes.has('RawLog'), 'JSONRPCProvider should not have raw events')
    assert.ok(!rpcEventTypes.has('RawLog'), 'RPCProvider should not have raw events')
  })

  test('Batch size performance', async () => {
    console.log('Testing batch size performance...')

    const startBlock = 14777791n
    const endBlock = 14777801n
    const chunkSize = 5n
    const batchSizes = [1, 10, 100, 1000]

    const results: Array<{ batchSize: number, duration: number }> = []

    for (const batchSize of batchSizes) {
      const provider = new JSONRPCProvider(RAILGUN_PROXY_ADDRESS, RPC_URL, batchSize)
      const result = await measureProvider(provider, startBlock, endBlock, chunkSize)
      results.push({ batchSize, duration: result.duration })
      console.log(`Batch size ${batchSize}: ${result.duration.toFixed(3)}s`)
    }

    const fastest = results.reduce((min, curr) => curr.duration < min.duration ? curr : min)
    console.log(`Fastest batch size: ${fastest.batchSize}`)

    assert.ok(results.every(r => r.duration > 0), 'All batch sizes should complete')
  })

  test('JSONRPC client batching effectiveness', async () => {
    console.log('Testing JSONRPC client batching...')

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

    assert.ok(results.length === 4, 'All concurrent requests should complete')
    assert.ok(typeof results[0] === 'string', 'Block number should be string')
    assert.ok(Array.isArray(results[1]), 'Logs should be array')
    assert.ok(Array.isArray(results[2]), 'Logs should be array')

    console.log('JSONRPC client batching test completed')
  })

  test('Network efficiency comparison', async () => {
    console.log('Testing network efficiency...')

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

    console.log('Network efficiency test completed')
  })
})
