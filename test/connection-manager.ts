import { describe, it } from 'node:test'
import assert from 'node:assert'
import { RPCConnectionManager } from '../src/sources/rpc/connection-manager.js'
import { RPCProvider } from '../src/sources/rpc/provider.js'

describe('Global Connection Manager', () => {
  const testRpcUrl = 'https://rpc.ankr.com/eth'
  const testRailgunAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`

  describe('Single Connection Manager with One Provider', () => {
    it('should create connection manager instance', () => {
      const connectionManager = new RPCConnectionManager(testRpcUrl)
      assert.ok(connectionManager instanceof RPCConnectionManager)
      assert.ok(connectionManager.client)
    })

    it('should create provider with injected connection manager', () => {
      const connectionManager = new RPCConnectionManager(testRpcUrl)
      const provider = new RPCProvider(testRailgunAddress, connectionManager)

      assert.ok(provider instanceof RPCProvider)
      assert.strictEqual(provider.name, 'RPCProvider')
      assert.strictEqual(provider.isLiveProvider, true)
      assert.strictEqual(provider.head, 0n)
    })

    it('should allow multiple providers to share same connection manager', () => {
      const connectionManager = new RPCConnectionManager(testRpcUrl)
      const provider1 = new RPCProvider(testRailgunAddress, connectionManager)
      const provider2 = new RPCProvider(testRailgunAddress, connectionManager)

      assert.ok(provider1 instanceof RPCProvider)
      assert.ok(provider2 instanceof RPCProvider)
      assert.strictEqual(provider1.client, provider2.client)
    })

    it('should create connection manager with custom config', () => {
      const connectionManager = new RPCConnectionManager(testRpcUrl, 10)
      const provider = new RPCProvider(testRailgunAddress, connectionManager)

      assert.ok(provider instanceof RPCProvider)
      assert.ok(connectionManager.client)
    })
  })
})
