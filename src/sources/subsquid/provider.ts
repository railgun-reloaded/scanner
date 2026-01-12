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
    /**
     * Check if input is number or not
     * Casting string to number gives NaN
     * @param v - Input to the function
     * @returns - true is the input is number
     */
    // const isNumberString = (v: any) => typeof v === 'string' && /^[+-]?\d+$/.test(v.trim())

    /**
     * Convert subsquid data to standard format
     * @param input - Subsquid representation of BlockData
     * @returns Standard representation of EVMBlockData
     */
    /*
    const formatResult = (input : SubsquidEvmBlock) : EVMBlock => {
      return {
        number: BigInt(input.number),
        hash: input.hash,
        timestamp: BigInt(input.timestamp),
        transactions: input.transactions.map(tx => ({
          index: Number(tx.index),
          hash: tx.hash,
          from: tx.from,
          logs: tx.logs.map((log) => (
            {
              index: Number(log.index),
              name: log.name,
              address: log.address,
              args: {
                // Handle the parsing of bigint string to bigint
                ...JSON.parse(log.args as unknown as string, (_, v) => isNumberString(v) ? BigInt(v) : v)
              }
            }
          ))
        })),
        internalTransaction: []
      }
    }
    */
  }

  /**
   * Destroy the Subsquid connection
   */
  destroy () {
  }
}
