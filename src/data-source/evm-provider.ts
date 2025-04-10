import type { ContractEventPayload } from 'ethers'

import type { DataSource } from './datasource'
import type { EthersProvider } from './evm-provider/providers/ethers'
import type { Event, RPCData } from './types'

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
  events: Event[] = []
  /**
   *  Is the source still ingesting data?
   */
  syncing: boolean
  /**
   * Provides the most recent updates from its source.
   */
  provider: EthersProvider<ContractEventPayload>

  // TODO: alter provider to be more ROBUST
  /**
   * Creates an instance of the EVMProvider class.
   * @param provider - The provider to use for connecting to the EVM-compatible blockchain.
   */
  constructor (provider: EthersProvider<ContractEventPayload>) {
    // TODO: load up events from storage?

    this.syncing = false
    this.provider = provider
    // BE SURE TO CALL THIS PRIOR TO USING THE PROVIDER
    // HERE NOW TO GET IT WORKING
    this.initialize()
  }

  /**
   * Initializes the provider and prepares it for use.
   */
  async initialize (): Promise<void> {
    await this.provider.awaitInitialized()
  }

  /**
   * Start iterating from a given height.
   * @returns bigint - The block height to start iterating from.
   */
  get head (): bigint {
    if (this.events.length > 0) {
      const event = this.events[this.events.length - 1]
      if (event) {
        return event.blockHeight
      }
    }
    // none found.
    return BigInt(0)
  }

  /**
   * Destroys the source and cleans up resources.
   * @param error - An optional error to throw from all active iterators.
   */
  destroy (error?: Error): void {
    this.events = []
    this.syncing = false
    if (error) {
      throw error
    }
  }

  /**
   * TODO:
   * @param height TODO:
   * @returns Promise<AsyncGenerator<Event[] | undefined>>
   * @yields Event[] | undefined
   */
  // TODO: fix return type, remove undefined

  async * read (height:bigint): AsyncGenerator<Event | undefined> {
    console.log('HEIGHT', height)
    while (true) {
      for await (const event of this.provider) {
        const { blockNumber } = event.log

        const output = {
          blockHeight: BigInt(blockNumber),
          event
        }
        yield output
      }
    }
  }
}

// data iterator.

export { EVMProvider }
