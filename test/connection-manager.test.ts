import assert from 'node:assert'
import { describe, it } from 'node:test'

import dotenv from 'dotenv'

import { RPCConnectionManager } from '../src/sources/rpc/connection-manager.js'
import { RPCProvider } from '../src/sources/rpc/provider.js'

dotenv.config()

describe('Multi-Provider Connection Manager', () => {
  const alchemyRpcUrl = process.env['RPC_API_KEY']!
  const ankrRpcUrl = process.env['ANKR_RPC_API_KEY']!
  const testRailgunAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`

  describe('Multiple Providers with Different RPC URLs', () => {
    it('should create connection manager and two providers with different RPC URLs', () => {
      const connectionManager = new RPCConnectionManager(3)
      const provider1 = new RPCProvider(testRailgunAddress, alchemyRpcUrl, connectionManager)
      const provider2 = new RPCProvider(testRailgunAddress, ankrRpcUrl, connectionManager)

      assert.ok(connectionManager instanceof RPCConnectionManager)
      assert.ok(provider1 instanceof RPCProvider)
      assert.ok(provider2 instanceof RPCProvider)

      assert.ok(provider1.client)
      assert.ok(provider2.client)
      assert.notStrictEqual(provider1.client, provider2.client)
    })

    it('should handle requests from different providers through same connection manager', async () => {
      const connectionManager = new RPCConnectionManager(2)
      const provider1 = new RPCProvider(testRailgunAddress, alchemyRpcUrl, connectionManager)
      const provider2 = new RPCProvider(testRailgunAddress, ankrRpcUrl, connectionManager)

      /**
       * Create an alchemy request
       * @returns Response data of JSON RPC Requeest
       */
      const alchemyRequest = async () => {
        const blockNumber = await provider1.client.getBlockNumber()
        return { provider: 'alchemy', blockNumber }
      }

      /**
       * Create an ankr request
       * @returns Response data of JSON RPC Requeest
       */
      const ankrRequest = async () => {
        const blockNumber = await provider2.client.getBlockNumber()
        return { provider: 'ankr', blockNumber }
      }

      const [result1, result2] = await Promise.all([
        connectionManager.submitRequest(alchemyRequest, 'alchemy-request'),
        connectionManager.submitRequest(ankrRequest, 'ankr-request')
      ])

      assert.ok(result1.provider === 'alchemy')
      assert.ok(result2.provider === 'ankr')
      assert.ok(typeof result1.blockNumber === 'bigint')
      assert.ok(typeof result2.blockNumber === 'bigint')
    })

    it('should batch requests from multiple providers efficiently', async () => {
      const connectionManager = new RPCConnectionManager(5)
      const provider1 = new RPCProvider(testRailgunAddress, alchemyRpcUrl, connectionManager)
      const provider2 = new RPCProvider(testRailgunAddress, ankrRpcUrl, connectionManager)

      const requests = []

      for (let i = 0; i < 3; i++) {
        requests.push(
          connectionManager.submitRequest(
            async () => ({ provider: 'alchemy', request: i, blockNumber: await provider1.client.getBlockNumber() }),
            `alchemy-request-${i}`
          )
        )
      }

      for (let i = 0; i < 3; i++) {
        requests.push(
          connectionManager.submitRequest(
            async () => ({ provider: 'ankr', request: i, blockNumber: await provider2.client.getBlockNumber() }),
            `ankr-request-${i}`
          )
        )
      }

      const results = await Promise.all(requests)

      assert.strictEqual(results.length, 6)

      const alchemyResults = results.filter(r => r.provider === 'alchemy')
      const ankrResults = results.filter(r => r.provider === 'ankr')

      assert.strictEqual(alchemyResults.length, 3)
      assert.strictEqual(ankrResults.length, 3)

      results.forEach(result => {
        assert.ok(typeof result.blockNumber === 'bigint')
      })
    })
  })
})
