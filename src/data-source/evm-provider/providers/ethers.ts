import EventEmitter from 'node:events'

import { Contract, Interface, JsonRpcProvider, Network, WebSocketProvider } from 'ethers'

import type { NetworkName } from '../../../globals'
import { getAbiForNetworkBlockRange } from '../../../utils'
import { delay, promiseTimeout } from '../../utils'

const SCAN_CHUNKS = 50_000n // need to categorize this by provider, they each have their own limits. 500 is base low. we can attempt to just 'find it' but this can also incur 'ratelimits' that will effect the calculation 'guestimate' of this value.
const EVENTS_SCAN_TIMEOUT = 20_000
const SCAN_TIMEOUT_ERROR_MESSAGE = 'getLogs request timed out after 5 seconds.'
const RAILGUN_SCAN_START_BLOCK = 14693000n
const RAILGUN_SCAN_START_BLOCK_V2 = 16076000n

/**
 * d
 * @param input -   d
 * @param value -d
 * @returns -d
 */
const parseNestedArgs = (input: any, value: any): any => {
  if (input.type.endsWith('[]') && Array.isArray(value) && (input.arrayChildren && input.components)) {
    return value.map((item: any) => parseNestedArgs(input.arrayChildren, item))
  }
  return value
}

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

    const blockNum = await this.provider.getBlock('latest')
    this.emit('newHead', BigInt(blockNum?.number ?? 0))

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

    // Set to track processed event IDs to prevent duplicates
    const processedEventIds = new Set()

    while (true) {
      if (currentOffset >= endBlock) {
        break
      }
      const endOffset = currentOffset + SCAN_CHUNKS
      const startChunk = currentOffset
      const start = startChunk
      const end = endOffset > endBlock ? endBlock : endOffset

      console.log('inputs', start, end)
      const abi = getAbiForNetworkBlockRange(this.network, start, end)
      // console.log(abi.length)
      if (abi.length > 1) {
        console.log('MULTI ABI FOUND', start, end, abi.length)
        // currentOffset += SCAN_CHUNKS + 1n
        // continue
      }
      // console.log('ABI', abi.length)
      let retry = false

      for (const abib of abi) {
        if (retry) {
          continue
        }
        const iface = new Interface(abib.abi)
        // iface.forEachEvent(async (event) => {
        // console.log('Event:', event.topicHash)
        // const contract = new Contract(this.address, abib, this.provider)
        // console.log('Contract:')
        // console.log('Scanning from', startChunk, 'to', startChunk + SCAN_CHUNKS)
        // const decodeInterface = contract.interface
        // console.log('topicshashes', abib.eventTopics.length)
        const events = await promiseTimeout(
          this.provider.getLogs(
            {
              address: this.address,
              fromBlock: '0x' + start.toString(16),
              toBlock: '0x' + end.toString(16),
              topics: [abib.eventTopics],
            }
          ),
          EVENTS_SCAN_TIMEOUT,
          SCAN_TIMEOUT_ERROR_MESSAGE
        ).catch((_err) => {
          console.log('Error in queryFilter:', _err)
          retry = true
          return undefined
        })
        if (!events) {
          // try again
          console.log('No events found')
          // TODO: Properly handle this error, and redo the query
          // need to break out of while loop an go to next iteration... but impossible this deep in stak
          retry = true
          continue
        }
        if (!retry) {
          currentOffset += SCAN_CHUNKS
          this.lastScannedBlock = currentOffset - 1n// scan is inclusive
        }
        // TODO: look into moving this above the abi selection loop
        // format events
        const formatted: {
          name: string
          args: Record<string, any>
          blockNumber: number
          transactionIndex: number
          transactionHash: string
          logIndex: number
        }[] = []
        for (const event of events) {
          // Decode the event using the interface to get named arguments
          // let decoded: any
          // iface.forEachEvent((eventFragment) => {
          //   try {
          //     const output = iface.decodeEventLog(eventFragment, event.data)
          //     decoded = {
          //       name: eventFragment.name,
          //       ...output
          //     }
          //     // console.log('Event:', eventFragment.name, d)
          //   } catch (e: any) {
          //     // console.log('Error decoding event:', eventFragment.name, e.message)
          //   }
          // })
          const decoded = iface.parseLog(event)

          if (!decoded?.name) {
            console.log('No name found for event:', event)
            // continue
          }

          // Create a human-readable object with named arguments from the event
          const parsedArgs: Record<string, any> = {}
          if (decoded && decoded.args) {
            // Map each argument to its corresponding name from the fragment inputs
            if (decoded.fragment && decoded.fragment.inputs) {
              // its possible this is not properly running async. use for loop
              for (let index = 0; index < decoded.fragment.inputs.length; index++) {
                const input = decoded.fragment.inputs[index]
                if (!input) {
                  console.log('NO INPUT FOUND')
                  continue
                }
                if (input.name) {
                  // Recursively decode nested array arguments

                  parsedArgs[input.name] = parseNestedArgs(input, decoded.args[index])
                } else {
                  console.log('NO NAME FOUND')
                }
                // })
              }
            } else {
              console.log('missing fragment', decoded)
              console.log('missing inputs', decoded.fragment)
            }

            // Add any named properties that might be directly accessible
            // for (const key in decoded.args) {
            //   console.log('Key', key)
            //   if (isNaN(Number(key))) { // Skip numeric indices
            //     parsedArgs[key] = decoded.args[key]
            //   }
            // }
          } else {
            console.log('failed to decode', event)
            console.log('decoded', decoded)
          }
          const output: {
            name: string
            args: Record<string, any>
            blockNumber: number
            transactionHash: string
            transactionIndex: number
            logIndex: number
          } = {
            name: decoded?.name ?? 'UNKNOWN',
            args: parsedArgs,
            blockNumber: event.blockNumber,
            transactionIndex: event.transactionIndex,
            transactionHash: event.transactionHash,
            logIndex: event.index,
          }
          // handle duplicates here, check eventid
          const eventId = `${event.blockNumber}-${event.transactionIndex}-${event.transactionHash}-${event.index}`
          if (!processedEventIds.has(eventId)) {
            processedEventIds.add(eventId)
            formatted.push(output)
          }
          // else {
          //   console.log('Duplicate event found:', output)
          //   console.log('Duplicate event found:', event)
          // }
        }
        yield formatted
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
