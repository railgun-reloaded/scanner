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
 * RPC Connection Manager handles JSON RPC requests
 */
export class JSONRPCConnectionManager {
  /**
   * The JSON RPC client instance
   */
  #client: any
  /**
   * Queue of pending requests
   */
  #requestQueue: RequestData[] = []
  /**
   * Maximum concurrent requests allowed
   */
  #maxConcurrentRequests: number

  /**
   * Initialize RPC connection manager
   * @param rpcURL - RPC endpoint URL
   * @param maxConcurrentRequests - Maximum concurrent requests allowed
   */
  constructor (
    rpcURL: string,
    maxConcurrentRequests: number = 5
  ) {
    // @@ TODO
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
    // @@ TODO

  }

  /**
   * Process the request queue, also responsible of resolving or rejecting the promise
   */
  private async processQueue (): Promise<void> {
    // @@ TODO
  }
}
