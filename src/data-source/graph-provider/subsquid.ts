import EventEmitter from 'node:events'

import type { SubsquidClient } from '@railgun-reloaded/subsquid-client'

import type { NetworkName } from '../../globals'

import {
  autoPaginateQuery, getClientForNetwork, getCurrentBlockheight, getFullSyncQuery,
  getTotalCounts,
  //  paginateQuery
} from './graph-queries'

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
   * Given a subsquid table name, it returns the eventName
   * @param name - subsquid table name
   * @returns  Railgun Event name
   */
  getEventName (name: string) {
    switch (name) {
      case 'LegacyGeneratedCommitment':
        return 'GeneratedCommitmentBatch'
      case 'LegacyEncryptedCommitment':
        return 'CommitmentBatch'
      case 'nullifiers':
        return 'Nullifiers'
      case 'TransactCommitment':
        return 'Transact'
      case 'ShieldCommitment':
        return 'Shield'
      case 'unshields':
        return 'Unshield'

      default:
        console.log(name)
        throw new Error('Unhandeld event name')
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

    let hasNextPage = true
    const fullSyncQuery = getFullSyncQuery(Number(startBlock.toString()), 10_000)

    const constCommitments: Set<string> = new Set()
    while (hasNextPage && this.syncing) {
      // TODO: make this iterate outwards from this function, autoPaginate should keep track of this.syncing
      const { allResults: events } = await autoPaginateQuery(this.network, fullSyncQuery, this)

      // console.log('events', Object.keys(events))
      const filteredKeys = ['commitments', 'nullifiers', 'unshields']
      // TODO: honestly this current arrangement of data is kind of perfect, might be ideal to serailize rpc data into this 'finalized' format.

      const recordCounts: Record< string, Set<number>> = {}
      for (const key of Object.keys(events)) {
        recordCounts[key] = new Set()
      }

      // NEED TO DEDUPE EVENTS HERE.
      const dedupedEvents: Record<string, any[]> = {}
      // setup keys
      for (const key of Object.keys(events)) {
        dedupedEvents[key] = []
      }
      for (const key in events) {
        // @ts-ignore
        for (const e of events[key]) {
          // @ts-ignore
          if (!recordCounts[key].has(e.id)) {
            // @ts-ignore
            recordCounts[key].add(e.id)
            // @ts-ignore
            dedupedEvents[key].push(e)
          }
        }
      }
      // let checkTotal = 0
      for (const key in dedupedEvents) {
        if (key === 'commitments') {
          // @ts-ignore
          for (const transaction of dedupedEvents[key]) {
            const parsed = '0x' + BigInt(transaction.hash).toString(16).padStart(64, '0')
            constCommitments.add(parsed)
          }
        }

        // @ts-ignore
        // console.log('DEDUPED', key, 'events', dedupedEvents[key].length)
      }

      await getTotalCounts(this.network, this.provider)
      // loop through the set of const, and determine which are not in the seenCommitments
      // @ts-ignore
      // console.log('TRANSACT:transactions', 'orig: ', events['transactions'].length)

      // compare them
      const consolidatedEvents: T[] = []
      for (const key of filteredKeys) {
        const event = dedupedEvents[key]
        // @ts-ignore TODO: Fix this
        for (const k of event) {
          k.name = k.commitmentType ?? key
          const parsed = k.id.slice(2)
          k.treeNumber = parseInt(BigInt('0x' + parsed.slice(0, 64)).toString())
          k.startPosition = parseInt(BigInt('0x' + parsed.slice(64)).toString())
          consolidatedEvents.push(k)
        }
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
          return aTransactionIndex - bTransactionIndex
        }

        return a.blockNumber - b.blockNumber
      })
      const formattedEvents = sortedEvents.map((event: any) => {
        // console.log('event', event)
        return {
          name: this.getEventName(event.name),
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

export { SubsquidProvider }
