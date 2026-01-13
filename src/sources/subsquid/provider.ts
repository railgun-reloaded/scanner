import { SubsquidClient } from '@railgun-reloaded/subsquid-client'

import type { EVMBlock } from '../../models'
import type { DataSource, SyncOptions } from '../data-source'

import { autoPaginateBlockQuery } from './query'

/**
 * Subsquid Provider for fetching data from Subsquid indexers
 * This is a placeholder for future implementation
 */
export class SubsquidProvider<T extends EVMBlock> implements DataSource<T> {
  /** Flag to indicate if the data-source can provide live data or not */
  isLiveProvider = false

  /** Client to interact with subsquid */
  #client: SubsquidClient

  /**
   * Initialize Subsquid provider
   * @param endpoint - Subsquid endpoint URL
   */
  constructor (endpoint: string) {
    if (!endpoint || endpoint.length === 0) {
      throw new Error('Invalid subsquid endpoint provided')
    }

    this.#client = new SubsquidClient({
      customSubsquidUrl: endpoint
    })
  }

  /**
   * Get the current head of subsquid, this is not necessarily the
   * block upto which iterator can provide data because this value changes
   * every time new blocks are indexed in the subsquid
   * @returns - Latest height of the subsquid
   */
  head () {
    return this.#getBlockHeight()
  }

  /**
   * Get Block Height
   * @returns Current block height indexed by subsquid
   */
  async #getBlockHeight () {
    const { squidStatus } = await this.#client.query({
      squidStatus: {
        fields: ['height'],
      }
    })
    if (!squidStatus?.height) throw new Error('Failed to get height from subsquid')

    return BigInt(squidStatus.height)
  }

  /**
   * Create an async iterator with given config
   * @param _options - Sync options (unused in placeholder implementation)
   * @returns AsyncGenerator that returns RailgunTransactionData
   * @yields EVMBlock - Block data with grouped/sorted transactions and logs
   */
  async * from (_options: SyncOptions): AsyncGenerator<T> {
    if (_options.liveSync) {
      throw new Error("Subsquid doesn't support liveSync")
    }

    const pageIterator = autoPaginateBlockQuery<EVMBlock>(this.#client, _options.startHeight, _options.endHeight)
    for await (const page of pageIterator) {
      for (const entry of page) {
        yield entry as T
      }
    }
  }

  /**
   * Destroy the Subsquid connection
   */
  destroy () {
  }
}
