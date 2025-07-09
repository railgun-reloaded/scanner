import { JSONRPCClient } from './client'

/**
 * JSON RPC Connection Manager handles JSON RPC requests using the custom JSONRPCClient
 * This connection manager is designed to work with the railgun-data-sync style batching
 */
export class JSONRPCConnectionManager {
  /**
   * The JSON RPC client instance
   */
  #client: JSONRPCClient

  /**
   * Initialize RPC connection manager
   * @param rpcURL - RPC endpoint URL
   * @param maxBatchSize - Maximum batch size for JSON-RPC requests
   * @param enableLogging - Enable logging for debugging batch operations
   */
  constructor (
    rpcURL: string,
    maxBatchSize: number = 1000,
    enableLogging: boolean = false
  ) {
    this.#client = new JSONRPCClient(rpcURL, maxBatchSize, enableLogging)
  }

  /**
   * Submit a new request to the connection manager
   * @param requestFn - Function that returns a promise
   * @param _requestId - Unique identifier for the request (not used in this implementation)
   * @returns Promise that will be resolved by the underlying JSON-RPC client
   */
  async submitRequest<T> (
    requestFn: () => Promise<T>,
    _requestId: string
  ): Promise<T> {
    return await requestFn()
  }

  /**
   * Get the underlying JSON-RPC client
   * @returns The JSONRPCClient instance
   */
  get client () {
    return this.#client
  }
}
