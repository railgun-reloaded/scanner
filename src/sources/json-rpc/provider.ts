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
  }

  /**
   * Log message if logging is enabled
   * @param message - Message to log
   */
  #log(message: string): void {
    if (this.#connectionManager.client) {
      // Access the client's logging through the connection manager
      console.log(`[JSONRPCProvider] ${message}`)
    }
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
        const evmLog: EVMLog = {
          index: logIndex,
          address,
          name: 'RawLog', // TODO: Implement proper event decoding
          args: { data, topics }
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
        // @@ TODO: Error handling
        console.error('Failed to process log: ', topics)
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

    // For WebSocket live sync, skip historical data and go straight to live mode
    if (liveSync && client.supportsWebSocket && !endHeight) {
      this.#log('WebSocket live sync mode - skipping historical data')
    } else {
      // Get latest block height for historical sync
      const latestHeight = await client.call<string>('eth_blockNumber')
      if (!latestHeight) throw new Error('Failed to get latest height')
      const latestHeightBigInt = BigInt(latestHeight)
      endHeight = endHeight ? minBigInt(endHeight, latestHeightBigInt) : latestHeightBigInt
    }
    
    if (chunkSize === 0n) throw new Error('ChunkSize cannot be zero')

    // Process historical blocks if not in WebSocket-only live sync mode
    while (endHeight && currentHeight < endHeight) {
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
      const client = this.#connectionManager.client
      
      if (client.supportsWebSocket) {
        this.#log('Starting WebSocket live sync')
        
        const liveEventQueue: JsonRPCProviderLog[] = []
        
        await client.subscribe('logs', {
          address: this.#railgunProxyAddress
        }, (logData: JsonRPCProviderLog) => {
          liveEventQueue.push(logData)
        })
        
        while (!this.#stopSyncing) {
          if (liveEventQueue.length > 0) {
            const currentLogs = liveEventQueue.splice(0)
            const evmBlockData = this.sortLogsByBlockTxEvent(currentLogs)
            for (const blockData of evmBlockData) {
              yield blockData as T
            }
          }
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } else {
        console.warn('WebSocket not supported for this URL, live sync not available')
      }
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
    this.#connectionManager.client.destroy()
  }

  /**
   * Get syncing status
   * @returns True if syncing has been stopped
   */
  get isStopped (): boolean {
    return this.#stopSyncing
  }
}
