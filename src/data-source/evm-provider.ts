import type { DataSource } from './datasource'
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
   *  Creates an instance of the EVMProvider class.
   */
  constructor () {
    // TODO: load up events from storage?

    this.syncing = false
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
   */
  // TODO: fix return type, remove undefined

  async read (height:bigint) {
    const thisref = this
    return async function * () {
      // TODO:
      yield thisref.events[parseInt(height.toString())]
    }
  }
}

// data iterator.

export { EVMProvider }
