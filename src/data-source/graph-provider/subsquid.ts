import EventEmitter from 'node:events'

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
   * constructor for SubsquidProvider
   */
  constructor () {
    super()
    this.setupListeners()
  }

  /**
   *  Start iterating from a given height.
   */
  private async setupListeners () {
  }

  /**
   *  Get the provider
   */
  getProvider () {
  }

  /**
   * Await initialization of the provider.
   */
  async awaitInitialized () {
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
  //  * @yields T - The data read from the source
   */
  async * from (options:{ startBlock: bigint, endBlock: bigint }) {
    // const { startBlock, endBlock } = options
    // this.startBlock = BigInt(startBlock)
    // this.lastScannedBlock = BigInt(endBlock)
    // Logic to iterate from a given height
    // const TOTAL_BLOCKS = BigInt(endBlock) - BigInt(startBlock)
  }

  /**
   * Destroy the provider
   * @returns - A promise that resolves when the provider is destroyed
   */
  async destroy () {
    // Logic to destroy the provider and iterators
    console.log('SubsquidProvider: Destroying provider')
  }
}

export { SubsquidProvider, RAILGUN_SCAN_START_BLOCK, RAILGUN_SCAN_START_BLOCK_V2 }
