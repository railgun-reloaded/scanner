import type { EVMBlock } from '../../models'
import type { DataSource, SyncOptions } from '../data-source'

/**
 * Subsquid Provider for fetching data from Subsquid indexers
 * This is a placeholder for future implementation
 */
export class SubsquidProvider<T extends EVMBlock> implements DataSource<T> {
  /** The latest height up to which this provider can get data */
  head = 0n

  /** Flag to indicate if the data-source can provide live data or not */
  isLiveProvider = false

  /**
   * Initialize Subsquid provider
   * @param endpoint - Subsquid endpoint URL
   */
  constructor (endpoint: string) {
    // TODO: Implement Subsquid connection logic
    console.log('Subsquid endpoint:', endpoint)
  }

  /**
   * Create an async iterator with given config
   * @param _options - Sync options (unused in placeholder implementation)
   * @returns AsyncGenerator that returns RailgunTransactionData
   */
  async * from (_options: SyncOptions): AsyncGenerator<T> {
    // TODO: Implement Subsquid data fetching logic
    throw new Error('Subsquid provider not yet implemented')
  }

  /**
   * Destroy the Subsquid connection
   */
  destroy () {
    // TODO: Implement Subsquid connection destruction logic
    console.log('Subsquid connection destroyed')
  }
}
