// This is a bare client implementation, different to rpc/*, we do not rely on using viem.

/**
 * Create a JSON-RPC request object.
 * @param method JSON-RPC method name
 * @param params Parameters for the method, of any type
 * @returns JSON-RPC request object
 */
function jsonrpc (method: string, params: any) {
  const request: any = {
    jsonrpc: '2.0',
    id: i++,
    method
  }
  
  if (params !== undefined) {
    request.params = Array.isArray(params) ? params : [params]
  }
  
  return request
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
class JSONRPCClient {
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
   * Enable logging for batch operations
   */
  #enableLogging: boolean

  /**
   * Create a new RPC client.
   * @param url JSON-RPC URL as string or URL object
   * @param maxBatchSize Maximum number of requests to batch together in a single RPC call. Default is 1000.
   * @param enableLogging Enable logging for debugging batch operations. Default is false.
   */
  constructor (url: string | URL, maxBatchSize = 1000, enableLogging = false) {
    this.#url = new URL(url)
    this.#maxBatchSize = maxBatchSize
    this.#enableLogging = enableLogging
  }

  /**
   * Log a message if logging is enabled
   * @param message The message to log
   */
  #log (message: string): void {
    if (this.#enableLogging) {
      console.log(message)
    }
  }

  /**
   * Send a JSON-RPC request to the server. The request may be batched with other requests if the client is already processing requests.
   * @param req JSON-RPC request object, see {@link jsonrpc}
   * @returns A promise that resolves with the result of the request, or rejects with an error if the request failed.
   */
  async request<T = any>(req: Req): Promise<T> {
    const prom = Promise.withResolvers<T>()
    this.#requests.push([prom, req])

    this.#log(`[JSONRPCClient] Queued request ${req.id}: ${req.method} (queue size: ${this.#requests.length})`)

    if (this.#inflight != null) {
      this.#log(`[JSONRPCClient] Request ${req.id} joining existing batch (inflight: true)`)
      return prom.promise
    }

    const self = this

    this.#log(`[JSONRPCClient] Request ${req.id} starting new batch cycle`)

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
        self.#log('[JSONRPCClient] No more requests to process, ending batch cycle')
        self.#inflight = null
        return
      }

      const requestIds = reqs.map(([, r]) => r.id).join(', ')
      const methods = reqs.map(([, r]) => r.method).join(', ')
      self.#log(`[JSONRPCClient] Sending batch of ${reqs.length} requests: [${requestIds}] methods: [${methods}]`)

      const batchPayload = reqs.map(([, r]) => r)
      const inflight = self.#inflight = fetch(self.#url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(batchPayload)
      })

      inflight.then(async res => {
        const data = await res.json()

        self.#log(`[JSONRPCClient] Received batch response with ${data.length} results`)

        for (const [i, res] of data.entries()) {
          if (res.error) {
            self.#log(`[JSONRPCClient] Request ${reqs[i]![1].id} failed: ${res.error.message}`)
            reqs[i]![0].reject(new Error(res.error.message))
          } else {
            self.#log(`[JSONRPCClient] Request ${reqs[i]![1].id} completed successfully`)
            reqs[i]![0].resolve(res.result)
          }
        }
      }).finally(() => {
        if (self.#requests.length > 0) {
          self.#log(`[JSONRPCClient] ${self.#requests.length} requests remaining, continuing batch processing`)
          _loop()
        } else {
          self.#log('[JSONRPCClient] All requests completed, ending batch cycle')
          self.#inflight = null
        }
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
    return this.#request<T>(jsonrpc(method, params))
  }

  /**
   * Check if URL supports WebSocket
   * @returns Valid support ws or not
   */
  get supportsWebSocket (): boolean {
    return this.#url.protocol === 'ws:' || this.#url.protocol === 'wss:'
  }

  /**
   * Connect to WebSocket if supported
   * @returns Nothing. Will throw if ws is not supported. Will resolve and log if ok.
   */
  async #connectWebSocket (): Promise<void> {
    if (!this.supportsWebSocket) {
      throw new Error('WebSocket not supported for this URL')
    }

    // Perhaps connection was already stablished, return that conn
    if (this.#wsConnected) {
      return this.#wsConnected
    }

    this.#wsConnected = new Promise((resolve, reject) => {
      const wsUrl = this.#url.toString()
      this.#log(`[JSONRPCClient] Connecting to WebSocket: ${wsUrl}`)

      this.#ws = new WebSocket(wsUrl)

      // Connects to ws
      /**
       * Websocket open callback
       */
      this.#ws.onopen = () => {
        this.#log('[JSONRPCClient] WebSocket connected')
        resolve()
      }

      /**
       * Websocket error callback
       * @param error - Error description
       */
      this.#ws.onerror = (error) => {
        this.#log(`[JSONRPCClient] WebSocket error: ${error}`)
        reject(error)
      }

      /**
       * Websocket event callback
       * @param event - Event data
       */
      this.#ws.onmessage = (event) => {
        try {
          // Receives new message, parse data
          const data = JSON.parse(event.data)
          this.#handleWebSocketMessage(data)
        } catch (error) {
          this.#log(`[JSONRPCClient] Failed to parse WebSocket message: ${error}`)
        }
      }

      /**
       * Websocket close callback
       */
      this.#ws.onclose = () => {
        this.#log('[JSONRPCClient] WebSocket disconnected')
        this.#ws = null
        this.#wsConnected = null
      }
    })

    return this.#wsConnected
  }

  /**
   * Handle incoming WebSocket messages
   * @param data - JSONRPC Data
   */
  #handleWebSocketMessage (data: any): void {
    // Supported method from json rpc atm
    console.log('handleWebSocketMessage: ', data)
    if (data.method === 'eth_subscription') {
      const subscriptionId = data.params?.subscription
      const result = data.params?.result

      if (subscriptionId && result) {
        const subscription = this.#subscriptions.get(subscriptionId)
        if (subscription) {
          this.#log(`[JSONRPCClient] Received subscription data for ${subscriptionId}`)
          subscription.handler(result)
        }
      }
    }
  }

  /**
   * Subscribe to events via WebSocket
   * @param type - Subscription type (e.g., 'logs', 'newHeads')
   * @param params - Subscription parameters
   * @param handler - Event handler function
   * @returns Subscription ID
   */
  async subscribe (type: string, params: any, handler: SubscriptionHandler): Promise<string> {
    if (!this.supportsWebSocket) {
      throw new Error('WebSocket subscriptions not supported for this URL')
    }

    await this.#connectWebSocket()

    if (!this.#ws) {
      throw new Error('WebSocket connection not available')
    }

    const subscriptionRequest = {
      jsonrpc: '2.0',
      id: i++,
      method: 'eth_subscribe',
      params: [type, params]
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Subscription request timeout'))
      }, 10000)

      /**
       * Websocket mssage handler
       * @param event - MessageEvent
       */
      const onMessage = (event: MessageEvent) => {
        try {
          const response = JSON.parse(event.data)
          if (response.id === subscriptionRequest.id) {
            this.#ws!.removeEventListener('message', onMessage)
            clearTimeout(timeout)

            if (response.error) {
              reject(new Error(response.error.message))
              return
            }

            const subscriptionId = response.result
            this.#subscriptions.set(subscriptionId, {
              id: subscriptionId,
              handler
            })

            this.#log(`[JSONRPCClient] Created subscription ${subscriptionId} for ${type}`)
            resolve(subscriptionId)
          }
        } catch (error) {
          // Ignore parsing errors for other messages
        }
      }

      this.#ws!.addEventListener('message', onMessage)
      this.#ws!.send(JSON.stringify(subscriptionRequest))
      this.#log(`[JSONRPCClient] Sent subscription request ${subscriptionRequest.id} for ${type}`)
    })
  }

  /**
   * Unsubscribe from events
   * @param subscriptionId - Subscription ID to unsubscribe
   */
  async unsubscribe (subscriptionId: string): Promise<void> {
    if (!this.#ws || !this.#subscriptions.has(subscriptionId)) {
      return
    }

    const unsubscribeRequest = {
      jsonrpc: '2.0',
      id: i++,
      method: 'eth_unsubscribe',
      params: [subscriptionId]
    }
    this.#ws.send(JSON.stringify(unsubscribeRequest))
    this.#subscriptions.delete(subscriptionId)
    this.#log(`[JSONRPCClient] Unsubscribed from ${subscriptionId}`)
  }

  /**
   * Close WebSocket connection and clean up subscriptions
   */
  destroy (): void {
    if (this.#ws) {
      this.#ws.close()
      this.#ws = null
      this.#wsConnected = null
    }
    this.#subscriptions.clear()
    this.#log('[JSONRPCClient] Client destroyed')
  }
}

export { JSONRPCClient }
