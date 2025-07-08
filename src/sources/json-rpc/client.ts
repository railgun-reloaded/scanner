// No imports needed - all types are used inline

/**
 * Create a JSON-RPC request object.
 * @param method JSON-RPC method name
 * @param params Parameters for the method, of any type
 * @returns JSON-RPC request object
 */
function jsonrpc (method: string, params: any) {
  return {
    jsonrpc: '2.0',
    id: i++,
    method,
    params: [params]
  }
}

type Req = ReturnType<typeof jsonrpc>

let i = 1

/**
 * JSON-RPC client with automatic request batching based on railgun-data-sync pattern.
 * To take full advantage of batching, care must be taken around awaiting requests.
 * Normally one would be would `await` an async call to suspend execution, such that async code reads in a linear fashion.
 * However for batching to kick in, requests need to queue up in the same event loop tick.
 * Therefore it is beneficial to think of requests in a message passing style, where requests are sent, but the
 * response is not awaited immediately, but instead processed in successive `.then` callbacks.
 */
export class JSONRPCClient {
  /**
   * JSON-RPC URL
   */
  #url: URL

  /**
   * Intermediate variable to track inflight requests. `null` if no requests are currently being processed.
   */
  #inflight: Promise<unknown> | null = null

  /**
   * Queue of requests to be sent to the RPC server.
   */
  #requests: [ReturnType<typeof Promise.withResolvers<any>>, Req][] = []

  /**
   * Maximum number of requests to batch together in a single RPC call.
   */
  #maxBatchSize: number

  /**
   * Create a new RPC client.
   * @param url JSON-RPC URL as string or URL object
   * @param maxBatchSize Maximum number of requests to batch together in a single RPC call. Default is 1000.
   */
  constructor (url: string | URL, maxBatchSize = 1000) {
    this.#url = new URL(url)
    this.#maxBatchSize = maxBatchSize
  }

  /**
   * Send a JSON-RPC request to the server. The request may be batched with other requests if the client is already processing requests.
   * @param req JSON-RPC request object, see {@link jsonrpc}
   * @returns A promise that resolves with the result of the request, or rejects with an error if the request failed.
   */
  async request<T = any>(req: Req): Promise<T> {
    const prom = Promise.withResolvers<T>()
    this.#requests.push([prom, req])

    if (this.#inflight != null) return prom.promise

    const self = this

    // Wait one tick so we can queue up more requests sync
    self.#inflight = Promise.resolve()
    await self.#inflight

    _loop()

    return prom.promise

    /**
     * Loop over all the requests and send them in batches.
     */
    async function _loop () {
      const reqs = self.#requests.splice(0, Math.min(self.#maxBatchSize, self.#requests.length))
      
      if (reqs.length === 0) {
        self.#inflight = null
        return
      }

      const inflight = self.#inflight = fetch(self.#url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reqs.map(([, r]) => r))
      })

      inflight.then(async res => {
        const data = await res.json()

        for (const [i, res] of data.entries()) {
          if (res.error) reqs[i]![0].reject(new Error(res.error.message))
          else reqs[i]![0].resolve(res.result)
        }
      }).finally(() => {
        if (self.#requests.length > 0) _loop()
        else self.#inflight = null
      })
    }
  }

  /**
   * Make a JSON-RPC request with method and params
   * @param method - RPC method name
   * @param params - Method parameters
   * @returns Promise resolving to the method result
   */
  async call<T>(method: string, params?: any): Promise<T> {
    return this.request<T>(jsonrpc(method, params))
  }
}

export { jsonrpc }