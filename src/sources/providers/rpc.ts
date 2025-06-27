// eslint-disable-next-line camelcase
import { RailgunV1, RailgunV2, RailgunV2_1 } from '@railgun-reloaded/contract-abis'
import type { WatchEventReturnType } from 'viem'
import { createPublicClient, decodeEventLog, http } from 'viem'
import { mainnet } from 'viem/chains'

import type { EVMBlock, EVMLog } from '../../models'
import type { DataSource, SyncOptions } from '../data-source'

const DEFAULT_CHUNK_SIZE = 500n
const INITIAL_BATCH_SIZE = 10000n

interface ViemLog {
  address: string;
  blockHash: string;
  blockNumber: string;
  blockTimestamp: string;
  data: `0x${string}`;
  logIndex: number;
  removed: boolean;
  topics: [];
  transactionHash: string;
  transactionIndex: number;
}

/**
 * A RPC provider for Data Source
 */
class RpcProvider<T extends EVMBlock> implements DataSource<T> {
  /**
   * The latest height upto which this provider can get data
   * For RPC this might be a tip of the chain
   */
  head = 0n

  /**
   * Name of datasource
   */
  name = 'RpcProvider'

  /**
   * Flag to indicate if the data-source can provide live data or not
   */
  isLiveProvider = true

  /**
   * RPC url
   */
  rpcURL: string

  /**
   * Contract Address for Railgun Proxy
   */
  railgunProxyAddress: `0x${string}`

  /**
   * List of event fragments in all the version of Railgun
   */
  eventAbis: any[]

  /**
   * A flag to indicate if it should continue syncing
   * Is only applicable for the liveProvider
   */
  stopSyncing: boolean = false

  /**
   * Initialize a rpc provider with rpc url
   * @param rpcURL - RPC url to scan events from
   * @param railgunProxyAddress - Railgun Proxy Contract address
   */
  constructor (rpcURL: string, railgunProxyAddress: `0x${string}`) {
    this.rpcURL = rpcURL
    this.railgunProxyAddress = railgunProxyAddress

    // eslint-disable-next-line camelcase
    const combinedAbi = [...RailgunV1, ...RailgunV2, ...RailgunV2_1]

    // @TODO remove duplicate events
    this.eventAbis = combinedAbi.filter(item => item.type === 'event')

    // @TODO Continuously update head here
  }

  /**
   * Sort the viem log into blockNumber, then transactionIndex and logIndex
   * to transactionHash and logIndex
   * @param logs - Viem Log
   * @returns - Sorted EVMBlockData according to blockNumber
   */
  sortLogsByBlockTxEvent (logs: Array<ViemLog>) : Array<EVMBlock> {
    // The log are sorted, so we won't bother sorting it again
    const groupedBlockTxEvents : Record<string, EVMBlock> = {}

    // Bucket according to blockNumber and transactionHash
    for (const event of logs) {
      const { blockNumber, blockHash, blockTimestamp } = event

      // Create new entry for the block if it doesn't exists
      if (!groupedBlockTxEvents[blockNumber]) {
        groupedBlockTxEvents[blockNumber] = {
          number: BigInt(blockNumber),
          hash: blockHash,
          timestamp: BigInt(blockTimestamp),
          transactions: [],
          internalTransaction: []
        }
      }

      // Extract Log Information
      const { logIndex, address, transactionIndex, transactionHash, data, topics } = event
      try {
        // Try decoding event log
        const decodedLog = decodeEventLog({
          abi: this.eventAbis,
          data,
          topics
        }) as { eventName: string, args: Record<string, any> }

        // Create EVMLog entry
        const evmLog: EVMLog = {
          index: logIndex,
          address,
          name: decodedLog.eventName,
          args: decodedLog.args
        }

        // Check if transaction entry already exists
        const transactionInfo = groupedBlockTxEvents[blockNumber].transactions.find((entry) => entry.hash === transactionHash)
        if (!transactionInfo) {
          groupedBlockTxEvents[blockNumber].transactions.push({
            from: address,
            hash: transactionHash,
            index: transactionIndex,
            logs: [evmLog],
          })
        } else {
          transactionInfo.logs.push(evmLog)
        }
      } catch {
        console.error('Failed to decode log: ', topics)
      }
    }

    // Sort by blockNumber
    let blockInfos = Object.values(groupedBlockTxEvents)
    blockInfos = blockInfos.sort((a, b) => Number(a.number - b.number))

    for (const block of blockInfos) {
      // Sort transactions
      block.transactions = block.transactions.sort((a, b) => a.index - b.index)
      for (const tx of block.transactions) {
        // Sort logs
        tx.logs = tx.logs.sort((a, b) => a.index - b.index)
      }
    }
    // Remove block with empty transaction
    return blockInfos.filter(block => block.transactions.length !== 0)
  }

