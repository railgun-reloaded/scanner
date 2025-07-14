/* eslint-disable camelcase */
import { RailgunV1, RailgunV2, RailgunV2_1 } from '@railgun-reloaded/contract-abis'
import type { Abi, Log, PublicClient } from 'viem'
import { decodeEventLog } from 'viem'

import type { EVMBlock, EVMLog } from '../../models'
import type { DataSource, SyncOptions } from '../data-source'

import { RPCConnectionManager } from './connection-manager'

const DEFAULT_CHUNK_SIZE = 500n

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
 * RPC Provider that manages connections and provides iterators for blockchain data
 */
export class RPCProvider<T extends EVMBlock> implements DataSource<T> {
  /** The latest height up to which this provider can get data */
  head = 0n

  /** Name of datasource */
  name = 'RPCProvider'

  /** Flag to indicate if the data-source can provide live data or not */
  isLiveProvider = true

  /** RPC Connection manager instance */
  #connectionManager: RPCConnectionManager
  /** Railgun proxy contract address */
  #railgunProxyAddress: `0x${string}`
  /**
   * List of event fragments in all the version of Railgun
   */
  #abi: Abi

  /**
   * Stores value returned by timeout when polling head
   */
  #headPollTimeout?: NodeJS.Timeout

  /**
   * A flag to indicate if it should continue syncing
   * Is only applicable for the liveProvider
   */
  #stopSyncing: boolean = false

  /**
   * Initialize RPC provider with RPC URL and railgun proxy address
   * @param rpcURL - RPC endpoint URL
   * @param railgunProxyAddress - Railgun proxy contract address
   * @param maxConcurrentRequests - Maximum concurrent requests allowed
   */
  constructor (
    rpcURL: string,
    railgunProxyAddress: `0x${string}`,
    maxConcurrentRequests: number = 5
  ) {
    if (rpcURL.length === 0) throw new Error('RPC URL is invalid')
    if (railgunProxyAddress.length === 0) throw new Error('Railgun Proxy Address is invalid')

    this.#connectionManager = new RPCConnectionManager(rpcURL, maxConcurrentRequests)
    this.#railgunProxyAddress = railgunProxyAddress
    this.#abi = [...RailgunV1, ...RailgunV2, ...RailgunV2_1] as Abi

    // Setup a timeout to poll the head continuously
    this.#pollHead()
  }

  /**
   * Get latest height from the RPC
   * @returns - Latest block height
   */
  async #pollHead () {
    try {
      this.head = await this.#connectionManager.client.getBlockNumber()
    } catch (err) {
      console.log(err)
    }
    if (this.#headPollTimeout) {
      clearTimeout(this.#headPollTimeout)
    }
    this.#headPollTimeout = setTimeout(this.#pollHead.bind(this), 12_000)
  }

  /**
   * Groups and sorts logs by block, transaction, and log index, yielding EVMBlock objects.
   * @param logs - Array of raw log objects
   * @returns Array of EVMBlock objects grouped and sorted
   */
  #bucketLogs (logs: Array<any>) : Array<EVMBlock> {
    const groupedBlockTxEvents : Record<string, EVMBlock> = {}
    for (const event of logs) {
      const { blockNumber, blockHash, blockTimestamp } = event

      // Add block information
      if (!groupedBlockTxEvents[blockNumber]) {
        groupedBlockTxEvents[blockNumber] = {
          number: BigInt(blockNumber),
          hash: blockHash,
          timestamp: BigInt(blockTimestamp ?? 0),
          transactions: [],
          internalTransaction: []
        }
      }

      const { logIndex, address, transactionIndex, transactionHash, data, topics } = event
      try {
        const decodedLog = decodeEventLog({
          abi: this.#abi,
          data,
          topics
        }) as { eventName: string, args: Record<string, any> }

        // Create event info
        const evmLog: EVMLog = {
          index: logIndex,
          address,
          name: decodedLog.eventName,
          args: decodedLog.args
        }

        const transactionInfo = groupedBlockTxEvents[blockNumber].transactions.find((entry) => entry.hash === transactionHash)
        if (!transactionInfo) {
          groupedBlockTxEvents[blockNumber].transactions.push({
            from: address,
            hash: transactionHash,
            index: transactionIndex,
            logs: [evmLog]
          })
        } else {
          transactionInfo.logs.push(evmLog)
        }
      } catch {
        // These are proxy event which we have ignored for now
      }
    }

