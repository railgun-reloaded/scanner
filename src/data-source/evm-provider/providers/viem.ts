import EventEmitter from 'node:events'

import type { HttpTransport, PublicClient, WebSocketTransport } from 'viem'
import {
  createPublicClient, decodeEventLog,
  getContract, http, webSocket
} from 'viem'
import { arbitrum, bsc, mainnet, polygon } from 'viem/chains'

import { ABIRailgunSmartWallet, ABIRailgunSmartWalletLegacyPreMar23 } from '../../../abi'
import type { NetworkName } from '../../../globals'
import { getAbiForNetworkBlockRange } from '../../../utils'
import { delay, promiseTimeout } from '../../utils'

// DEFAULT TO 500 blocks for scanning, providers are different, but this is a safe base.
const SCAN_CHUNKS = 500n
const EVENTS_SCAN_TIMEOUT = 20_000
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
   *  network name
   */
  network: NetworkName
  /**
   * block scanning chunk size for scanning with the RPC provider
   */
  chunkSize: bigint
  /**
   * constructor for EthersProvider
   * @param networkName - The network name
   * @param url - The provider URL
   * @param address - The contract address
   * @param abi - The contract ABI
   * @param options - Options for the provider
   * @param options.ws - Whether to use WebSocket or not
   * @param options.chainId - The chain ID
   * @param options.transportConfig - The transport config for the provider
   * @param options.chunkSize - The chunk size for block scanning with the RPC provider
   */
  constructor (
    networkName: NetworkName,
    url: string,
    address: `0x${string}`,
    abi: any,
    options: {
      chainId: number,
      ws?: boolean,
      transportConfig?: any
      chunkSize?: bigint
      /* add in more options later */ }
  ) {
    super()
    // Initialization code if needed
    this.url = url
    this.abi = abi
    this.lastScannedBlock = BigInt(0)
    this.syncing = false
    this.startBlock = BigInt(0)
    this.network = networkName
    const network = this.chainIdToNetwork(options.chainId)
    this.chunkSize = options.chunkSize ?? SCAN_CHUNKS
    // TODO: wss seems to not close out properly, leaving node process hanging.
    this.transport = options.ws ? webSocket(url, options.transportConfig) : http(url)

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
    console.log('CALLING SETUP LISTENERS')
    if (!this.provider) {
      throw new Error('Provider is not initialized')
    }
    const blockNum = await this.provider.getBlock()
    // console.log('BlockNum', blockNum)
    this.emit('newHead', BigInt(blockNum?.number ?? 0))
    // returns a destroy function
    this.unwatchBlocks = await this.provider.watchBlocks({

      /**
       * Called when a new block is mined.
       * @param block - The block object
       */
      onBlock: (block) => {
        this.emit('newHead', block.number)
      }
    })
    this.unwatchContractEvents = await this.provider.watchContractEvent({
      address: this.contract!.address,
      abi: this.abi,
      /**
       *  Called when a new block is mined.
       * @param logs - The logs from the new block
       */
      onLogs: (logs) => {
        // need to decode the logs
        const outputs = []
        for (const event of logs) {
          const decoded = decodeEventLog({
            abi: ABIRailgunSmartWallet,
            data: event.data,
            topics: event.topics, // this will be standard, as we are only getting 'latest' events here.
          })
          const formattedBlockNumber = event.blockNumber ?? 0n
          const formatted = {
            name: decoded.eventName,
            args: decoded.args,
            blockNumber: parseInt(formattedBlockNumber.toString()),
            transactionIndex: event.transactionIndex,
            transactionHash: event.transactionHash,
            logIndex: event.logIndex,
          }
          this.eventQueue.push(formatted as unknown as T)
          outputs.push(formatted)
          // this.emit('event', formatted)
        }

        // sort the events by chronological order
        const sorted = outputs.sort((a: any, b: any) => {
          if (a.blockNumber === b.blockNumber) {
            if (a.transactionIndex === b.transactionIndex) {
              return a.logIndex - b.logIndex
            }
            return a.transactionIndex - b.transactionIndex
          }
          return a.blockNumber - b.blockNumber
        })
        for (const event of sorted) {
          this.emit('event', event)
        }
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
    const processedEventIds = new Set()

    while (true) {
      if (currentOffset >= endBlock) {
        break
      }
      const endOffset = currentOffset + this.chunkSize
      const startChunk = currentOffset
      const start = startChunk
      const end = endOffset > endBlock ? endBlock : endOffset
      // console.log('inputs', start, end)
      const abi = getAbiForNetworkBlockRange(this.network, start, end)
      if (!this.provider) {
        throw new Error('Provider is not initialized')
      }
      for (const abiItem of abi) {
        // TODO: look into moving this above the abi selection loop
        if (abiItem.abi.length === 0) {
          console.log('No ABI found for this block range')
        }
        const formatted: {
          name: string
          args: Record<string, any>
          blockNumber: number
          transactionIndex: number
          transactionHash: string
          logIndex: number
        }[] = []
        // const testAbi = getAbiItem({ abi: abiItem.abi, name: 'Transact' })
        // console.log('TestAbi', [testAbi])
        // const filter = await this.provider.createContractEventFilter({
        //   abi: abiItem.abi,
        //   address: this.contract!.address,
        //   // eventName: 'GeneratedCommitmentBatch',
        //   fromBlock: start,
        //   toBlock: end,
        // })
        // console.log('Filter', filter)
        // const eventLogs = this.provider.getFilterLogs({ filter })
        // const c = abiItem.abi.find((e: any) => e.name === 'CommitmentBatch')
        // const abiI = getAbiItem({ abi: abiItem.abi, name: 'GeneratedCommitmentBatch' })
        // console.log('c', abiI)

        // const filter = {
        //   // address: this.contract!.address,
        //   topics: [abiItem.eventTopics] as Hex[],
        //   fromBlock: '0x' + start.toString(16),
        //   toBlock: '0x' + end.toString(16),
        // }
        const events = await promiseTimeout(
          // eventLogs,
          // @ts-ignore
          // this.provider.transport.request({ method: 'eth_getLogs', params: [filter] }),
          this.provider.getLogs({
            address: this.contract!.address,
            // events: abiItem.abi,
            // event: abiItem.abi,
            fromBlock: startChunk,
            toBlock: startChunk + this.chunkSize,
          }),
          EVENTS_SCAN_TIMEOUT,
          SCAN_TIMEOUT_ERROR_MESSAGE
        ).catch((err) => {
          this.emit('error', err)
          return []
        })
        // await this.provider.uninstallFilter({ filter })
        // console.log('Uninstalled', uninstalled)
        // console.log('Events', events.length)
        for (const event of (events as any) ?? []) {
          // console.log('EVENT', event)
          // decode events and push to formateted.
          // check if the topic is in the abi
          // Check if this event's topic is included in the abiItem's eventTopics
          // if (abiItem.eventTopics && event.topics[0]) {
          //   const eventTopicMatches = abiItem.eventTopics.some(
          //     (topic: string) => topic.toLowerCase() === event?.topics[0]!.toLowerCase()
          //   )
          //   if (!eventTopicMatches) {
          //     console.log('NO MATCHES')
          //     continue // Skip this event if its topic doesn't match any in eventTopics
          //   }
          // }
          // get the right abi item
          // Find the matching ABI item based on the event topic hash
          const eventId = `${event.blockNumber.toString(10)}-${event.transactionIndex}-${event.transactionHash}-${event.logIndex}`

          try {
            const decoded = decodeEventLog({
              abi: ABIRailgunSmartWallet,
              data: event.data,
              topics: event.topics,
            })
            // console.log('Decoded', decoded.eventName)
            // if (['Transact', 'CommitmentBatch', 'GeneratedCommitmentBatch'].includes(decoded.eventName)) {
            //   console.log('Decoded', decoded.eventName, decoded.args)
            // }
            const formattedEvent = {
              name: decoded.eventName,
              args: decoded.args,
              blockNumber: parseInt(event.blockNumber.toString()),
              transactionIndex: event.transactionIndex,
              transactionHash: event.transactionHash,
              logIndex: event.logIndex,

            }
            // console.log('FormattedEvent', formattedEvent)
            if (formattedEvent.name) {
              if (!processedEventIds.has(eventId)) {
                processedEventIds.add(eventId)
                // @ts-ignore TODO: fix this typeshit
                formatted.push(formattedEvent)
              }
            }
          } catch {
            // console.log('Error decoding event', event)
            // try again with the old abi
            try {
              const decoded = decodeEventLog({
                abi: ABIRailgunSmartWalletLegacyPreMar23,
                data: event.data,
                topics: event.topics,
              })
              // console.log('Decoded', decoded.eventName)
              // if (['Transact', 'CommitmentBatch', 'GeneratedCommitmentBatch'].includes(decoded.eventName)) {
              //   console.log('Decoded', decoded.eventName, decoded.args)
              // }
              const formattedEvent = {
                name: decoded.eventName,
                args: decoded.args,
                blockNumber: parseInt(event.blockNumber.toString()),
                transactionIndex: event.transactionIndex,
                transactionHash: event.transactionHash,
                logIndex: event.logIndex,

              }
              if (formattedEvent.name) {
                if (!processedEventIds.has(eventId)) {
                  processedEventIds.add(eventId)
                  // @ts-ignore TODO: fix this typeshit
                  formatted.push(formattedEvent)
                }
              }
            } catch {
              // console.log('Error decoding event with old abi', event)
            }
            // Handle the error as needed
          }
        }
        // console.log('Formatted', formatted.length)
        yield formatted
      }
      // format the events

      // yield events
      currentOffset += this.chunkSize
      this.lastScannedBlock = currentOffset - 1n// scan is inclusive
      // if (currentOffset > endBlock) {
      //   currentOffset = endBlock
      // }
      await delay(250) // Delay to avoid rate limiting, can avoid this with forking...
    }
  }

  /**
   * Destroy the provider
   */
  async destroy () {
    // console.log('Destroying provider')
    // Logic to destroy the provider and iterators
    if (this.unwatchBlocks) { this.unwatchBlocks() }
    if (this.unwatchContractEvents) { this.unwatchContractEvents() }
    this.syncing = false
    // provider doesnt supply any destroy methods?
    // console.log('Transport', this.transport())
    // // @ts-ignore
    // if ('getSocket' in this.transport({}).value) {
    //   console.log('GET SOCKET FOUND')
    //   // @ts-ignore
    //   const socket = await (this.transport({}).value.getSocket())
    //   if (socket) {
    //     await socket.close()
    //   }
    // }
    console.log('Destroying provider')
    this.removeAllListeners()
    // this.provider!.
    // this.provider!.pollingInterval = 0
    // this.provider!.transport['close']()
    delete this.transport
    delete this.provider
    // delete this.contract
  }
}

export { ViemProvider, RAILGUN_SCAN_START_BLOCK, RAILGUN_SCAN_START_BLOCK_V2 }
