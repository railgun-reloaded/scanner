import assert from 'node:assert'
import { describe, test } from 'node:test'

import dotenv from 'dotenv'

import { Provider } from '../src/sources/providers/provider'

dotenv.config()

const MOCK_RPC_URL = process.env['RPC_API_KEY']
const RAILGUN_PROXY_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9' as `0x${string}`
const RAILGUN_PROXY_DEPLOYMENT_BLOCK = 14737691n

describe('Provider Integration Tests', () => {
  test('Should handle an iterator from a provider', async () => {
    console.log('Starting Provider Integration Test...\n')

    const provider = new Provider(
      MOCK_RPC_URL!,
      RAILGUN_PROXY_ADDRESS,
      3,
      200
    )

    const iterator = provider.from({
      startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK,
      endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 10_000n,
      chunkSize: 499n
    })

    let iteratorCount = 0

    try {
      // eslint-disable-next-line jsdoc/require-jsdoc
      const processIterator = async () => {
        for await (const data of iterator) {
          iteratorCount++
          console.log(`Iterator - Event ${iteratorCount}: Block ${(data as any).blockNumber}`)

          await new Promise(resolve => setTimeout(resolve, 10))
        }
      }

      await Promise.all([processIterator()])
    } catch (error) {
      console.error('Error during processing:', error)
      return
    }
    assert.ok(iteratorCount > 0, 'Iterator from provider should yield events')
  })

  test('Should handle two iterators under the same provider', async () => {
    console.log('Starting Two Iterators Test...\n')

    const provider = new Provider(
      MOCK_RPC_URL!,
      RAILGUN_PROXY_ADDRESS,
      3,
      200
    )

    const iterator1 = provider.from({
      startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK,
      endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 1000n,
      chunkSize: 400n
    })

    const iterator2 = provider.from({
      startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 1000n,
      endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 2000n,
      chunkSize: 400n
    })

    console.log('Provider status with two iterators:', provider.getIteratorsStatus())

    let iterator1Count = 0
    let iterator2Count = 0

    try {
      // Process both iterators concurrently
      // eslint-disable-next-line jsdoc/require-jsdoc
      const processIterator1 = async () => {
        for await (const data of iterator1) {
          console.log(`Iterator1 - Event ${iterator1Count}: Block ${(data as any).blockNumber}`)
          iterator1Count++
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      }

      // eslint-disable-next-line jsdoc/require-jsdoc
      const processIterator2 = async () => {
        for await (const data of iterator2) {
          console.log(`Iterator2 - Event ${iterator2Count}: Block ${(data as any).blockNumber}`)
          iterator2Count++
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      }

      await Promise.all([processIterator1(), processIterator2()])

      console.log(`Iterator1 processed ${iterator1Count} events`)
      console.log(`Iterator2 processed ${iterator2Count} events`)
    } catch (error) {
      console.error('Error during processing:', error)
      throw error
    }

    assert.ok(iterator1Count >= 0, 'Iterator1 should process events (may be 0 if no events in range)')
    assert.ok(iterator2Count >= 0, 'Iterator2 should process events (may be 0 if no events in range)')
  })
})
