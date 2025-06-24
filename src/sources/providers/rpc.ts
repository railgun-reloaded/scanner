// eslint-disable-next-line camelcase
import { RailgunV1, RailgunV2, RailgunV2_1 } from '@railgun-reloaded/contract-abis'
import { createPublicClient, http, parseAbiItem } from 'viem'
import { mainnet } from 'viem/chains'

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
   * RPC url
   */
  rpcURL: string

  /**
   * Contract Address for Railgun Proxy
   */
  railgunProxyAddress: `0x${string}`

  /**
   * Event topics to filter the logs
   */
  filterEventTopics: string[]

  /**
   * Initialize a rpc provider with rpc url
   * @param rpcURL - RPC url to scan events from
   * @param railgunProxyAddress - Railgun Proxy Contract address
   */
  constructor (rpcURL: string, railgunProxyAddress: `0x${string}`) {
    this.rpcURL = rpcURL
    this.railgunProxyAddress = railgunProxyAddress

    this.filterEventTopics = []
  }

  /**
   * Create an async iterator with given config
   * @param options - Sync options
   * @returns - AsyncIterator of T
   * @yields - fdskfd
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

    // Find the height range for processing historical data
    let { startHeight, chunkSize, endHeight } = options

    // @TODO Fetch it from the RPC
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

    /**
     * The idea here is to create a point where we register a contract listener for latest block and
     * use eth_getLogs to get old events. Should we create this separation using the latest height?
     */

    // Limit the endHeight to the latestHeight
    endHeight = endHeight ? minBigInt(endHeight, BigInt(latestHeight)) : BigInt(latestHeight)

    // Set chunkSize to 500 if it is not provided
    if (chunkSize === 0n) throw new Error('ChunkSize cannot be zero')
    chunkSize = chunkSize ?? 500n

    // Create a merged abi for all the version and create interface
    // eslint-disable-next-line camelcase
    const mergedABI = mergeABIs[...RailgunV1, ...RailgunV2, ...RailgunV2_1]

    /**
     * Get next batch of events
     * @param startHeight - Start height for the batch
     * @param endHeight - End height for the batch
     */
    const queueNextBatch = async (startHeight: bigint, endHeight: bigint) => {
      const logs = client.getLogs({
        address: this.railgunProxyAddress,
        event: parseAbiItem(mergedABI),
        fromBlock: startHeight,
        toBlock: endHeight
      })
    }

    const amountOfBlocksToRead = endHeight - options.startHeight
    const queuedBlockSize = amountOfBlocksToRead < 10000n ? 10000n : amountOfBlocksToRead
    const requestBatch = [] // Q: Whats the type of request batch here

    // This is more explicit about the iteration bounds and avoids potential infinite loops
    const totalBatches = Number((queuedBlockSize + chunkSize - 1n) / chunkSize)
    for (let i = 0; i < totalBatches; i++) {
      const batchEndHeight = minBigInt(startHeight + chunkSize, endHeight)
      requestBatch.push(queueNextBatch(startHeight, batchEndHeight))
      startHeight = batchEndHeight
      if (startHeight > endHeight) break
    }

    let data = []
    // Await for the request until there is valid data
    // Also, for each request resolved we add another request
    while (data.length > 0 && startHeight < endHeight) {
      // Queue next batch
      queueNextBatch(startHeight, startHeight + chunkSize)
      startHeight = minBigInt(startHeight + chunkSize, endHeight)
      // Wait for next nearest batch
      data = await requestBatch.shift()
    }
    // Create RailgunTransactionData from data[]
    const formattedData : RailgunTransactionData[] = []

    // Cannot return one by one here :(
    for (const entry of formattedData) { yield entry as T }
  }
}

export { RpcProvider }
