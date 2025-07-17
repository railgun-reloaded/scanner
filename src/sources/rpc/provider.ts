/* eslint-disable camelcase */
import { RailgunV1, RailgunV2, RailgunV2_1 } from '@railgun-reloaded/contract-abis'
import type { Abi, Log, PublicClient } from 'viem'
import { decodeEventLog } from 'viem'

import type { EVMBlock, EVMLog } from '../../models'
import type { DataSource, SyncOptions } from '../data-source'

import type { RPCConnectionManager } from './connection-manager'

const DEFAULT_CHUNK_SIZE = 500n
type AsyncIterableDisposable<T, TReturn = any, TVal = any> = AsyncIterable<T, TReturn, TVal> & {
  destroy: () => void
}

/**
 * RPC Provider that manages connections and provides iterators for blockchain data
 */
export class RPCProvider<T extends EVMBlock> implements DataSource<T> {
  /** The latest height up to which this provider can get data */
  head = 0n

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
   * An array of iterator to iterate over the live rpc events
   * Used to kill all the liveSync when the provider is destroyed
   */
  #liveEventIterators: Array<AsyncIterableDisposable<EVMBlock | undefined>> = []

  /**
   * Initialize RPC provider with its own RPC URL and connection manager
   * @param railgunProxyAddress - Railgun proxy contract address
   * @param rpcURL - RPC endpoint URL for this provider
   * @param connectionManager - Connection manager instance
   */
  constructor (
    railgunProxyAddress: `0x${string}`,
    rpcURL: string,
    connectionManager: RPCConnectionManager
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
   * https://github.com/apollographql/graphql-subscriptions/blob/master/src/pubsub-async-iterable-iterator.ts
   * Create iterator for polling live event from callback
   * @param client - Viem Client
   * @returns - AyncIterator for EvmBlock
   */
  #pollLiveEvent (client: PublicClient) {
    let pushQueue = new Array<EVMBlock>()
    const pullQueue = new Array<(input: { value: EVMBlock | undefined, done: boolean }) => void>()
    let syncing = true

    // Conditional variable
    const unwatchEvent = client.watchEvent({
      address: this.#railgunProxyAddress,
      /**
       * Callback to listen to live events
       * @param logs - Event Logs
       */
      onLogs: (logs) => {
        pushValue(this.#bucketLogs(logs))
      }
    })

    /**
     * Push value to buffer or directly to iterator
     * @param blocks - EVM BlockData
     */
    const pushValue = (blocks: EVMBlock[]) => {
      for (let i = 0; i < blocks.length; ++i) {
        if (pullQueue.length !== 0) {
          pullQueue.shift()!({ value: blocks[i]!, done: false })
        } else {
          pushQueue.push(...blocks)
        }
      }
    }

    /**
     * Get value from buffer or queue
     * @returns - EVMBlock
     */
    const pullValue = () : Promise<{ value: EVMBlock | undefined, done: boolean }> => {
      return new Promise(resolve => {
        if (pushQueue.length !== 0) {
          resolve({ value: pushQueue.shift()!, done: false })
        } else {
          pullQueue.push(resolve)
        }
      })
    }

    /**
     * Cleanup callback and queue
     */
    const cleanup = () => {
      syncing = false
      pullQueue.forEach(resolve => resolve({ value: undefined, done: true }))
      pushQueue = []
      unwatchEvent()
    }

    return {
      /**
       * Destroy the iterator
       */
      destroy () {
        cleanup()
      },
      /**
       * Return asyncIterator
       * @returns - AsyncIterator for EvmBlock
       */
      [Symbol.asyncIterator] () {
        return {
          /**
           * Should return next value for iterator
           * @returns - EVMBlock
           */
          next () : Promise<{ value: EVMBlock | undefined, done: boolean }> {
            return syncing ? pullValue() : this.return()
          },

          /**
           * Should cleanup resources
           * @returns - Promise that resolves to undefined, which should signal close
           */
          return () : Promise<{ value: typeof undefined, done: boolean }> {
            cleanup()
            return Promise.resolve({ value: undefined, done: true })
          },
          /**
           * Should handle error
           * @param err - Error Object
           * @returns - Rejected promise
           */
          throw (err: Error) {
            cleanup()
            return Promise.reject(err)
          },

        }
      },
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
    const client = this.#client

    // Create an iterator to poll live event
    let liveEventIterator: AsyncIterableDisposable<EVMBlock | undefined> | null = null
    if (!endHeight && liveSync) {
      liveEventIterator = this.#pollLiveEvent(client)
      this.#liveEventIterators.push(liveEventIterator)
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
    return this.#client
  }

  /**
   * Stop provider from syncing if it is
   */
  destroy () {
    clearTimeout(this.#headPollTimeout)
    for (const iterator of this.#liveEventIterators) {
      iterator.destroy()
    }
  }
}
