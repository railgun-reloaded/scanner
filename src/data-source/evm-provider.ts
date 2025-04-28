// import type { ContractEventPayload } from 'ethers'

import type { DataSource } from './datasource'
import type { EthersProvider } from './evm-provider/providers/ethers'
import type { ViemProvider } from './evm-provider/providers/viem'
import type { Event, RPCData } from './types'
// TODO: properly type this out for the 'formatted event' type that both providers exude.
// TODO: make sure both providers 'watching' events format the same way.
type EVMProviders = EthersProvider<any> | ViemProvider<any>

// TODO: make source provide 'chunk size' default it low like 500 events...
// most providers allow alot but, some dont....
/**
 * Provides an interface for interacting with Ethereum Virtual Machine (EVM) compatible blockchain networks.
 * This class handles the connection, communication, and data retrieval from EVM-based blockchains.
 * @description A provider implementation for connecting to and querying EVM-compatible blockchain networks
 * @example
 * ```typescript
 * const provider = new EVMProvider(networkName);
 * ```
 */
class EVMProvider implements DataSource<RPCData> {
  /**
   * The most recent blockHeight that this source can provide.
   */
  blockHeight: bigint = BigInt(0)
  /**
   * The most recent events that this source can provide.
   */
  events: Event[] = []

  /**
   * The most recent received events from the provider source.
   */
  unsortedEvents: Event[] = []

  /**
   * The current most complete chronological order of events seen by this data source.
   */
  masterEvents: Event[] = []
  /**
   *  Is the source still ingesting data?
   */
  syncing: boolean
  /**
   * Provides the most recent updates from its source.
   */
  provider: EVMProviders

  // TODO: alter provider to be more ROBUST
  /**
   * Creates an instance of the EVMProvider class.
   * @param provider - The provider to use for connecting to the EVM-compatible blockchain.
   */
  constructor (provider: EVMProviders) {
    // TODO: load up events from storage?

    this.syncing = false
    this.provider = provider
    // BE SURE TO CALL THIS PRIOR TO USING THE PROVIDER
    // HERE NOW TO GET IT WORKING
    // aggregator will call this function upon source map initilization.
    // this.initialize()
  }

  /**
   * Initializes the provider and prepares it for use.
   */
  async initialize (): Promise<void> {
    this.setupListeners()
    await this.provider.awaitInitialized()
  }

  /**
   * Sets up listeners for the provider to handle new blocks and errors.
   */
  setupListeners (): void {
    this.provider.on('newHead', (blockNumber) => {
      this.syncing = true
      this.blockHeight = BigInt(blockNumber)
      // console.log('New block:', block)
      // this.events.push({ blockHeight: BigInt(blockNumber), event: undefined })
    })

    this.provider.on('error', (error) => {
      this.destroy(error)
    })

    this.provider.on('close', () => {
      this.destroy()
    })

    this.provider.on('event', (event) => {
      this.unsortedEvents.push(event)
      // console.log('weve got an event', event)
    })
  }

  /**
   * Start iterating from a given height.
   * @returns bigint - The block height to start iterating from.
   */
  get head (): bigint {
    return this.blockHeight
    // if (this.events.length > 0) {
    //   const event = this.events[this.events.length - 1]
    //   if (event) {
    //     return event.blockHeight
    //   }
    // }
    // // none found.
    // return BigInt(0)
  }

  /**
   * Destroys the source and cleans up resources.
   * @param error - An optional error to throw from all active iterators.
   */
  async destroy (error?: Error): Promise<void> {
    this.events = []
    this.syncing = false
    console.log('EVMProvider: Destroying provider')
    await this.provider.destroy()
    // @ts-ignore -- no need to require optional.
    delete this.provider
    // TODO: remove this or put it to use.
    if (error) {
      throw error
    }
  }

  /**
   * TODO:
   * @param height - The block height to start accepting events from.
   * @returns Promise<AsyncGenerator<Event[] | undefined>>
   * @yields Event[] | undefined
   */
  // TODO: fix return type, remove undefined

  async * read (height?:bigint): AsyncGenerator<Event | undefined> {
    // console.log('HEIGHT', height)
    // these essentially should get added in order from the provider.
    // TODO: check to see if another 'sorting' needs to take place

    // TODO: decide if we manage the new events here, or in the provider...
    //  first we sort through any events we have gathered here?
    while (true) {
      for await (const event of this.provider) {
        // console.log('event', event)
        const { blockNumber } = event
        if (height && blockNumber < height) {
          continue
        }
        const output = {
          blockHeight: BigInt(blockNumber),
          event
        }
        this.events.push(output)
        yield output
      }
      if (!this.syncing) { break }
    }
  }

  // TODO: from function
  /**
   * Start iterating from a given height.
   * @param options - Options for the iterator
   * @param options.startBlock  - The block number to start from
   * @param options.endBlock  - The block number to end at
   * @returns - An async generator that yields events
   * @yields T - The data read from the source
   */
  async * from (options: { startBlock: bigint, endBlock: bigint | 'latest' }): AsyncGenerator<RPCData | undefined> {
    const { startBlock, endBlock } = options
    this.syncing = true
    // TODO:  latest blockcalculation
    const endBlockNumber = endBlock === 'latest' ? this.blockHeight : endBlock
    for await (const event of this.provider.from({ startBlock, endBlock: endBlockNumber })) {
      const target = event[event.length - 1]
      if (typeof target !== 'undefined') {
        if ('blockNumber' in target) {
          // console.log('setting blockheight', target.blockNumber)
          this.blockHeight = BigInt(target.blockNumber)
        }
      }
      // Use the resolved endBlockNumber instead of endBlock which could be 'latest'
      const blockHeight = endBlockNumber
      //
      for (const e of event) {
        this.blockHeight = BigInt(e.blockNumber)
        // console.log('event')
        // @ts-ignore TODO: Fix this
        yield { blockHeight, event: e }
      }
    }
    // this will effectively kill the read iterator above
    // this.syncing = false
  }
}

// data iterator.

export { EVMProvider }
