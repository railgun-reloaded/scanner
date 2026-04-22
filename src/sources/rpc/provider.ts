import type { Abi, PublicClient } from 'viem'
import { createPublicClient, decodeEventLog, http } from 'viem'
import { mainnet } from 'viem/chains'

import type { EVMBlock } from '../../models'
import type { DataSource, SyncOptions } from '../data-source'
import type { DecodedLog } from '../formatters/rpc/rpc-blockdata-formatter'
import { groupLogsByBlock } from '../formatters/rpc/rpc-blockdata-formatter'

import type { RPCConnectionManager } from './connection-manager'

const DEFAULT_CHUNK_SIZE = 500n

type AsyncIterableDisposable<T, TReturn = any, TVal = any> = AsyncIterable<T, TReturn, TVal> & {
  destroy: () => void
}

/**
 *
 */
export class RPCProvider<T extends EVMBlock> implements DataSource<T> {
  /**
   *
   */
  isLiveProvider = true

  /**
   *
   */
  #connectionManager: RPCConnectionManager
  /**
   *
   */
  #railgunProxyAddress: `0x${string}`
  /**
   *
   */
  #client: PublicClient
  /**
   *
   */
  #abi: Abi
  /**
   *
   */
  #liveEventIterators: Array<AsyncIterableDisposable<EVMBlock | undefined>> = []

  /**
   *
   * @param railgunProxyAddress
   * @param rpcURL
   * @param abi
   * @param connectionManager
   */
  constructor (
    railgunProxyAddress: `0x${string}`,
    rpcURL: string,
    abi: Abi,
    connectionManager: RPCConnectionManager
  ) {
    if (rpcURL.length === 0) throw new Error('RPC URL is invalid')
    if (railgunProxyAddress.length === 0) throw new Error('Railgun Proxy Address is invalid')

    this.#connectionManager = connectionManager
    this.#railgunProxyAddress = railgunProxyAddress
    this.#abi = abi
    this.#client = createPublicClient({
      chain: mainnet,
      transport: http(rpcURL)
    })
  }

  /**
   *
   */
  head () {
    return this.#client.getBlockNumber()
  }

  /**
   *
   * @param logs
   */
  #decodeAndGroupLogs (logs: Array<any>): EVMBlock[] {
    const decodedLogs: DecodedLog[] = []

    for (const log of logs) {
      try {
        const decoded = decodeEventLog({
          abi: this.#abi,
          data: log.data,
          topics: log.topics
        }) as { eventName: string; args: Record<string, any> }

        decodedLogs.push({
          eventName: decoded.eventName,
          args: decoded.args,
          blockNumber: BigInt(log.blockNumber),
          blockHash: log.blockHash,
          blockTimestamp: BigInt(log.blockTimestamp ?? 0),
          transactionHash: log.transactionHash,
          transactionIndex: log.transactionIndex,
          logIndex: log.logIndex,
          address: log.address
        })
      } catch {
        // skip logs that don't decode against the known ABI (e.g. proxy events)
      }
    }

    return groupLogsByBlock(decodedLogs)
  }

  /**
   *
   * @param client
   */
  #pollLiveEvent (client: PublicClient) {
    let pushQueue = new Array<EVMBlock>()
    const pullQueue = new Array<(input: { value: EVMBlock | undefined; done: boolean }) => void>()
    let syncing = true

    const unwatchEvent = client.watchEvent({
      address: this.#railgunProxyAddress,
      /**
       *
       * @param logs
       */
      onLogs: (logs) => {
        pushValue(this.#decodeAndGroupLogs(logs))
      }
    })

    /**
     *
     * @param blocks
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
     *
     */
    const pullValue = (): Promise<{ value: EVMBlock | undefined; done: boolean }> => {
      return new Promise(resolve => {
        if (pushQueue.length !== 0) {
          resolve({ value: pushQueue.shift()!, done: false })
        } else {
          pullQueue.push(resolve)
        }
      })
    }

    /**
     *
     */
    const cleanup = () => {
      syncing = false
      pullQueue.forEach(resolve => resolve({ value: undefined, done: true }))
      pushQueue = []
      unwatchEvent()
    }

    return {
      /**
       *
       */
      destroy () {
        cleanup()
      },
      /**
       *
       */
      [Symbol.asyncIterator] () {
        return {
          /**
           *
           */
          next (): Promise<{ value: EVMBlock | undefined; done: boolean }> {
            return syncing ? pullValue() : this.return()
          },
          /**
           *
           */
          return (): Promise<{ value: typeof undefined; done: boolean }> {
            cleanup()
            return Promise.resolve({ value: undefined, done: true })
          },
          /**
           *
           * @param err
           */
          throw (err: Error) {
            cleanup()
            return Promise.reject(err)
          }
        }
      }
    }
  }

  /**
   *
   * @param options
   */
  async * from (options: SyncOptions): AsyncGenerator<T> {
    /**
     *
     * @param a
     * @param b
     */
    const minBigInt = (a: bigint, b: bigint) => (a < b ? a : b)

    let { startHeight, endHeight, chunkSize = DEFAULT_CHUNK_SIZE, liveSync = false } = options
    let currentHeight = startHeight
    const client = this.#client

    let liveEventIterator: AsyncIterableDisposable<EVMBlock | undefined> | null = null
    if (!endHeight && liveSync) {
      liveEventIterator = this.#pollLiveEvent(client)
      this.#liveEventIterators.push(liveEventIterator)
    }

    const latestHeight = await client.getBlockNumber()
    if (!latestHeight) throw new Error('Failed to get latest height')
    endHeight = endHeight ? minBigInt(endHeight, BigInt(latestHeight)) : BigInt(latestHeight)

    while (currentHeight <= endHeight) {
      const batchEndHeight = minBigInt(currentHeight + chunkSize, endHeight)
      const requestId = `iterator_${currentHeight}_${batchEndHeight}`

      const logs = await this.#connectionManager.submitRequest(
        () => this.#createLogRequest(currentHeight, batchEndHeight),
        requestId
      )

      if (logs && logs.length > 0) {
        const evmBlocks = this.#decodeAndGroupLogs(logs)
        for (const block of evmBlocks) {
          yield block as T
        }
      }
      currentHeight = batchEndHeight + 1n
    }

    if (liveSync && liveEventIterator) {
      for await (const blockData of liveEventIterator) {
        yield blockData as T
      }
    }
  }

  /**
   *
   * @param fromBlock
   * @param toBlock
   */
  async #createLogRequest (fromBlock: bigint, toBlock: bigint): Promise<any[]> {
    const logs = await this.#client.getLogs({
      address: this.#railgunProxyAddress,
      fromBlock,
      toBlock
    })
    return logs
  }

  /**
   *
   */
  get client () {
    return this.#client
  }

  /**
   *
   */
  destroy () {
    for (const iterator of this.#liveEventIterators) {
      iterator.destroy()
    }
  }
}
