import { Provider } from '../src/sources/providers/provider'

// Mock RPC URL and Railgun proxy address for testing
const MOCK_RPC_URL = 'https://eth-mainnet.g.alchemy.com/v2/your-api-key'
const RAILGUN_PROXY_ADDRESS = '0x19B620929f97b7b990801496c3b361ca5def8c71' as `0x${string}`
const RAILGUN_PROXY_DEPLOYMENT_BLOCK = 17000000n

/**
 * Test function demonstrating the integration of Provider, ConnectionManager, and Iterator
 */
async function testProviderIntegration () {
  console.log('🚀 Starting Provider Integration Test...\n')

  // Create provider instance
  const provider = new Provider(
    MOCK_RPC_URL,
    RAILGUN_PROXY_ADDRESS,
    3, // maxConcurrentRequests
    200 // requestDelay
  )

  console.log('✅ Provider created successfully')
  console.log('📊 Initial connection status:', provider.getConnectionStatus())

  // Create first iterator for block range 1
  console.log('\n📋 Creating first iterator...')
  const iterator1 = provider.from({
    startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK,
    endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 10_000n,
    chunkSize: 500n
  })

  // Create second iterator for block range 2
  console.log('📋 Creating second iterator...')
  const iterator2 = provider.from({
    startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 10_000n,
    endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 20_000n,
    chunkSize: 500n
  })

  console.log('✅ Both iterators created successfully')
  console.log('📊 Iterators status:', provider.getIteratorsStatus())

  // Process data from both iterators concurrently
  console.log('\n🔄 Processing data from both iterators...\n')

  let iterator1Count = 0
  let iterator2Count = 0


    /**
     * it1
     */
  try {
    // Process iterator1
    const processIterator1 = async () => {
      console.log('🔄 Starting iterator1 processing...')
      for await (const data of iterator1) {
        iterator1Count++
        console.log(`📊 Iterator1 - Event ${iterator1Count}: Block ${(data as any).blockNumber}`)
        
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      console.log('✅ Iterator1 completed processing')
    }

    // Process iterator2
    /**
     * it2 
     */
    const processIterator2 = async () => {
      console.log('🔄 Starting iterator2 processing...')
      for await (const data of iterator2) {
        iterator2Count++
        console.log(`📊 Iterator2 - Event ${iterator2Count}: Block ${(data as any).blockNumber}`)
        
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      console.log('✅ Iterator2 completed processing')
    }

    // Run both iterators concurrently
    await Promise.all([processIterator1(), processIterator2()])

  } catch (error) {
    console.error('❌ Error during processing:', error)
  }

  // Final status
  console.log('\n📊 Final Results:')
  console.log(`- Iterator1 processed ${iterator1Count} events`)
  console.log(`- Iterator2 processed ${iterator2Count} events`)
  console.log(`- Provider head: ${provider.head}`)
  console.log(`- Connection status:`, provider.getConnectionStatus())
  console.log(`- Active iterators: ${provider.getIteratorsStatus().length}`)

  console.log('\n✅ Provider Integration Test completed!')
}

/**
 * Test function for error handling
 */
async function testErrorHandling () {
  console.log('\n🧪 Testing error handling...')

  const provider = new Provider(
    'https://invalid-rpc-url.com',
    RAILGUN_PROXY_ADDRESS
  )

  try {
    const iterator = provider.from({
      startHeight: 1n,
      endHeight: 100n,
      chunkSize: 10n
    })

    for await (const _data of iterator) {
      console.log('This should not execute')
    }
  } catch (error) {
    console.log('✅ Error handling works correctly:', (error as Error).message)
  }
}

// Run tests
/**
 * run tests
 */
async function runTests () {
  try {
    await testProviderIntegration()
    await testErrorHandling()
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests()
}

// Export for use in other test files
export { testProviderIntegration, testErrorHandling, runTests } 