    const blockInfos = Object.values(groupedBlockTxEvents)
    return blockInfos.filter(block => block.transactions.length !== 0)
    /*
    blockInfos = blockInfos.sort((a, b) => Number(a.number - b.number))
    for (const block of blockInfos) {
      block.transactions = block.transactions.sort((a, b) => a.index - b.index)
      for (const tx of block.transactions) {
        tx.logs = tx.logs.sort((a, b) => a.index - b.index)
      }
    }
    */
  }

  /**
   * Create iterator for polling live event
   * @param client - Viem Client
   * @yields - EvmBlock
   */
  async * #pollLiveEvent (client: PublicClient) {
    let liveEventQueue: ViemLog[] = []

    // Conditional variable
    const unwatchEvent = client.watchEvent({
      address: this.#railgunProxyAddress,
      /**
       * Callback to listen to live events
       * @param logs - Event Logs
       */
      onLogs: (logs) => {
        liveEventQueue.push(logs as unknown as ViemLog)
      }
    })

    while (!this.#stopSyncing) {
      const evmBlockData = this.#bucketLogs(liveEventQueue)
      for (const blockData of evmBlockData) {
        yield blockData as T
      }
      liveEventQueue = []
      await new Promise((resolve) => setTimeout(resolve, 12_000))
    }

    // Stop listening for the live events
    if (unwatchEvent) {
      unwatchEvent()
    }
  }

  /**
   * Create an async iterator with given config
   * @param options - Sync options
   * @returns AsyncGenerator that returns EVMBlock
   * @yields EVMBlock - Block data with grouped/sorted transactions and logs
   */
  async * from (options: SyncOptions): AsyncGenerator<T> {
    /**
     * Helper function to get minimum of two big ints
     * @param a - lhs
     * @param b - rhs
     * @returns - Return smallest of a and b
     */
    const minBigInt = (a: bigint, b: bigint) => a < b ? a : b

    let { startHeight, endHeight, chunkSize = DEFAULT_CHUNK_SIZE, liveSync = false } = options
    let currentHeight = startHeight
    const client = this.#connectionManager.client

    // Create an iterator to poll live event
    let liveEventIterator : AsyncGenerator<EVMBlock> | null = null
    if (!endHeight && liveSync) {
      liveEventIterator = this.#pollLiveEvent(client)
    }

    const latestHeight = await client.getBlockNumber()
    if (!latestHeight) throw new Error('Failed to get latest height')
    endHeight = endHeight ? minBigInt(endHeight, BigInt(latestHeight)) : BigInt(latestHeight)

    // Process historical blocks
    while (currentHeight < endHeight) {
      const batchEndHeight = minBigInt(currentHeight + chunkSize, endHeight)
      const requestId = `iterator_${currentHeight}_${batchEndHeight}`
      // Use connection manager for log requests
      const logs = await this.#connectionManager.submitRequest(
        () => this.#createLogRequest(currentHeight, batchEndHeight),
        requestId
      )
      if (logs && logs.length > 0) {
        const evmBlockData = this.#bucketLogs(logs)
        for (const blockData of evmBlockData) {
          yield blockData as T
        }
      }
      currentHeight = batchEndHeight
    }

    // if it is a live source, we should wait until new events are available
    if (liveSync && liveEventIterator) {
      for await (const blockData of liveEventIterator) {
        yield blockData as T
      }
    }
  }

  /**
   * Create log request for specific block range
   * @param fromBlock - Start block number
   * @param toBlock - End block number
   * @returns Promise resolving to logs
   */
  async #createLogRequest (fromBlock: bigint, toBlock: bigint): Promise<Log[]> {
    const client = this.#connectionManager.client
    const logs = await client.getLogs({
      address: this.#railgunProxyAddress,
      fromBlock,
      toBlock
    })
    return logs
  }

  /**
   * Get the underlying viem client
   * @returns The viem PublicClient instance
   */
  get client () {
    return this.#connectionManager.client
  }

  /**
   * Stop provider from syncing if it is
   */
  destroy () {
    clearTimeout(this.#headPollTimeout)
    this.#stopSyncing = true
  }
}