  /**
   * Create an async iterator with given config
   * @param options - Sync options
   * @returns - AsyncGenerator that returns viem events
   * @yields - Returns an array of viem events
   */
  async * from (options: SyncOptions) : AsyncGenerator<T> {
    /**
     * 1. Go through all the historical block starting from startHeight to endHeight (latest)
     * 2. Create a listener for contracts
     * 3. Start returning data to the user
     /
     * @param a - lhs
     * @param b - rhs
     * @returns - Return smallest of a and b
     */
    const minBigInt = (a: bigint, b: bigint) => a < b ? a : b

    let { startHeight, chunkSize, endHeight } = options

    if (!this.rpcURL || this.rpcURL.length === 0) {
      throw new Error(`RPC Url is invalid: ${this.rpcURL}`)
    }

    const client = createPublicClient({
      chain: mainnet,
      transport: http(this.rpcURL)
    })

    if (!this.railgunProxyAddress || this.railgunProxyAddress.length === 0) { throw new Error(`Railgun Proxy Address is invalid: ${this.railgunProxyAddress}`) }

    /**
     * Initialize a listener so that it can listen to the events
     */
    let liveEventQueue: ViemLog[] = []
    let unwatchEvent : WatchEventReturnType | null = null

    if (!endHeight && options.liveSync) {
      unwatchEvent = client.watchEvent({
        address: this.railgunProxyAddress,
        /**
         * Callback to listen to live events
         * @param logs - Event Logs
         */
        onLogs: (logs) => {
          // @TODO this is not correct
          for (const log of logs) {
            liveEventQueue.push(log as unknown as ViemLog)
          }
        }
      })
    }

    const latestHeight = await client.getBlockNumber()
    if (!latestHeight) throw new Error('Failed to get latest height')

    if (endHeight && endHeight > latestHeight) {
      throw new Error('Cannot sync the height greater than the latest height. Switch to live event syncing')
    }
    // The idea here is to create a point where we register a contract listener for latest block and
    // use eth_getLogs to get old events.

    // Limit the endHeight to the latestHeight
    endHeight = endHeight ? minBigInt(endHeight, BigInt(latestHeight)) : BigInt(latestHeight)

    // Set chunkSize to DEFAULT_CHUNK_SIZE if it is not provided
    if (chunkSize === 0n) throw new Error('ChunkSize cannot be zero')
    chunkSize = chunkSize ?? DEFAULT_CHUNK_SIZE

    /**
     * Get next batch of events
     * @param startHeight - Start height for the batch
     * @param endHeight - End height for the batch
     * @returns - Promise to log request
     */
    const createLogRequest = async (startHeight: bigint, endHeight: bigint) : Promise<ViemLog[]> => {
      // @TODO remove the cast to unknown
      return client.getLogs({
        address: this.railgunProxyAddress,
        fromBlock: startHeight,
        toBlock: endHeight
      }) as unknown as ViemLog[]
    }

    const amountOfBlocksToRead = endHeight - options.startHeight
    const queuedBlockSize = minBigInt(amountOfBlocksToRead, INITIAL_BATCH_SIZE)

    // This stores all the promise created for log request using createRequestBatch
    const requestBatch = new Array<Promise<ViemLog[]>>() // Array of promises resolving to arrays of logs

    // This is more explicit about the iteration bounds and avoids potential infinite loops
    const totalBatches = Number((queuedBlockSize + chunkSize - 1n) / chunkSize)
    let queuedHeight = startHeight
    for (let i = 0; i < totalBatches; i++) {
      const batchEndHeight = minBigInt(queuedHeight + chunkSize, endHeight)
      // Need to add proper typing here
      requestBatch.push(createLogRequest(queuedHeight, batchEndHeight))
      queuedHeight = batchEndHeight
    }

    let currentHead = startHeight
    // Await for the request until there is valid data
    // Also, for each request resolved we add another request
    while (currentHead < endHeight && requestBatch.length > 0) {
      // Queue next batch
      if (queuedHeight < endHeight) {
        requestBatch.push(createLogRequest(queuedHeight, queuedHeight + chunkSize))
      }
      queuedHeight = minBigInt(queuedHeight + chunkSize, endHeight)

      // Wait for next nearest batch
      const logs = await requestBatch.shift()
      if (logs && logs.length > 0) {
        const evmBlockData = this.sortLogsByBlockTxEvent(logs)
        for (const blockData of evmBlockData) {
          yield blockData as T
        }
      }

      currentHead += chunkSize
    }

    // Increment the head for the block that doesn't have data
    currentHead = minBigInt(currentHead + chunkSize, endHeight)

    // if it is a live source, we should wait until new events are available
    if (options.liveSync) {
      // Start loop to process the live events
      while (!this.stopSyncing) {
        if (liveEventQueue.length > 0) {
          const evmBlockData = this.sortLogsByBlockTxEvent(liveEventQueue)
          for (const blockData of evmBlockData) {
            yield blockData as T
          }
          // Clear the processedEvents
          liveEventQueue = []
        }
        // @TODO need to select ideal time to wait for
        await new Promise((resolve) => setTimeout(resolve, 12))
      }

      // Stop listening for the live events, cleanup
      if (unwatchEvent) {
        unwatchEvent()
      }
    }
  }

  /**
   * Stop provider from syncing if it is
   */
  destroy (): void {
    this.stopSyncing = true
  }
}

export { RpcProvider }
