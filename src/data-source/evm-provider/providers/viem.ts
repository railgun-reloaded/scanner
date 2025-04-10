import EventEmitter from 'node:events'

import type { HttpTransport, PublicClient, WebSocketTransport } from 'viem'
import { createPublicClient, getContract, http } from 'viem'
import { arbitrum, bsc, mainnet, polygon } from 'viem/chains'

import { delay, promiseTimeout } from '../../utils'

const SCAN_CHUNKS = 1000n
const EVENTS_SCAN_TIMEOUT = 5000
const SCAN_TIMEOUT_ERROR_MESSAGE = 'getLogs request timed out after 5 seconds.'
const RAILGUN_SCAN_START_BLOCK = 14693000n
const RAILGUN_SCAN_START_BLOCK_V2 = 16076000n

/**
 *   ViemProvider
 */
class ViemProvider<T = any> extends EventEmitter implements AsyncIterable<T> {
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
  private provider?: PublicClient
  /**
   *  contract
   */
  contract?
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
   * contract abi
   */
  abi: any

  /**
   * unwatch blocks
   */
  unwatchBlocks?: () => void
  /**
   * unwatch contract events
   */
  unwatchContractEvents?: () => void
  /**
   *  transport WebSocketTransport | HttpTransport<undefined, false>
   */
  transport?: WebSocketTransport | HttpTransport<undefined, false>
  /**
   * constructor for EthersProvider
   * @param url - The provider URL
   * @param address - The contract address
   * @param abi - The contract ABI
   * @param options - Options for the provider
   * @param options.ws - Whether to use WebSocket or not
   * @param options.chainId - The chain ID
   * @param options.transportConfig - The transport config for the provider
   */
  constructor (url: string, address: `0x${string}`, abi: any, options: { chainId: number, ws?: boolean, transportConfig?: any /* add in more options later */ }) {
    super()
    // Initialization code if needed
    this.url = url
    this.abi = abi
    this.lastScannedBlock = BigInt(0)
    this.syncing = false
    this.startBlock = BigInt(0)
    const network = this.chainIdToNetwork(options.chainId)
    // TODO: wss seems to not close out properly, leaving node process hanging.
    // this.transport = options.ws ? webSocket(url, options.transportConfig) : http(url)

    this.provider = createPublicClient({
      transport: http(url),
      chain: network,
    })
    this.contract = getContract({
      address,
      abi,
      client: this.provider,
    })
    this.initialized = false
    this.initializedPromise = new Promise((resolve) => {
      this.initializedResolve = resolve
      this.setupListeners()
    })
  }

  /**
   * Get the chain ID from the provider
   * @param chainId - The chain ID
   * @returns - The network object
   */
  chainIdToNetwork (chainId: number) {
    switch (chainId) {
      case 1:
        return mainnet
      case 5:
        return arbitrum
      case 56:
        return bsc
      case 137:
        return polygon
      default:
        throw new Error(`Unsupported chain ID: ${chainId}`)
    }
  }

  /**
   *  Start iterating from a given height.
   */
  private async setupListeners () {
    // Logic to set up listeners for the provider
    // this.provider.on('pending', (tx) => {
    //   // TODO: Handle pending transaction event
    //   console.log('Pending transaction:', tx)
    // })
    if (!this.provider) {
      throw new Error('Provider is not initialized')
    }

    // returns a destroy function
    this.unwatchBlocks = this.provider.watchBlocks({

      /**
       * Called when a new block is mined.
       * @param block - The block object
       */
      onBlock: (block) => {
        this.emit('newHead', block)
      }
    })

    this.unwatchContractEvents = this.provider.watchContractEvent({
      address: this.contract!.address,
      abi: this.abi,
      /**
       *  Called when a new block is mined.
       * @param logs - The logs from the new block
       */
      onLogs: (logs) => {
        this.eventQueue.push(logs as unknown as T)
        this.emit('event', logs)
      }
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
      if (!this.provider) {
        throw new Error('Provider is not initialized')
      }
      const events = await promiseTimeout(
        this.provider.getContractEvents({
          address: this.contract!.address,
          abi: this.abi,
          fromBlock: startChunk,
          toBlock: startChunk + SCAN_CHUNKS,
        }),
        EVENTS_SCAN_TIMEOUT,
        SCAN_TIMEOUT_ERROR_MESSAGE
      )
      yield events
      currentOffset += SCAN_CHUNKS + 1n
      this.lastScannedBlock = currentOffset - 1n// scan is inclusive
      if (currentOffset > endBlock) {
        currentOffset = endBlock
      }
      await delay(250) // Delay to avoid rate limiting, can avoid this with forking...
    }
  }

  /**
   * Destroy the provider
   */
  async destroy () {
    console.log('Destroying provider')
    // Logic to destroy the provider and iterators
    this.unwatchBlocks?.()
    this.unwatchContractEvents?.()
    this.syncing = false
    // provider doesnt supply any destroy methods?
    // console.log('Transport', this.transport())
    // @ts-ignore
    // if ('getSocket' in this.transport({}).value) {
    //   console.log('GET SOCKET FOUND')
    //   // @ts-ignore
    //   const socket = await (this.transport({}).value.getSocket())
    //   if (socket) {
    //     await socket.close()
    //   }
    // }
    // delete this.transport
    delete this.provider
    delete this.contract
  }
}

export { ViemProvider, RAILGUN_SCAN_START_BLOCK, RAILGUN_SCAN_START_BLOCK_V2 }
