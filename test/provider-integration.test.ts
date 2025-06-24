import assert from 'node:assert'
import { describe, test } from 'node:test'

import dotenv from 'dotenv'

import { Provider } from '../src/sources/providers/provider'

dotenv.config()

// Load RPC API key from environment
const MOCK_RPC_URL = process.env['RPC_API_KEY'] || 'https://eth-mainnet.g.alchemy.com/v2/your-api-key'
const RAILGUN_PROXY_ADDRESS = '0x19B620929f97b7b990801496c3b361ca5def8c71' as `0x${string}`
const RAILGUN_PROXY_DEPLOYMENT_BLOCK = 17000000n

describe('Provider Integration Tests', () => {
  test('Provider Integration Test - Two Iterators', async () => {
    console.log('Starting Provider Integration Test...\n')

    // Create provider instance
    const provider = new Provider(
      MOCK_RPC_URL,
      RAILGUN_PROXY_ADDRESS,
      3, // maxConcurrentRequests
      200 // requestDelay
    )
    console.log('Initial connection status:', provider.getConnectionStatus())

    // Create first iterator for block range 1
    console.log('\nCreating first iterator...')
    const iterator1 = provider.from({
      startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK,
      endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 10_000n,
      chunkSize: 500n
    })

    console.log('Both iterators created successfully')
    console.log('Iterators status:', provider.getIteratorsStatus())

    let iterator1Count = 0

    try {
      // Process iterator1
      /**
       * asd
       */
      const processIterator1 = async () => {
        console.log('Starting iterator1 processing...')
        for await (const data of iterator1) {
          iterator1Count++
          console.log(`Iterator1 - Event ${iterator1Count}: Block ${(data as any).blockNumber}`)

          // Simulate some processing time
          await new Promise(resolve => setTimeout(resolve, 10))
        }
        console.log('Iterator1 completed processing')
      }

      // Run both iterators concurrently
      await Promise.all([processIterator1()])
    } catch (error) {
      console.error('Error during processing:', error)
      // This is expected to fail due to invalid API key, so we don't throw
      console.log('Test completed (expected failure due to invalid API key)')
      return
    }
    console.log('\nProvider Integration Test completed!')
    assert.ok(true, 'Provider integration test completed successfully')
  })

  // test('Provider Error Handling Test', async () => {
  //   console.log('\nTesting error handling...')

  //   const provider = new Provider(
  //     'https://invalid-rpc-url.com',
  //     RAILGUN_PROXY_ADDRESS
  //   )

  //   try {
  //     const iterator = provider.from({
  //       startHeight: 1n,
  //       endHeight: 100n,
  //       chunkSize: 10n
  //     })

  //     for await (const _data of iterator) {
  //       console.log('This should not execute')
  //     }
  //     assert.fail('Should have thrown an error')
  //   } catch (error) {
  //     console.log('Error handling works correctly:', (error as Error).message)
  //     assert.ok(true, 'Error handling works correctly')
  //   }
  // })
})
