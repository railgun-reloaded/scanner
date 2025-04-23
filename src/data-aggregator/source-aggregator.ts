import type { DataSource } from '../data-source'
import type { Data } from '../data-source/types'
// import { readFile } from '../data-store'
import { SnapshotDB, serializeBigInt } from '../data-store/database'
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
  readonly storage: string = './store.rgblock'
  /**
   * - The list of aggregated data sources.
   *  // TODO: add more explanation here.
   */
  // TODO: make RPCData more robust, transform it into something like ChainData?
  private sources: DataSource<T>[] = []

  /**
   * - The database used for storing snapshots.
   */
  private db: any

  /**
   * TODO: constructor
   * @param sources - The sources to aggregate.
   */
  constructor (sources: DataSource<T>[]) {
    this.sources = sources
    this.db = new SnapshotDB()
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
    console.time('restoreGzip')
    await this.db.restoreGzip(this.storage)
    console.timeEnd('restoreGzip')
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
    const block = await this.db.get('events')
    const events = []
    let startBlock = BigInt(RailgunProxyDeploymentBlock[NetworkName.Ethereum] - 100_000)
    if (block) {
      console.log('block', block.events.length)
      // console.log('DataStorageFound')//
      // we have found storage. lets load it.
      const { blockHeight, events: storedEvents } = block
      console.log('SyncingFrom', blockHeight, 'total events:', storedEvents.length)
      // const val = 0n
      storedEvents.forEach((event: any) => {
        // serialize the event back to expected format.
        // if event.args has treeNumber and startPosition
        const { args } = event.event
        const { startPosition, treeNumber } = args
        if (typeof treeNumber !== 'undefined' && typeof startPosition !== 'undefined') {
          // console.log('TreeNumber', treeNumber, 'StartPosition', startPosition)
          const serialized = {
            ...event,
            event: {
              ...event.event,
              args: {
                ...args,
                treeNumber: BigInt(treeNumber),
                startPosition: BigInt(startPosition)
              }
            }
          }
          events.push(serialized)
        } else {
          events.push(event)
        }
      })
      startBlock = BigInt(storedEvents.at(-1).event.blockNumber) + 1n
      console.log('StartBlock', startBlock)
    }

    // get latest block number.

    for (const source of this.sources) {
      console.log('latest block', source.head)
      for await (const event of source.from({
        startBlock,
        endBlock: 'latest' // TODO: get latest block number from source.
      })) {
        if (event) {
          events.push(event)
        }
      }
    }
    // sort events by fragment name
    const sortedObj = {} as Record<string, any[]>

    const chronologicalEvents = events.sort((ae: any, be: any) => {
      const a = ae.event
      const b = be.event
      if (a.blockNumber === b.blockNumber) {
        if (a.transactionIndex === b.transactionIndex) {
          return b.logIndex - a.logIndex
        }

        return b.transactionIndex - a.transactionIndex
      }

      return b.blockNumber - a.blockNumber
    })
    chronologicalEvents.reverse()
    // loop through and check startPositions.
    let expectedPosition = 0
    for (const e of chronologicalEvents) {
      const { event } = e
      const { args } = event
      const { startPosition, treeNumber } = args
      if (typeof startPosition !== 'undefined') {
        const startPos = parseInt(startPosition.toString())
        const treeNum = parseInt(treeNumber.toString())
        const normalized = (treeNum * (2 ** 16)) + startPos
        if (normalized === expectedPosition) {
          if ('commitments' in args) {
            expectedPosition += args['commitments'].length
          } else if ('hash' in args) {
            expectedPosition += args['hash'].length
          }
        }
      }
    }
    console.log('EXPECTED POSITION', expectedPosition)
    for (const event of chronologicalEvents) {
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

    const totalCheck = chronologicalEvents.reduce((acc, event) => {
      const { args } = event.event
      // serialize the obj based off the fragment so we have a labled object output
      if (typeof args['startPosition'] !== 'undefined') {
        if ('commitments' in args) {
          return acc + args['commitments'].length
        } else if ('hash' in args) {
          return acc + args['hash'].length
        }
      }
      return acc
    }, 0)
    console.log('TotalCheck', totalCheck)
    console.log('leaves', expectedPosition)
    console.log('SAVING EVENTS', chronologicalEvents.length)
    await this.db.set('events', { blockHeight: '0x' + events[events.length - 1]?.blockHeight.toString(16), events: chronologicalEvents.map(serializeBigInt) })
    await this.db.snapshotGzip(this.storage)
  }
}
export { SourceAggregator }
