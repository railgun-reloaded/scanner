/* eslint-disable camelcase */
import { RailgunV1, RailgunV2, RailgunV2_1 } from '@railgun-reloaded/contract-abis'

import type { EVMBlock, EVMLog } from '../../models'
import type { DataSource, SyncOptions } from '../data-source'

import { RPCConnectionManager } from './connection-manager'

const DEFAULT_CHUNK_SIZE = 500n

interface JsonRPCProviderLog {
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
export class JSONRPCProvider<T extends EVMBlock> implements DataSource<T> {
  /** The latest height up to which this provider can get data */
  head = 0n

  /** Name of datasource */
  name = 'JSONRPCProvider'

  /** Flag to indicate if the data-source can provide live data or not */
  isLiveProvider = true

  /** RPC Connection manager instance */
  #connectionManager: RPCConnectionManager
  /** Railgun proxy contract address */
  #railgunProxyAddress: `0x${string}`
  /**
   * List of event fragments in all the version of Railgun
   */
  #eventAbis: any[]

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
    this.#connectionManager = new RPCConnectionManager(rpcURL, maxConcurrentRequests)
    this.#railgunProxyAddress = railgunProxyAddress
    const combinedAbi = [...RailgunV1, ...RailgunV2, ...RailgunV2_1]
    // @TODO remove duplicate events
    this.#eventAbis = combinedAbi.filter(item => item.type === 'event')
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
     // @@ TODO
  }

  /**
   * Create log request for specific block range
   * @param fromBlock - Start block number
   * @param toBlock - End block number
   * @returns Promise resolving to logs
   */
  private async createLogRequest (fromBlock: bigint, toBlock: bigint): Promise<any[]> {
    // @@ TODO
  }

  /**
   * Get the JSON RPC Client
   * @returns The JSONRPC PublicClient instance
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
}
