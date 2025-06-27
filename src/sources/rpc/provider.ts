/* eslint-disable camelcase */
import { RailgunV1, RailgunV2, RailgunV2_1 } from '@railgun-reloaded/contract-abis'
import { decodeEventLog } from 'viem'

import type { EVMLog, RailgunTransactionData } from '../../models'
import type { DataSource, SyncOptions } from '../data-source'

import { RPCConnectionManager } from './connection-manager'

const DEFAULT_CHUNK_SIZE = 500n

/**
 * RPC Provider that manages connections and provides iterators for blockchain data
 */
export class RPCProvider<T extends RailgunTransactionData> implements DataSource<T> {
  /** The latest height up to which this provider can get data */
  head = 0n

  /** Name of datasource */
  name = 'RPCProvider'

  /** Flag to indicate if the data-source can provide live data or not */
  isLiveProvider = true

  /** RPC Connection manager instance */
  private connectionManager: RPCConnectionManager
  /** Railgun proxy contract address */
  private railgunProxyAddress: `0x${string}`
  /**
   * List of event fragments in all the version of Railgun
   */
  eventFragments: any[]

  /**
   * Initialize RPC provider with RPC URL and railgun proxy address
   * @param rpcURL - RPC endpoint URL
   * @param railgunProxyAddress - Railgun proxy contract address
   * @param maxConcurrentRequests - Maximum concurrent requests allowed
   */
  constructor (
    rpcURL: string,
    railgunProxyAddress: `0x${string}`,
    maxConcurrentRequests: number = 5
  ) {
    this.connectionManager = new RPCConnectionManager(rpcURL, maxConcurrentRequests)
    this.railgunProxyAddress = railgunProxyAddress
    const combinedAbi = [...RailgunV1, ...RailgunV2, ...RailgunV2_1]

    // @TODO remove duplicate events
    this.eventFragments = combinedAbi.filter(item => item.type === 'event')
  }

  /**
   * Create an async iterator with given config
   * @param options - Sync options
   * @returns AsyncGenerator that returns RailgunTransactionData
   * @yields RailgunTransactionData - Transaction data from logs
   */
  async * from (options: SyncOptions): AsyncGenerator<T> {
    /**
     * 1. Go through all the historical block starting from startHeight to endHeight (latest)
     * 2. Create a listener for contracts
     * 3. Start returning data to the user
     /
     * @param a - lhs
     * @param b - rhs
     * @returns - Return smallest of a and b
     */
    const minBigInt = (a: bigint, b: bigint) => a < b ? a : b

    if (!this.railgunProxyAddress || this.railgunProxyAddress.length === 0) {
      throw new Error(`Railgun Proxy Address is invalid: ${this.railgunProxyAddress}`)
    }

    let { startHeight, endHeight, chunkSize = DEFAULT_CHUNK_SIZE } = options
    let currentHeight = startHeight
    let lastBlockNumber = 0n

    const client = this.connectionManager.getClient()
    const latestHeight = await client.getBlockNumber()
    if (!latestHeight) throw new Error('Failed to get latest height')

    endHeight = endHeight ? minBigInt(endHeight, BigInt(latestHeight)) : BigInt(latestHeight)

    // Validate chunk size
    if (chunkSize === 0n) throw new Error('ChunkSize cannot be zero')

    // Simple sequential iteration - connection manager handles concurrency
    while (currentHeight < endHeight) {
      const batchEndHeight = minBigInt(currentHeight + chunkSize, endHeight)
      const requestId = `iterator_${currentHeight}_${batchEndHeight}`

      // Delegate request handling to connection manager
      const logs = await this.connectionManager.submitRequest(
        () => this.createLogRequest(currentHeight, batchEndHeight),
        requestId
      )

      if (logs && logs.length > 0) {
        // Process logs and group by block
        let data = {}
        let evmLogs: EVMLog[] = []

        for (const event of logs) {
          // Check if we have event for new blockNumber
          if (event.blockNumber !== lastBlockNumber) {
            // Return the old block data
            if (evmLogs.length > 0) {
              yield { ...data, logs: evmLogs } as T
            }

            lastBlockNumber = event.blockNumber
            // Reinitialize with new block data
            const { blockHash, blockNumber, transactionIndex } = event
            data = {
              blockHash,
              blockNumber,
              transactionIndex,
              origin: event.address,
            }
            // Reset evmLogs
            evmLogs = []
          }

          // Decode event log
          try {
            const decodedEvmLog = decodeEventLog({
              abi: this.eventFragments,
              data: event.data,
              topics: event.topics
            }) as { eventName: string, args: Record<string, any> }

            // Insert the event into an array
            evmLogs.push({
              address: event.address,
              name: decodedEvmLog.eventName!,
              log: decodedEvmLog.args!,
              index: event.logIndex,
            })
          } catch (err) {
            // We don't care about events we can't decode
            continue
          }
        }

        // Don't forget to yield the last block's data
        if (evmLogs.length > 0) {
          yield { ...data, logs: evmLogs } as T
        }
      }

      // Update head and current height
      this.head = batchEndHeight
      currentHeight = batchEndHeight
      console.log('Head: ', this.head, ' Remaining: ', endHeight - this.head)
    }
  }

  /**
   * Create log request for specific block range
   * @param fromBlock - Start block number
   * @param toBlock - End block number
   * @returns Promise resolving to logs
   */
  private async createLogRequest (fromBlock: bigint, toBlock: bigint): Promise<any[]> {
    const client = this.connectionManager.getClient()
    const logs = await client.getLogs({
      address: this.railgunProxyAddress,
      fromBlock,
      toBlock
    })
    return logs
  }

  /**
   * Get the underlying viem client
   * @returns The viem PublicClient instance
   */
  getClient () {
    return this.connectionManager.getClient()
  }
}
