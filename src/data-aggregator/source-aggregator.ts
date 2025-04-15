import type { DataSource } from '../data-source'
import type { Data } from '../data-source/types'
import { readFile, saveFile } from '../data-store'
import { NetworkName, RailgunProxyDeploymentBlock } from '../globals'

// aggregates multiple data sources into a single complete source of railgun history.

// requires a list of data sources to aggregate,
// snapshot
// subsquid - quick event scanning; only 'live' source of txid data.
// rpc - live source of event data.

/**
 *
 * data aggregator is not responsible for verifying data completeness,
 * its purpose is to scan for events, and store them for consumption.
 *
 *
 * startup procedure.
 * - load up events from snapshot if attached
 *    - (data here takes precedence and is trusted, we 'scan latter sources from the final point here')
 *    - 2 types of snapshot, RG-sourced-snapshot, and an additional local snapshot generated to keep the local cache
 *    - trusted.
 * - load up events from subsquid if attached, (gather txid separately)
 * - load up events from RPC if attached
 */

/**
 * Aggregates multiple data sources into a single complete source of railgun history.
 */
class SourceAggregator<T extends Data> {
  /**
   * - where to store the raw data chunk.
   */
  readonly storage: string = 'store.rgblock'
  /**
   * - The list of aggregated data sources.
   *  // TODO: add more explanation here.
   */
  // TODO: make RPCData more robust, transform it into something like ChainData?
  private sources: DataSource<T>[] = []

  /**
   * TODO: constructor
   * @param sources - The sources to aggregate.
   */
  constructor (sources: DataSource<T>[]) {
    this.sources = sources
  }

  /**
   * Adds a new source to the aggregator.
   */
  async initialize () {
    for (const source of this.sources) {
      // check valid sources
      if (source === undefined) {
        throw new Error('Invalid source')
      }
      await source.initialize()
    }
  }

  /**
   * Reads data from all sources.
   * @param height - The block height to start reading from.
   * @returns An async generator that yields data from all sources.
   */
  async read (height: bigint): Promise<AsyncGenerator<T | undefined>> {
    const self = this
    /**
     * Generator function that reads data from all sources.
     *  @returns An async generator that yields data from all sources.
     *  @yields T | undefined
     */
    async function * generator () {
      for (const source of self.sources) {
        yield * source.read(height)
      }
    }
    return generator()
  }

  /**
   * Destroys all sources and cleans up resources.
   * @param error - An optional error to throw from all active iterators.
   */
  destroy (error?: Error): void {
    for (const source of this.sources) {
      source.destroy(error)
    }
  }

  /**
   * Function to full sync railgun data from a source
   */
  async sync () {
    // check localCache, if none make it.
    const block = readFile(this.storage)
    const events = []
    const startBlock = BigInt(RailgunProxyDeploymentBlock[NetworkName.Ethereum])
    if (block) {
      // console.log('DataStorageFound')
    } else {
      // console.log('Creating DataBank')

      // scan events from all sources.
      // get startBlock from here
      // pull latest block from datastore.
    }
    for (const source of this.sources) {
      for await (const event of source.from({
        startBlock,
        endBlock: 22271555n,
      })) {
        if (event) {
          console.log('FoundEvent', event?.event?.eventName)
          events.push(event)
        }
        saveFile(this.storage, { events })
      }
    }
  }
}
export { SourceAggregator }
