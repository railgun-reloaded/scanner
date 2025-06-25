// @@ TODO: read rpc-and-connection-manager-spec.md for more information

import type { RailgunTransactionData } from '../../models'
import type { SyncOptions } from '../data-source'

import type { ConnectionManager } from './connectionManager'

/**
 * Iterator class that handles block range iteration and communicates with connection manager
 */
export class Iterator<T extends RailgunTransactionData> {
  /** Connection manager instance for handling requests */
  private connectionManager: ConnectionManager
  /** Railgun proxy contract address */
  private railgunProxyAddress: `0x${string}`
  /** Starting block height for iteration */
  private startHeight: bigint
  /** Ending block height for iteration */
  private endHeight: bigint
  /** Size of each chunk to process */
  private chunkSize: bigint
  /** Current block height being processed */
  private currentHeight: bigint
  /** Array of request IDs made by this iterator */
  private requestIds: string[] = []
  /** Map of pending requests */
  private pendingRequests: Map<string, Promise<any>> = new Map()

  /**
   * Initialize iterator with connection manager and block range parameters
   * @param connectionManager - Connection manager instance
   * @param railgunProxyAddress - Railgun proxy contract address
   * @param options - Sync options containing block range and chunk size
   */
  constructor (
    connectionManager: ConnectionManager,
    railgunProxyAddress: `0x${string}`,
    options: SyncOptions
  ) {
    this.connectionManager = connectionManager
    this.railgunProxyAddress = railgunProxyAddress
    this.startHeight = options.startHeight
    this.endHeight = options.endHeight || 0n
    this.chunkSize = options.chunkSize || 500n
    this.currentHeight = this.startHeight
  }

  /**
   * Create async generator for iterating through block range
   * @returns AsyncGenerator yielding RailgunTransactionData
   * @yields RailgunTransactionData - Transaction data from each log
   */
  async * [Symbol.asyncIterator] (): AsyncGenerator<T> {
    while (this.currentHeight < this.endHeight) {
      const batchEndHeight = this.currentHeight + this.chunkSize > this.endHeight
        ? this.endHeight
        : this.currentHeight + this.chunkSize

      const requestId = `iterator_${this.currentHeight}_${batchEndHeight}`
      this.requestIds.push(requestId)

      // Create request function for this batch
      // eslint-disable-next-line jsdoc/require-returns
      /** Function that creates the log request for this batch */
      const requestFn = () => this.createLogRequest(this.currentHeight, batchEndHeight)
      
      // Submit request to connection manager
      const requestPromise = this.connectionManager.submitRequest(requestFn, requestId)
      this.pendingRequests.set(requestId, requestPromise)

      try {
        const logs = await requestPromise
        this.pendingRequests.delete(requestId)

        // Yield each log as RailgunTransactionData
        for (const log of logs) {
          yield log as T
        }
      } catch (error) {
        this.pendingRequests.delete(requestId)
        throw error
      }

      this.currentHeight = batchEndHeight
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
   * Get current iteration status
   * @returns Object containing current progress
   */
  getStatus () {
    return {
      currentHeight: this.currentHeight,
      startHeight: this.startHeight,
      endHeight: this.endHeight,
      chunkSize: this.chunkSize,
      pendingRequests: this.pendingRequests.size,
      totalRequests: this.requestIds.length
    }
  }

  /**
   * Get the latest block height this iterator has processed
   * @returns Latest processed block height
   */
  getLatestBlockHeight (): bigint {
    return this.currentHeight
  }
}