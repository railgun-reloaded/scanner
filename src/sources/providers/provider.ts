import type { RailgunTransactionData } from '../../models'
import type { DataSource, SyncOptions } from '../data-source'

import { ConnectionManager } from './connectionManager'
import { Iterator } from './iterator'

/**
 * Provider class that manages connection manager and spawns iterators
 */
export class Provider<T extends RailgunTransactionData> implements DataSource<T> {
  /** The latest height up to which this provider can get data */
  head = 0n

  /** Name of datasource */
  name = 'Provider'

  /** Flag to indicate if the data-source can provide live data or not */
  isLiveProvider = true

  /** Connection manager instance */
  private connectionManager: ConnectionManager

  /** Railgun proxy contract address */
  private railgunProxyAddress: `0x${string}`

  /** Array of active iterators */
  private activeIterators: Iterator<T>[] = []

  /**
   * Initialize provider with RPC URL and railgun proxy address
   * @param rpcURL - RPC endpoint URL
   * @param railgunProxyAddress - Railgun proxy contract address
   * @param maxConcurrentRequests - Maximum concurrent requests allowed
   * @param requestDelay - Delay between requests in milliseconds
   */
  constructor (
    rpcURL: string,
    railgunProxyAddress: `0x${string}`,
    maxConcurrentRequests: number = 5,
    requestDelay: number = 100
  ) {
    this.connectionManager = new ConnectionManager(rpcURL, maxConcurrentRequests, requestDelay)
    this.railgunProxyAddress = railgunProxyAddress
  }

  /**
   * Create an async iterator with given config
   * @param options - Sync options
   * @returns AsyncGenerator that returns RailgunTransactionData
   * @yields RailgunTransactionData - Transaction data from logs
   */
  async * from (options: SyncOptions): AsyncGenerator<T> {
    // Create new iterator

    const iterator = new Iterator<T>(
      this.connectionManager,
      this.railgunProxyAddress,
      options
    )

    this.activeIterators.push(iterator)

    try {
      // Iterate through the data
      for await (const data of iterator) {
        this.head = iterator.getLatestBlockHeight()
        yield data
      }
    } finally {
      const index = this.activeIterators.indexOf(iterator)
      if (index > -1) {
        this.activeIterators.splice(index, 1)
      }
    }
  }

  /**
   * Get connection manager status
   * @returns Connection manager status information
   */
  getConnectionStatus () {
    return this.connectionManager.getStatus()
  }

  /**
   * Get active iterators status
   * @returns Array of iterator status objects
   */
  getIteratorsStatus () {
    return this.activeIterators.map(iterator => iterator.getStatus())
  }

  /**
   * Get the connection manager instance
   * @returns Connection manager instance
   */
  getConnectionManager (): ConnectionManager {
    return this.connectionManager
  }
}