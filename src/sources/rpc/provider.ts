import type { Abi, Chain, PublicClient } from 'viem'
import { createPublicClient, decodeEventLog, http } from 'viem'

import type { EVMBlock } from '../../models/index.js'
import type { DataSource, SyncOptions } from '../data-source.js'
import type { DecodedLog } from '../formatters/rpc/rpc-blockdata-formatter.js'
import { groupLogsByBlock } from '../formatters/rpc/rpc-blockdata-formatter.js'

import type { RPCConnectionManager } from './connection-manager.js'

const DEFAULT_CHUNK_SIZE = 500n

type AsyncIterableDisposable<T, TReturn = any, TVal = any> = AsyncIterable<T, TReturn, TVal> & {
  destroy: () => void
}

/**
 * RPC-backed `DataSource` that fetches RAILGUN contract events directly from
 * a JSON-RPC endpoint and formats them into `EVMBlock`s.
 *
 * Historical range sync: uses `eth_getLogs` against the connection manager
 * so requests are batched / queued. Live sync: subscribes via `watchEvent`
 * and pushes new blocks through an async iterator.
 *
 * Always treated as a live provider, suitable as the tail source in a
 * `SourceAggregator` after a historical indexer like Subsquid.
 */
export class RPCProvider<T extends EVMBlock> implements DataSource<T> {
  /** Declares this source as live-capable for `SourceAggregator`. */
  isLiveProvider = true

  /** Shared manager that rate-limits and queues outbound RPC requests. */
  #connectionManager: RPCConnectionManager
  /** RAILGUN proxy contract address that emits the target events. */
  #railgunProxyAddress: `0x${string}`
  /** Underlying viem public client used for RPC calls. */
  #client: PublicClient
  /** Contract ABI used to decode event logs. */
  #abi: Abi
  /** Active live-event iterators, tracked so `destroy()` can cancel them. */
  #liveEventIterators: Array<AsyncIterableDisposable<EVMBlock | undefined>> = []

