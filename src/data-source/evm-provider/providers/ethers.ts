import EventEmitter from 'node:events'

import { Contract, JsonRpcProvider, Network, WebSocketProvider } from 'ethers'

import type { NetworkName } from '../../../globals'
import { getAbiForNetworkBlockRange } from '../../../utils'
import { delay, promiseTimeout } from '../../utils'

const SCAN_CHUNKS = 500_000n
const EVENTS_SCAN_TIMEOUT = 2000
const SCAN_TIMEOUT_ERROR_MESSAGE = 'getLogs request timed out after 5 seconds.'
const RAILGUN_SCAN_START_BLOCK = 14693000n
const RAILGUN_SCAN_START_BLOCK_V2 = 16076000n

/**
 *   EthersProvider
 */
class EthersProvider<T = any> extends EventEmitter implements AsyncIterable<T> {
  /**
   *  provider URL
   */
  url: string
  /**
   * last scanned block
   */
  lastScannedBlock: bigint
  /**
   * syncing status
   */
  syncing: boolean
  /**
   * start block
   */
  startBlock: bigint
  /**
   * provider
   */
  private provider: WebSocketProvider | JsonRpcProvider
  /**
   *  contract
   */
  contract: Contract
  /**
   * event queue
   */
  private eventQueue: T[] = []

  /**
   *  initialized status
   */
  initialized: boolean

  /**
   * initialized promise
   */
  initializedPromise: any

  /**
   * initialized result
   */
  initializedResolve: any

  /**
   * contract address
   */
  address: string

  /**
   * network name
   */
  network: NetworkName

  /**
   * constructor for EthersProvider
   * @param networkName - The network name
   * @param url - The provider URL
   * @param address - The contract address
   * @param abi - The contract ABI
   * @param options - Options for the provider
   * @param options.ws - Whether to use WebSocket or not
   * @param options.chainId - The chain ID
   */
  constructor (networkName: NetworkName, url: string, address: string, abi: any, options: { chainId: number, ws?: boolean /* add in more options later */ }) {
    super()
    // Initialization code if needed
    this.url = url
    this.lastScannedBlock = BigInt(0)
    this.syncing = false
    this.startBlock = BigInt(0)
    this.network = networkName
    const network = Network.from(options.chainId)
    this.provider = options.ws
      ? new WebSocketProvider(url)
      : new JsonRpcProvider(url, network, {
        polling: true,
        staticNetwork: network,
        batchMaxCount: 2,
      })
      // TODO: separate this out, pollingContract & scanningContract
      // TODO: create latestEvents[] and syncedEvents[]
    this.address = address
    this.contract = new Contract(address, abi, this.provider)
    this.initialized = false
    this.initializedPromise = new Promise((resolve) => {
      this.initializedResolve = resolve
      this.setupListeners()
    })
  }

  /**
   *  Start iterating from a given height.
   */
  private async setupListeners () {
    await this.provider.removeAllListeners()
    await this.contract.removeAllListeners()
    // Logic to set up listeners for the provider
    // this.provider.on('pending', (tx) => {
    //   // TODO: Handle pending transaction event
    //   console.log('Pending transaction:', tx)
    // })

    this.provider.on('block', (blockNumber) => {
      // TODO: Handle block event
      // console.log('New block:', blockNumber)
      this.emit('newHead', blockNumber)
    })

    this.provider.on('error', (error) => {
      // TODO: Handle error event
      console.error('Error:', error)
    })

    this.contract.on('*', (event: T) => {
      // TODO: Handle contract event - properly
      // console.log('Contract event:', event)
      this.eventQueue.push(event)
      // these events go into latestEvents[]
    })
    this.initialized = true
    this.syncing = true
    this.initializedResolve()
    // handle railgun
  }

  /**
   *  Get the provider
   *  @returns - The provider instance
   */
  getProvider () {
    // Logic to get the provider
    return this.provider
  }

  /**
   * Await initialization of the provider.
   */
  async awaitInitialized () {
    if (!this.initialized) {
      await this.initializedPromise
    }
  }

  /**
   * Start iterating events.
   * @returns - An async generator that yields events
   * @throws - Error if the source is not a ReadableStream or an AsyncIterable
   * @yields T - The data read from the source
   */
  async * [Symbol.asyncIterator] (): AsyncGenerator<T> {
    while (true) {
      if (this.eventQueue.length > 0) {
        yield this.eventQueue.shift() as T
      } else {
        // TODO: return undefined ONLY FOR TESTING
        if (this.syncing) {
          await new Promise(resolve => setTimeout(resolve, 1000)) // Wait for 1 second before checking again
        } else { return }
      }
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
    const { startBlock, endBlock } = options
    this.startBlock = BigInt(startBlock)
    // this.lastScannedBlock = BigInt(endBlock)
    // Logic to iterate from a given height
    // const TOTAL_BLOCKS = BigInt(endBlock) - BigInt(startBlock)
    let currentOffset = startBlock
    while (true) {
      if (currentOffset >= endBlock) {
        break
      }
      const startChunk = currentOffset
      const start = startChunk
      const end = startChunk + SCAN_CHUNKS
      const abi = getAbiForNetworkBlockRange(this.network, start, end)
      // console.log(abi.length)
      for (const abib of abi) {
        const contract = new Contract(this.address, abib, this.provider)
        // console.log('Contract:')
        // console.log('Scanning from', startChunk, 'to', startChunk + SCAN_CHUNKS)
        const events = await promiseTimeout(
          contract.queryFilter('*', start, end),
          EVENTS_SCAN_TIMEOUT,
          SCAN_TIMEOUT_ERROR_MESSAGE
        ).catch((_err) => {
          // console.log('Error in queryFilter:', err.message)
          return []
        })
        yield events
        // for (const event of events) {
        //   yield event
        // }
        // these get pushed into syncedEvents[]
        currentOffset += SCAN_CHUNKS + 1n
        this.lastScannedBlock = currentOffset - 1n// scan is inclusive
        // if (currentOffset > endBlock) {
        //   currentOffset = endBlock
        // }
        await delay(250) // Delay to avoid rate limiting, can avoid this with forking...
      }
    }
  }

  /**
   * Destroy the provider
   * @returns - A promise that resolves when the provider is destroyed
   */
  async destroy () {
    // Logic to destroy the provider and iterators
    this.syncing = false
    if (this.provider instanceof WebSocketProvider) {
      await this.provider.destroy()
    } else {
      await this.provider.removeAllListeners()
      this.provider.destroy()
    }
  }
}

export { EthersProvider, RAILGUN_SCAN_START_BLOCK, RAILGUN_SCAN_START_BLOCK_V2 }
