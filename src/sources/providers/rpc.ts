import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

import type { RailgunTransactionData } from '../../models'
import type { DataSource, SyncOptions } from '../data-source'

const DEFAULT_CHUNK_SIZE = 500n
const INITIAL_BATCH_SIZE = 10000n

/**
 * A RPC provider for Data Source
 */
class RpcProvider<T extends RailgunTransactionData> implements DataSource<T> {
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
   * Initialize a rpc provider with rpc url
   * @param rpcURL - RPC url to scan events from
   * @param railgunProxyAddress - Railgun Proxy Contract address
   */
  constructor (rpcURL: string, railgunProxyAddress: `0x${string}`) {
    this.rpcURL = rpcURL
    this.railgunProxyAddress = railgunProxyAddress
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

    const latestHeight = await client.getBlockNumber()
    if (!latestHeight) throw new Error('Failed to get latest height')

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
    const createLogRequest = async (startHeight: bigint, endHeight: bigint) => {
      return client.getLogs({
        address: this.railgunProxyAddress,
        fromBlock: startHeight,
        toBlock: endHeight
      })
    }

    const amountOfBlocksToRead = endHeight - options.startHeight
    const queuedBlockSize = minBigInt(amountOfBlocksToRead, INITIAL_BATCH_SIZE)

    // This stores all the promise created for log request using createRequestBatch
    const requestBatch = []

    // This is more explicit about the iteration bounds and avoids potential infinite loops
    const totalBatches = Number((queuedBlockSize + chunkSize - 1n) / chunkSize)
    let queuedHeight = startHeight
    for (let i = 0; i < totalBatches; i++) {
      const batchEndHeight = minBigInt(queuedHeight + chunkSize, endHeight)
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
      const result = await requestBatch.shift()

      // Return the result
      if (result && result.length > 0) {
        for (const entry of result) {
          yield entry as T
        }
      }

      // Increment the head for the block that doesn't have data
      currentHead = minBigInt(currentHead + chunkSize, endHeight)
    }
  }
}

export { RpcProvider }
