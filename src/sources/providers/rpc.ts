import type { RailgunTransactionData } from '../../models'
import type { DataSource, SyncOptions } from '../data-source'

/**
 * A RPC provider for Data Source
 */
class RpcProvider<T extends RailgunTransactionData> implements DataSource<T> {
  /**
   * Current head
   */
  head = 0n

  /**
   * Name of datasource
   */
  name = 'RpcProvider'

  /**
   * Flag to indicate if the data-source is syncing or not
   */
  syncing = false

  /**
   * Create an async iterator with given config
   * @param options - Sync options
   * @returns - AsyncIterator of T
   */
  from (options: SyncOptions) : AsyncIterable<T> {
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

    // Find the height range for processing historical data
    let { startHeight, chunkSize, endHeight } = options
    const latestHeight = 0n
    endHeight = endHeight ? minBigInt(endHeight, latestHeight) : latestHeight
    chunkSize = chunkSize ?? 500n

    /**
     * Get next batch of events
     * @param _startHeight - Start height for the batch
     * @param _endHeight - End height for the batch
     */
    const queueNextBatch = (_startHeight: bigint, _endHeight: bigint) => {
    }

    const totalBlocks = endHeight - options.startHeight

    let queuedBlockSize = totalBlocks < 10000n ? 10000n : totalBlocks
    const requestBatch = []
    while (queuedBlockSize > 0) {
      requestBatch.push(queueNextBatch(startHeight, chunkSize))
      startHeight += chunkSize
      queuedBlockSize -= chunkSize
    }

    return {
      /**
       * Async iterator
       * @returns async iterator
       */
      [Symbol.asyncIterator] () {
        return {
          /**
           * Next function
           * @returns - need to be defined
           */
          async next () {
            let data = []
            while (data.length > 0 && startHeight < endHeight) {
              // Queue next batch
              queueNextBatch(startHeight, startHeight + chunkSize)
              startHeight += chunkSize
              // Wait for next nearest batch
              data = await requestBatch.shift()
            }

            return { done: false, data: data.shift() }
          },
        }
      }
    }
  }
}

export { RpcProvider }
