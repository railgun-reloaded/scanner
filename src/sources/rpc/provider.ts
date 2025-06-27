/* eslint-disable camelcase */
import { RailgunV1, RailgunV2, RailgunV2_1 } from '@railgun-reloaded/contract-abis'
import type { WatchEventReturnType } from 'viem'
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
  private connectionManager: RPCConnectionManager
  /** Railgun proxy contract address */
  private railgunProxyAddress: `0x${string}`
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
    this.connectionManager = new RPCConnectionManager(rpcURL, maxConcurrentRequests)
    this.railgunProxyAddress = railgunProxyAddress
    const combinedAbi = [...RailgunV1, ...RailgunV2, ...RailgunV2_1]
    // @TODO remove duplicate events
    this.eventAbis = combinedAbi.filter(item => item.type === 'event')
  }

  /**
   * Groups and sorts logs by block, transaction, and log index, yielding EVMBlock objects.
   * @param logs - Array of raw log objects
   * @returns Array of EVMBlock objects grouped and sorted
   */
  sortLogsByBlockTxEvent (logs: Array<any>) : Array<EVMBlock> {
    const groupedBlockTxEvents : Record<string, EVMBlock> = {}
    for (const event of logs) {
      const { blockNumber, blockHash, blockTimestamp } = event
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
          abi: this.eventAbis,
          data,
          topics
        }) as { name: string, args: Record<string, any> }
        const evmLog: EVMLog = {
          index: logIndex,
          address,
          name: decodedLog.name,
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
        // Error logging for failed event decoding
        console.error('Failed to decode log: ', topics)
      }
    }
    let blockInfos = Object.values(groupedBlockTxEvents)
    blockInfos = blockInfos.sort((a, b) => Number(a.number - b.number))
    for (const block of blockInfos) {
      block.transactions = block.transactions.sort((a, b) => a.index - b.index)
      for (const tx of block.transactions) {
        tx.logs = tx.logs.sort((a, b) => a.index - b.index)
      }
    }
    return blockInfos.filter(block => block.transactions.length !== 0)
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

    if (!this.railgunProxyAddress || this.railgunProxyAddress.length === 0) {
      throw new Error(`Railgun Proxy Address is invalid: ${this.railgunProxyAddress}`)
    }

    let { startHeight, endHeight, chunkSize = DEFAULT_CHUNK_SIZE, liveSync = false } = options
    let currentHeight = startHeight
    const client = this.connectionManager.getClient()

    /**
     * Initialize a listener so that it can listen to the events
     */
    let liveEventQueue: ViemLog[] = []
    let unwatchEvent : WatchEventReturnType | null = null
    if (!endHeight && liveSync) {
      unwatchEvent = client.watchEvent({
        address: this.railgunProxyAddress,
        /**
         * Callback to listen to live events
         * @param logs - Event Logs
         */
        onLogs: (logs) => {
          // @TODO this is not correct
          liveEventQueue.push(logs as unknown as ViemLog)
        }
      })
    }

    const latestHeight = await client.getBlockNumber()
    if (!latestHeight) throw new Error('Failed to get latest height')
    endHeight = endHeight ? minBigInt(endHeight, BigInt(latestHeight)) : BigInt(latestHeight)
    if (chunkSize === 0n) throw new Error('ChunkSize cannot be zero')

    // Process historical blocks
    while (currentHeight < endHeight) {
      const batchEndHeight = minBigInt(currentHeight + chunkSize, endHeight)
      const requestId = `iterator_${currentHeight}_${batchEndHeight}`
      // Use connection manager for log requests
      const logs = await this.connectionManager.submitRequest(
        () => this.createLogRequest(currentHeight, batchEndHeight),
        requestId
      )
      if (logs && logs.length > 0) {
        const evmBlockData = this.sortLogsByBlockTxEvent(logs)
        for (const blockData of evmBlockData) {
          yield blockData as T
        }
      }
      this.head = batchEndHeight
      currentHeight = batchEndHeight
      console.log('Head: ', this.head, ' Remaining: ', endHeight - this.head)
    }

    // if it is a live source, we should wait until new events are available
    if (liveSync) {
      console.log('Switching to live event listener ...')
      while (!this.stopSyncing) {
        /*
        const evmBlockData = this.sortLogsByBlockTxEvent(liveEventQueue)
        for (const blockData of evmBlockData) {
          yield blockData as T
        }
        */
        // if (liveEventQueue.length > 0) { console.log('LOGS', liveEventQueue) }
        liveEventQueue = []
        await new Promise((resolve) => setTimeout(resolve, 12))
      }

      // Stop listening for the live events
      if (unwatchEvent) {
        unwatchEvent()
      }
    }
  }

  /**
   * Create log request for specific block range
   * @param fromBlock - Start block number
   * @param toBlock - End block number
   * @returns Promise resolving to logs
   */
  private async createLogRequest (fromBlock: bigint, toBlock: bigint): Promise<any[]> {
    const client = this.connectionManager.getClient()
    const logs = await client.getLogs({
      address: this.railgunProxyAddress,
      fromBlock,
      toBlock
    })
    return logs
  }

  /**
   * Get the underlying viem client
   * @returns The viem PublicClient instance
   */
  getClient () {
    return this.connectionManager.getClient()
  }

  /**
   * Stop provider from syncing if it is
   */
  destroy (): void {
    this.stopSyncing = true
  }
}
