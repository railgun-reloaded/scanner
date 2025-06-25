import assert from 'node:assert'
import { describe, test } from 'node:test'

import dotenv from 'dotenv'

import { Provider } from '../src/sources/providers/provider'

dotenv.config()

const MOCK_RPC_URL = process.env['RPC_API_KEY']
const RAILGUN_PROXY_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9' as `0x${string}`
const RAILGUN_PROXY_DEPLOYMENT_BLOCK = 14737691n

describe('Provider Integration Tests', () => {
  test('Should create an iterator from a provider', async () => {
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
})
