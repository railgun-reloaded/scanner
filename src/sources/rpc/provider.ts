import type { RailgunTransactionData } from '../../models'
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
   * Initialize RPC provider with RPC URL and railgun proxy address
   * @param rpcURL - RPC endpoint URL
   * @param railgunProxyAddress - Railgun proxy contract address
   * @param maxConcurrentRequests - Maximum concurrent requests allowed
   * @param requestDelay - Delay between requests in milliseconds
   */
  constructor (
    rpcURL: string,
    railgunProxyAddress: `0x${string}`,
    maxConcurrentRequests: number = 5
  ) {
    this.connectionManager = new RPCConnectionManager(rpcURL, maxConcurrentRequests)
    this.railgunProxyAddress = railgunProxyAddress
  }

  /**
   * Create an async iterator with given config
   * @param options - Sync options
   * @returns AsyncGenerator that returns RailgunTransactionData
   * @yields RailgunTransactionData - Transaction data from logs
   */
  async * from (options: SyncOptions): AsyncGenerator<T> {
    const { startHeight, endHeight, chunkSize = DEFAULT_CHUNK_SIZE } = options
    let currentHeight = startHeight

    while (currentHeight < endHeight) {
      const batchEndHeight = currentHeight + chunkSize > endHeight!
        ? endHeight
        : currentHeight + chunkSize

      const requestId = `iterator_${currentHeight}_${batchEndHeight}`

      const logs = await this.connectionManager.submitRequest(
        () => this.createLogRequest(currentHeight, batchEndHeight),
        requestId
      )

      // Yield each log as RailgunTransactionData
      for (const log of logs) {
        yield log as T
      }

      this.head = batchEndHeight
      currentHeight = batchEndHeight
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
