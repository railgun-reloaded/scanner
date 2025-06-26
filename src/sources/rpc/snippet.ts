// snippet.js - Demonstrating different request processing approaches

// Simulated RPC client
const mockRPCClient = {
  // @ts-ignore
  /**
   *
   * @param fromBlock
   * @param toBlock
   */
  async getLogs (fromBlock, toBlock) {
    console.log(`Fetching logs from ${fromBlock} to ${toBlock}`)
    await new Promise(resolve => setTimeout(resolve, 50)) // Simulate network delay
    return [`log_${fromBlock}_${toBlock}`]
  },

  // @ts-ignore
  /**
   *
   * @param hash
   */
  async getTransaction (hash) {
    console.log(`Fetching transaction ${hash}`)
    await new Promise(resolve => setTimeout(resolve, 30))
    return { hash, data: `tx_${hash}` }
  }
}

// @ts-ignore
/**
 *
 * @param fn
 * @param args
 */
function promisify (fn, ...args) {
  return () => fn(...args)
}

/**
 *
 */
async function promiseAllSettled () {
  const requests = [
    promisify(mockRPCClient.getLogs, 100, 200),
    promisify(mockRPCClient.getLogs, 200, 300),
    promisify(mockRPCClient.getTransaction, '0x123'),
    promisify(mockRPCClient.getTransaction, '0x456')
  ]

  const results = await Promise.allSettled(requests.map(req => req()))
  results.forEach(result => console.log(`res: ${JSON.stringify(result)}`))
}

/**
 *
 */
async function setImmediateBatchingApproach () {
  const requestQueue = [
    promisify(mockRPCClient.getLogs, 100, 200),
    promisify(mockRPCClient.getLogs, 200, 300),
    promisify(mockRPCClient.getTransaction, '0x123'),
    promisify(mockRPCClient.getTransaction, '0x456')
  ]

  // @ts-ignore
  const results = []
  let isProcessing = false
  let i = 0

  /**
   *
   */
  function processQueue () {
    if (isProcessing || requestQueue.length === 0) return

    isProcessing = true
    const currentBatch = i++

    setImmediate(async () => {
      console.log('setImmediate')
      const batch = requestQueue.splice(0, 2)

      console.log(`batch ${currentBatch} w ${batch.length} requests...`)

      const batchResults = await Promise.all(batch.map(req => req()))
      results.push(...batchResults)

      isProcessing = false

      if (requestQueue.length > 0) {
        processQueue()
      } else {
        // @ts-ignore
        results.forEach(result => console.log(`result: ${JSON.stringify(result)}`))
      }
    })
  }

  processQueue()
  console.log('run all requests')
}

/**
 *
 */
async function runAll () {
  // await promiseAllSettled()
  await setImmediateBatchingApproach()
}

runAll().catch(console.error)
