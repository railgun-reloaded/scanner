import { Contract, JsonRpcProvider, WebSocketProvider } from 'ethers'

/**
 *   EthersProvider
 */
class EthersProvider<T = any> implements AsyncIterable<T> {
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
   * constructor for EthersProvider
   * @param url - The provider URL
   * @param address - The contract address
   * @param abi - The contract ABI
   * @param options - Options for the provider
   * @param options.ws - Whether to use WebSocket or not
   */
  constructor (url: string, address: string, abi: any, options: { ws?: boolean /* add in more options later */ } = {}) {
    // Initialization code if needed
    this.url = url
    this.lastScannedBlock = BigInt(0)
    this.syncing = false
    this.startBlock = BigInt(0)
    this.provider = options.ws ? new WebSocketProvider(url) : new JsonRpcProvider(url)
    this.contract = new Contract(address, abi, this.provider)
    this.initialized = false
    this.initializedPromise = new Promise((resolve) => {
      this.setupListeners()
      this.initializedResolve = resolve
    })
  }

  /**
   *  Start iterating from a given height.
   */
  private async setupListeners () {
    await this.provider.removeAllListeners()
    await this.contract.removeAllListeners()
    // Logic to set up listeners for the provider
    this.provider.on('pending', (tx) => {
      // TODO: Handle pending transaction event
      console.log('Pending transaction:', tx)
    })

    this.provider.on('block', (blockNumber) => {
      // TODO: Handle block event
      console.log('New block:', blockNumber)
    })

    this.provider.on('error', (error) => {
      // TODO: Handle error event
      console.error('Error:', error)
    })

    this.contract.on('*', (event: T) => {
      // TODO: Handle contract event - properly
      console.log('Contract event:', event)
      this.eventQueue.push(event)
    })
    this.initialized = true
    this.initializedResolve()
    // handle railgun
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
   * Start iterating from a given height.
   * @returns - An async generator that yields events
   * @throws - Error if the source is not a ReadableStream or an AsyncIterable
   * @yields T - The data read from the source
   */
  async * [Symbol.asyncIterator] (): AsyncGenerator<T> {
    while (true) {
      if (this.eventQueue.length > 0) {
        yield this.eventQueue.shift() as T
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000)) // Wait for 1 second before checking again
      }
    }
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
   * Destroy the provider
   * @returns - A promise that resolves when the provider is destroyed
   */
  async destroy () {
    // Logic to destroy the provider
    await this.provider.removeAllListeners()
    await this.provider.destroy()
  }
}

export { EthersProvider }
