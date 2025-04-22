import type { DataSource } from '../data-source'
import type { Data } from '../data-source/types'
import { readFile } from '../data-store'
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
    const block = readFile<{ blockHeight: bigint; events: any[] }>(this.storage)
    const events = []
    let startBlock = BigInt(RailgunProxyDeploymentBlock[NetworkName.Ethereum] - 100_000)
    if (block) {
      // console.log('DataStorageFound')//
      // we have found storage. lets load it.
      const { blockHeight, events: storedEvents } = block
      console.log('SyncingFrom', blockHeight, 'total events:', storedEvents.length)
      // const val = 0n
      const lastBlockEvent =
      storedEvents?.find((event) => {
        // console.log('LastBlockEvent', event)
        if (event != null) {
          return true
          // val = BigInt(event.event.blockNumber)
          // lastBlockEvent = now.blockNumber
          // console.log(now)
        }
        return false
        // return val
      })
      // events.push(...storedEvents)
      // console.log('StartBlock', lastBlockEvent)
      startBlock = BigInt(lastBlockEvent.event.blockNumber) + 1n
    } else {
      // console.log('Creating DataBank')

      // scan events from all sources.
      // get startBlock from here
      // pull latest block from datastore.

    }
    // get latest block number.

    for (const source of this.sources) {
      console.log('latest block', source.head)
      for await (const event of source.from({
        startBlock,
        endBlock: source.head // TODO: get latest block number from source.
      })) {
        if (event) {
          events.push(event)
        }
      }
      // console.log('FlatEvents', total)
      // console.log('FoundEvents', events.length)
    }
    // const flat = events.flatMap((event) => {
    //   // console.log('FlatEvent', event)
    //   // console.log('args', event.event.args)
    //   // console.log('Event', event.event?.args?.length > 0)

    //   return event.event
    // })
    // console.log('FlatEvents', flat.length)
    // sort events by fragment name
    const sortedObj = {} as Record<string, any[]>
    for (const event of events) {
      // console.log('event', event)
      // @ts-ignore
      if (event?.event?.name) {
      // @ts-ignore - reformatted slightly

        const name = event.event.name
        if (!sortedObj[name]) {
          sortedObj[name] = []
        }
        sortedObj[name].push(event)
      } else {
        console.log('Event', event)
      }
    }
    // console.log('SortedEvents', sortedObj)
    console.log('SortedEvents', Object.keys(sortedObj))
    for (const key in sortedObj) {
      console.log('SortedEvents', key, sortedObj?.[key]?.length)
    }
    // find out how many commitment leaves there are in utxo tree

    // shield generatedCommitmentBatch .commitments.length
    console.log('ShieldEvents', sortedObj['GeneratedCommitmentBatch']?.at(0))
    const shields = [...(sortedObj['GeneratedCommitmentBatch'] ?? []), ...(sortedObj['Shield'] ?? [])]

    // console.log('lastShieldEvent', shields.at(-1))
    console.log(events.at(-1))
    const shieldCount = shields.reduce((acc, event) => {
      const { args } = event.event
      // serialize the obj based off the fragment so we have a labled object output
      if (args) {
        if (args && args.commitments) {
          return acc + args.commitments.length
        } else { console.log('NoCommitments', args) }
      }
      return acc
    }, 0) ?? 0

    const transacts = [...(sortedObj['CommitmentBatch'] ?? []), ...(sortedObj['Transact'] ?? []),]
    const transactCount = transacts.reduce((acc, event) => {
      const { args } = event.event
      // console.log('args', args)
      return acc + (args?.hash?.length ?? 0)
    }, 0) ?? 0
    console.log('leaves', shieldCount + transactCount)
    // console.log('SortedEvents', sortedObj['Transfer'])
    console.log('SAVING EVENTS', events.length)
    // saveFile(this.storage, { blockHeight: events[events.length - 1]?.blockHeight, events })
  }
}
export { SourceAggregator }
