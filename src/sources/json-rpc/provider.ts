import { RailgunV1, RailgunV2, RailgunV2_1 } from '@railgun-reloaded/contract-abis'
import { decodeEventLog } from 'viem'

import type { EVMBlock, EVMLog } from '../../models'
import type { DataSource, SyncOptions } from '../data-source'

import { JSONRPCConnectionManager } from './connection-manager'

const DEFAULT_CHUNK_SIZE = 500n

interface JsonRPCProviderLog {
  address: string;
  blockHash: string;
  blockNumber: string;
  blockTimestamp: string;
  data: `0x${string}`;
  logIndex: number;
  removed: boolean;
  topics: string[];
  transactionHash: string;
  transactionIndex: number;
}

/**
 * JSON RPC Provider that manages connections and provides iterators for blockchain data
 */
export class JSONRPCProvider<T extends EVMBlock> implements DataSource<T> {
  /** The latest height up to which this provider can get data */
  head = 0n

  /** Name of datasource */
  name = 'JSONRPCProvider'

  /** Flag to indicate if the data-source can provide live data or not */
  isLiveProvider = true

  /** RPC Connection manager instance */
  #connectionManager: JSONRPCConnectionManager
  /** Railgun proxy contract address */
  #railgunProxyAddress: `0x${string}`
  /**
   * List of event fragments in all the version of Railgun
   */
  #eventAbis: any[]

  /**
   * Stop syncing flag for future live sync implementation
   */
  #stopSyncing: boolean = false

  /**
   * Initialize JSON RPC provider with RPC URL and railgun proxy address
   * @param rpcURL - RPC endpoint URL
   * @param railgunProxyAddress - Railgun proxy contract address
   * @param maxBatchSize - Maximum batch size for JSON-RPC requests
   * @param enableLogging - Enable logging for debugging batch operations
   */
  constructor (
    rpcURL: string,
    railgunProxyAddress: `0x${string}`,
    maxBatchSize: number = 1000,
    enableLogging: boolean = false
  ) {
    this.#connectionManager = new JSONRPCConnectionManager(rpcURL, maxBatchSize, enableLogging)
    this.#railgunProxyAddress = railgunProxyAddress
    const combinedAbi = [...RailgunV1, ...RailgunV2, ...RailgunV2_1]
    // @TODO remove duplicate events
    this.#eventAbis = combinedAbi.filter(item => item.type === 'event')
  }

  /**
   * Groups and sorts logs by block, transaction, and log index, yielding EVMBlock objects.
   * @param logs - Array of raw log objects
   * @returns Array of EVMBlock objects grouped and sorted
   */
  sortLogsByBlockTxEvent (logs: Array<JsonRPCProviderLog>) : Array<EVMBlock> {
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
          abi: this.#eventAbis,
          data,
          topics: topics as [] | [`0x${string}`, ...`0x${string}`[]]
        }) as { eventName: string, args: Record<string, any> }
        const evmLog: EVMLog = {
          index: parseInt(logIndex as string, 16),
          address,
          name: decodedLog.eventName,
          args: decodedLog.args
        }
        const transactionInfo = groupedBlockTxEvents[blockNumber].transactions.find((entry) => entry.hash === transactionHash)
        if (!transactionInfo) {
          groupedBlockTxEvents[blockNumber].transactions.push({
            from: address,
            hash: transactionHash,
            index: parseInt(transactionIndex as string, 16),
            logs: [evmLog]
          })
        } else {
          transactionInfo.logs.push(evmLog)
        }
      } catch {
        // Error logging for failed event decoding
        // console.error('Failed to decode log: ', topics)
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

    if (!this.#railgunProxyAddress || this.#railgunProxyAddress.length === 0) {
      throw new Error(`Railgun Proxy Address is invalid: ${this.#railgunProxyAddress}`)
    }

    let { startHeight, endHeight, chunkSize = DEFAULT_CHUNK_SIZE, liveSync = false } = options
    let currentHeight = startHeight
    const client = this.#connectionManager.client

    // Get latest block height
    const latestHeight = await client.call<string>('eth_blockNumber')
    if (!latestHeight) throw new Error('Failed to get latest height')
    const latestHeightBigInt = BigInt(latestHeight)
    endHeight = endHeight ? minBigInt(endHeight, latestHeightBigInt) : latestHeightBigInt
    if (chunkSize === 0n) throw new Error('ChunkSize cannot be zero')

    while (currentHeight < endHeight) {
      const batchEndHeight = minBigInt(currentHeight + chunkSize, endHeight)
      const requestId = `iterator_${currentHeight}_${batchEndHeight}`
      const logs = await this.#connectionManager.submitRequest(
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
    }

    if (liveSync) {
      console.warn('Live sync is not yet implemented for JSONRPCProvider')
      // TODO: Use this.#stopSyncing when implementing live sync
    }
  }

  /**
   * Create log request for specific block range
   * @param fromBlock - Start block number
   * @param toBlock - End block number
   * @returns Promise resolving to logs
   */
  private async createLogRequest (fromBlock: bigint, toBlock: bigint): Promise<JsonRPCProviderLog[]> {
    const client = this.#connectionManager.client
    const logs = await client.call<JsonRPCProviderLog[]>('eth_getLogs', {
      address: this.#railgunProxyAddress,
      fromBlock: `0x${fromBlock.toString(16)}`,
      toBlock: `0x${toBlock.toString(16)}`
    })
    return logs
  }

  /**
   * Get the JSON RPC Client
   * @returns The JSONRPCClient instance
   */
  get client () {
    return this.#connectionManager.client
  }

  /**
   * Stop provider from syncing if it is
   */
  destroy (): void {
    this.#stopSyncing = true
  }

  /**
   * Get syncing status
   * @returns True if syncing has been stopped
   */
  get isStopped (): boolean {
    return this.#stopSyncing
  }
}
