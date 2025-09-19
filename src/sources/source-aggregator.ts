import type { EVMBlock } from '../models'

import type { DataSource } from './data-source'

/**
 * Create an aggregates sources from multiple data source like RPCProvider,
 * GraphProvider.
 * Aggregates multiple data sources into single complete source of railgun events
 */
class SourceAggregator<T extends EVMBlock> {
  /**
   * List of data sources
   */
  #sources: DataSource<T>[] = []

  /**
   * Initialize the aggregated source list of data source
   * @param sources - Sources to aggregate
   */
  constructor (sources: DataSource<T>[]) {
    this.#sources = sources
  }

  /**
   * Read data from all the sources
   * @param options - Options to sync data
   * @param options.startHeight - Start height
   * @param options.endHeight - End height
   * @param options.chunkSize - Chunk size for eth_getLogs
   * @returns AsyncGenerator that returns EVMBlock
   * @yields T
   */
  async * from (options: { startHeight: bigint, endHeight?: bigint, chunkSize?: bigint }) : AsyncGenerator<T> {
    let { startHeight, endHeight, chunkSize } = options

    /**
     * Helper function to get minimum of two big ints
     * @param a - lhs
     * @param b - rhs
     * @returns - Return smallest of a and b
     */
    const minBigInt = (a: bigint, b: bigint) => a < b ? a : b

    for (const source of this.#sources) {
      const sourceHead = await source.head()
      // We need to set the endHeight for the provider if it is not a live provider
      // We set the endHeight to the minimum of head of the source and provided endHeight
      let sourceEnd
      if (endHeight) {
        sourceEnd = minBigInt(sourceHead, endHeight)
      } else {
        if (!source.isLiveProvider) {
          sourceEnd = sourceHead
        }
      }

      // Check if the source is upto date and discard it
      if (sourceEnd && startHeight > sourceEnd) {
        console.log('Skipping source, source is not upto date')
        continue
      }

      console.log('Syncing from:', source.constructor.name, ' Start', startHeight, ' End:', sourceEnd)

      // The head() value changes for subsquid as well as RPC when new block is indexed or mined,
      // so using it directly before or after syncing data may return an old or new block height
      // which leads to missing data or duplicate data
      // To prevent that, we query the block height before syncing and set endHeight to that height
      // for provider that doesn't use liveSync
      yield * source.from({
        startHeight,
        liveSync: !sourceEnd,
        endHeight: sourceEnd,
        chunkSize
      })
      // Shouldn't reach here in case of liveSync
      startHeight = sourceEnd ? sourceEnd + 1n : startHeight
    }
  }

  /**
   * Destroy all the sources
   */
  destroy () {
    for (const source of this.#sources) {
      source.destroy()
    }
  }
}

export { SourceAggregator }
