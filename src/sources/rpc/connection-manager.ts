import type { PublicClient } from 'viem'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

/**
 * Request interface for connection manager
 */
interface RequestData {
  /** Unique identifier for the request */
  id: string
  /** The function that returns a promise (not executed yet) */
  requestFn: () => Promise<any>
  /** Function to resolve the promise */
  resolve: (value: any) => void
  /** Function to reject the promise */
  reject: (error: any) => void
}

/**
 * RPC Connection Manager handles RPC requests with rate limiting and queuing
 */
export class RPCConnectionManager {
  /**
   * The viem client instance
   */
  private client: PublicClient
  /**
   * Queue of pending requests
   */
  private requestQueue: RequestData[] = []
  /**
   * Maximum concurrent requests allowed
   */
  private maxConcurrentRequests: number

  /**
   * Initialize RPC connection manager
   * @param rpcURL - RPC endpoint URL
   * @param maxConcurrentRequests - Maximum concurrent requests allowed
   */
  constructor (
    rpcURL: string,
    maxConcurrentRequests: number = 5
  ) {
    this.client = createPublicClient({
      chain: mainnet,
      transport: http(rpcURL)
    })
    this.maxConcurrentRequests = maxConcurrentRequests // this is set to define batch size
  }

  /**
   * Submit a new request to the connection manager
   * @param requestFn - Function that returns a promise
   * @param requestId - Unique identifier for the request
   * @returns Promise that will be resolved or rejected by processQueue
   */
  async submitRequest<T> (
    requestFn: () => Promise<T>,
    requestId: string
  ): Promise<T> {
    const { resolve, reject, promise } = Promise.withResolvers<T>()

    const requestData: RequestData = {
      id: requestId,
      requestFn, // Store the function, don't execute it yet
      resolve,
      reject
    }

    this.requestQueue.push(requestData)
    this.processQueue()
    return promise
  }

  /**
   * Process the request queue, also responsible of resolving or rejecting the promise
   */
  private async processQueue (): Promise<void> {
    if (this.requestQueue.length === 0) {
      return
    }

    setImmediate(async () => {
      const batchSize = Math.min(this.maxConcurrentRequests, this.requestQueue.length)
      const batch = this.requestQueue.splice(0, batchSize)

      if (batch.length === 0) return

      try {
        // Execute all request functions in the batch concurrently
        const results = await Promise.all(
          batch.map(requestData => requestData.requestFn())
        )

        // Map batch results back to their respective iterators
        // Multiple iterators from the same provider can spawn multiple requests
        // that get processed in the same batch, so we need to ensure each iterator
        // gets its specific result back via their individual resolve functions
        batch.forEach((requestData, index) => {
          requestData.resolve(results[index])
        })
      } catch (error) {
        // if any of it fails reject all requests in the batch
        batch.forEach(requestData => {
          requestData.reject(error)
        })
      } finally {
        // Continue processing the queue if there are more requests
        if (this.requestQueue.length > 0) {
          this.processQueue()
        }
      }
    })
  }

  /**
   * Get the underlying viem client
   * @returns The viem PublicClient instance
   */
  getClient (): PublicClient {
    return this.client
  }
}
