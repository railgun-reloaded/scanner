import type { DataSource } from '../data-source'
import type { Data } from '../data-source/types'

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
  initialize () {
    for (const source of this.sources) {
      // check valid sources
      if (source === undefined) {
        throw new Error('Invalid source')
      }
    }
  }
}

export { SourceAggregator }
