import type { PublicClient } from 'viem'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

/**
 * Request interface for connection manager
 */
interface RequestData {
  /** Unique identifier for the request */
  id: string
  /** The promise that will be executed */
  promise: Promise<any>
  /** Function to resolve the promise */
  resolve: (value: any) => void
  /** Function to reject the promise */
  reject: (error: any) => void
}

/**
 * Connection Manager handles RPC requests with rate limiting and queuing
 */
export class ConnectionManager {
  /** The viem client instance */
  private client: PublicClient
  /** Queue of pending requests */
  private requestQueue: RequestData[] = []
  /** Map of currently active requests */
  private activeRequests: Map<string, RequestData> = new Map()
  /** Maximum number of concurrent requests allowed */
  private maxConcurrentRequests: number
  /** Delay between requests in milliseconds */
  private requestDelay: number

  /**
   * Initialize connection manager
   * @param rpcURL - RPC endpoint URL
   * @param maxConcurrentRequests - Maximum concurrent requests allowed
   * @param requestDelay - Delay between requests in milliseconds
   */
  constructor (
    rpcURL: string,
    maxConcurrentRequests: number = 5,
    requestDelay: number = 100
  ) {
    this.client = createPublicClient({
      chain: mainnet,
      transport: http(rpcURL)
    })
    this.maxConcurrentRequests = maxConcurrentRequests
    this.requestDelay = requestDelay
  }

  /**
   * Submit a new request to the connection manager
   * @param requestFn - Function that returns a promise
   * @param requestId - Unique identifier for the request
   * @returns Promise that resolves with the request result
   */
  async submitRequest<T> (
    requestFn: () => Promise<T>,
    requestId: string
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const requestData: RequestData = {
        id: requestId,
        promise: requestFn(),
        resolve,
        reject
      }

      this.requestQueue.push(requestData)
      this.processQueue()
    })
  }

  /**
   * Process the request queue
   */
  private async processQueue (): Promise<void> {
    if (this.activeRequests.size >= this.maxConcurrentRequests || this.requestQueue.length === 0) {
      return
    }

    const requestData = this.requestQueue.shift()
    if (!requestData) return

    this.activeRequests.set(requestData.id, requestData)

    try {
      const result = await requestData.promise
      requestData.resolve(result)
    } catch (error) {
      requestData.reject(error)
    } finally {
      this.activeRequests.delete(requestData.id)

      // Add delay before processing next request
      if (this.requestDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.requestDelay))
      }

      // Process next request in queue
      this.processQueue()
    }
  }

  /**
   * Get the underlying viem client
   * @returns The viem PublicClient instance
   */
  getClient (): PublicClient {
    return this.client
  }

  /**
   * Get current queue status
   * @returns Object containing queue statistics
   */
  getStatus () {
    return {
      queueLength: this.requestQueue.length,
      activeRequests: this.activeRequests.size,
      maxConcurrent: this.maxConcurrentRequests
    }
  }
}