  /**
   * Build an RPCProvider bound to a specific contract and RPC endpoint.
   * @param railgunProxyAddress - Address of the RAILGUN proxy contract to watch
   * @param rpcURL - HTTP(S) JSON-RPC endpoint
   * @param abi - Contract ABI used to decode event logs
   * @param chain - Viem chain descriptor (e.g. `mainnet`, `sepolia`, `arbitrum`);
   *   must match the network `rpcURL` points at, otherwise viem will reject
   *   requests on chain-id mismatch
   * @param connectionManager - Shared rate-limiter / batcher for outbound requests
   */
  constructor (
    railgunProxyAddress: `0x${string}`,
    rpcURL: string,
    abi: Abi,
    chain: Chain,
    connectionManager: RPCConnectionManager
  ) {
    if (rpcURL.length === 0) throw new Error('RPC URL is invalid')
    if (railgunProxyAddress.length === 0) throw new Error('Railgun Proxy Address is invalid')

    this.#connectionManager = connectionManager
    this.#railgunProxyAddress = railgunProxyAddress
    this.#abi = abi
    this.#client = createPublicClient({
      chain,
      transport: http(rpcURL)
    })
  }

  /**
   * Current head block number on the chain, used by `SourceAggregator` to
   * decide how far this source can cover.
   * @returns Latest block number as bigint
   */
  head () {
    return this.#client.getBlockNumber()
  }

  /**
   * Decode raw log payloads against the configured ABI and group them into
   * `EVMBlock[]`. Logs that don't decode (e.g. proxy upgrade events) are
   * skipped silently — they're expected noise, not errors.
   * @param logs - Raw logs from an `eth_getLogs` or `watchEvent` callback
   * @returns Blocks grouped by number, sorted ascending
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
   * Subscribe to new logs via `watchEvent` and bridge them into an async
   * iterator with push/pull queues so the caller can `for await` cleanly.
   * Returns an iterator with a `destroy()` escape hatch to cancel the
   * subscription without draining the generator.
   * @param client - Viem public client used to create the watcher
   * @returns Disposable async iterator of live EVMBlocks
   */
  #pollLiveEvent (client: PublicClient) {
    let pushQueue = new Array<EVMBlock>()
    const pullQueue = new Array<(input: { value: EVMBlock | undefined; done: boolean }) => void>()
    let syncing = true

    /**
     * Viem calls this every time new matching logs arrive from the subscription.
     * @param logs - Raw logs in the new batch
     */
    const onLogs = (logs: any[]) => {
      pushValue(this.#decodeAndGroupLogs(logs))
    }

    const unwatchEvent = client.watchEvent({
      address: this.#railgunProxyAddress,
      onLogs
    })

    /**
     * Route new blocks either to a waiting consumer or into the buffer.
     * @param blocks - Decoded blocks from the latest log batch
     */
    const pushValue = (blocks: EVMBlock[]) => {
      for (const block of blocks) {
        const pull = pullQueue.shift()
        if (pull) {
          pull({ value: block, done: false })
        } else {
          pushQueue.push(block)
        }
      }
    }

    /**
     * Hand the consumer either a buffered block or a pending promise.
     * @returns Promise resolving to the next iterator result
     */
    const pullValue = (): Promise<{ value: EVMBlock | undefined; done: boolean }> => {
      return new Promise(resolve => {
        const queued = pushQueue.shift()
        if (queued !== undefined) {
          resolve({ value: queued, done: false })
        } else {
          pullQueue.push(resolve)
        }
      })
    }

    /**
     * Release the subscription, drain pending consumers, and mark done.
     */
    const cleanup = () => {
      syncing = false
      pullQueue.forEach(resolve => resolve({ value: undefined, done: true }))
      pushQueue = []
      unwatchEvent()
    }

    return {
      /**
       * External escape hatch to stop the subscription without draining.
       */
      destroy () {
        cleanup()
      },
      /**
       * Async iterator protocol entry point.
       * @returns Iterator with next / return / throw
       */
      [Symbol.asyncIterator] () {
        return {
          /**
           * Advance the iterator; returns done=true after cleanup.
           * @returns Next iterator result
           */
          next (): Promise<{ value: EVMBlock | undefined; done: boolean }> {
            return syncing ? pullValue() : this.return()
          },
          /**
           * Caller-initiated termination.
           * @returns Iterator result with done=true
           */
          return (): Promise<{ value: typeof undefined; done: boolean }> {
            cleanup()
            return Promise.resolve({ value: undefined, done: true })
          },
          /**
           * Error termination — cleans up and re-throws via rejection.
           * @param err - Error to propagate to the consumer
           * @returns Rejected promise with `err`
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
   * Stream `EVMBlock`s for the requested height range. Fetches historical
   * logs in chunks of `chunkSize` (default 500), yielding blocks in order.
   * When `liveSync` is true and no `endHeight` is set, continues tailing
   * live events after the historical catch-up completes.
   * @param options - Sync options (start/end height, chunk size, live flag)
   * @yields Each EVMBlock in ascending order
   */
  async * from (options: SyncOptions): AsyncGenerator<T> {
    /**
     * Min of two bigints (native Math.min doesn't accept bigint).
     * @param a - First bigint
     * @param b - Second bigint
     * @returns Smaller of the two
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
   * Issue an `eth_getLogs` request for the RAILGUN proxy in the given range.
   * Wrapped so the connection manager can retry / queue uniformly.
   * @param fromBlock - Inclusive start block
   * @param toBlock - Inclusive end block
   * @returns Raw logs from the RPC endpoint
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
   * Underlying viem public client, exposed for callers that need direct
   * chain access (e.g. reading tx calldata for `boundParamsHash`).
   * @returns The viem PublicClient bound to the configured RPC URL
   */
  get client () {
    return this.#client
  }

  /**
   * Stop all active live-event iterators created by this provider.
   * Must be called to release `watchEvent` subscriptions.
   */
  destroy () {
    for (const iterator of this.#liveEventIterators) {
      iterator.destroy()
    }
  }
}
