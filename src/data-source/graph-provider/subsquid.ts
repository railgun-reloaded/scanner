import EventEmitter from 'node:events'

import type { SubsquidClient } from '@railgun-reloaded/subsquid-client'

import type { NetworkName } from '../../globals'

import {
  autoPaginateQuery, getClientForNetwork, getCurrentBlockheight, getFullSyncQuery,
  //  paginateQuery
} from './graph-queries'

// import type { NetworkName } from '../../../src/globals'
// import { delay, getAbiForNetworkBlockRange, promiseTimeout } from '../../utils'

// const SCAN_CHUNKS = 50_000n // need to categorize this by provider, they each have their own limits. 500 is base low. we can attempt to just 'find it' but this can also incur 'ratelimits' that will effect the calculation 'guestimate' of this value.
// const EVENTS_SCAN_TIMEOUT = 20_000
// const SCAN_TIMEOUT_ERROR_MESSAGE = 'getLogs request timed out after 5 seconds.'
const RAILGUN_SCAN_START_BLOCK = 14693000n
const RAILGUN_SCAN_START_BLOCK_V2 = 16076000n

/**
 *   SubsquidProvider
 */
class SubsquidProvider<T = any> extends EventEmitter implements AsyncIterable<T> {
  /**
   *  The start block for the provider
   */
  network: NetworkName
  /**
   * The start block for the provider
   */
  provider: SubsquidClient

  /**
   * initialized promise
   */
  initializedPromise: any

  /**
   * initialized result
   */
  initializedResolve: any

  /**
   * The start block for the provider
   */
  syncing: boolean | undefined

  /**
   * constructor for SubsquidProvider
   * @param network - The network name
   */
  constructor (network: NetworkName) {
    super()
    this.network = network
    this.provider = getClientForNetwork(network)
    this.syncing = false
    this.initializedPromise = new Promise((resolve) => {
      this.initializedResolve = resolve
    })
    this.setupListeners()
  }

  /**
   *  Start iterating from a given height.
   */
  private async setupListeners () {
    await getCurrentBlockheight(this.network).then((blockHeight) => {
      this.emit('newHead', blockHeight)
      this.initializedResolve(blockHeight)
    })
  }

  /**
   *  Get the provider
   * @returns - The provider
   */
  getProvider () {
    return this.provider
  }

  /**
   * Await initialization of the provider.
   * @returns - A promise that resolves when the provider is initialized
   */
  async awaitInitialized () {
    return this.initializedPromise
  }

  /**
   * Start iterating events.
   * @returns - An async generator that yields events
   * @throws - Error if the source is not a ReadableStream or an AsyncIterable
  //  * @yields T - The data read from the source
   */
  async * [Symbol.asyncIterator] (): AsyncGenerator<T> {
    while (true) {
      // if (this.eventQueue.length > 0) {
      //   yield this.eventQueue.shift() as T
      // } else {
      //   // TODO: return undefined ONLY FOR TESTING
      //   if (this.syncing) {
      //     await new Promise(resolve => setTimeout(resolve, 1000)) // Wait for 1 second before checking again
      //   } else { return }
      // }
    }
  }

  /**
   *  Start iterating from a given height.
   * @param options - Options for the iterator
   * @param options.startBlock - The block number to start from
   * @param options.endBlock - The block number to end at
   * @returns - An async generator that yields events
   * @yields T - The data read from the source
   */
  async * from (options:{ startBlock: bigint, endBlock: bigint }) {
    const { startBlock } = options
    this.syncing = true
    // this.startBlock = BigInt(startBlock)
    // this.lastScannedBlock = BigInt(endBlock)
    // Logic to iterate from a given height
    // const TOTAL_BLOCKS = BigInt(endBlock) - BigInt(startBlock)
    // const BATCH_SIZE = 10_000
    // const BLOCKS_PER_ITERATION = BigInt(100_000)

    let hasNextPage = true
    // const currentPageBlock = startBlock
    // let currentPage = 0
    // let lastResults = null
    // const lastQuery = null
    const fullSyncQuery = getFullSyncQuery(Number(startBlock.toString()), 10_000)
    while (hasNextPage && this.syncing) {
      // TODO: make this iterate outwards from this function, autoPaginate should keep track of this.syncing
      const { allResults: events } = await autoPaginateQuery(this.network, fullSyncQuery, this)
      // Logic to fetch events from the provider
      // currentPageBlock = lastEventBlock
      // lastResults = events
      // need to sort through everything

      console.log('events', Object.keys(events))
      const filteredKeys = ['commitments', 'nullifiers', 'unshields']
      // @ts-ignore
      // TODO: honestly this current arrangement of data is kind of perfect, might be ideal to serailize rpc data into this 'finalized' format.
      for (const key in events) console.log(key, 'events', events[key].length)
      const consolidatedEvents: T[] = []
      for (const key of filteredKeys) {
        const event = events[key]
        // @ts-ignore TODO: Fix this
        for (const k of event) {
          k.name = k.commitmentType ?? key
          const parsed = k.id.slice(2)
          k.treeNumber = parseInt(BigInt('0x' + parsed.slice(0, 64)).toString())
          k.startPosition = parseInt(BigInt('0x' + parsed.slice(64)).toString())
          // if (typeof k.treePosition !== 'undefined') {
          //   k.startPosition = k.treePosition // k.batchStartTreePosition ?? 0n
          // }
          // if (typeof k.treeNumber !== 'undefined') {
          //   k.treeNumber = k.treeNumber ?? 0n
          // }
          consolidatedEvents.push(k)
        }
        // consolidatedEvents.push(...event)
      }
      const sortedEvents = consolidatedEvents.sort((ae: any, be: any) => {
        const a = ae
        const b = be

        const aTransactionIndex = parseInt(BigInt(a.startPosition).toString())
        const bTransactionIndex = parseInt(BigInt(b.startPosition).toString())
        if (a.blockNumber === b.blockNumber) {
          // if (aTransactionIndex === bTransactionIndex) {
          //   return b.logIndex - a.logIndex
          // }
          return bTransactionIndex - aTransactionIndex
        }

        return b.blockNumber - a.blockNumber
      })
      const formattedEvents = sortedEvents.map((event: any) => {
        // console.log('event', event)
        return {
          name: event.name,
          blockNumber: parseInt(event.blockNumber),
          transactionIndex: event.startPosition,
          transactionHash: event.transactionHash,
          logIndex: event.startPosition,
          args: { ...event }
        }
      })
      // @ts-ignore
      hasNextPage = events.length > 0
      yield formattedEvents
      // yield events
    }
    this.syncing = false
  }

  /**
   * Destroy the provider
   * @returns - A promise that resolves when the provider is destroyed
   */
  async destroy () {
    // Logic to destroy the provider and iterators
    console.log('SubsquidProvider: Destroying provider')
    this.syncing = false
    // @ts-expect-error // TODO: fix this typeshit
    delete this.provider
    console.log('SubsquidProvider: Destroyed provider')
  }
}

export { SubsquidProvider, RAILGUN_SCAN_START_BLOCK, RAILGUN_SCAN_START_BLOCK_V2 }
