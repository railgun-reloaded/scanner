import assert from 'node:assert'
import { describe, test } from 'node:test'
import dotenv from 'dotenv'
import { JSONRPCClient } from '../src/sources/json-rpc/client.js'

dotenv.config()

const RAILGUN_PROXY_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9'

describe('JSONRPCClient', () => {
  const RPC_URL = process.env['RPC_API_KEY']!

  console.log('RPC URL: ', RPC_URL)

  test('Should make eth_getLogs request', async () => {
    const client = new JSONRPCClient(RPC_URL)

    const result = await client.call('eth_getLogs', {
      fromBlock: '0xe0a63b', // Block 14737467 (Railgun deployment block)
      toBlock: '0xe0a82e',   // Block 14737710 (500 block range as suggested by Alchemy)
      address: RAILGUN_PROXY_ADDRESS // Railgun proxy
    })

    console.log('RESULT: ', result)

    assert.ok(Array.isArray(result))
    console.log(`Found ${result.length} logs in the test range`)

    if (result.length > 0) {
      const firstLog = result[0]
      assert.ok(typeof firstLog.address === 'string')
      assert.ok(typeof firstLog.blockNumber === 'string')
      assert.ok(typeof firstLog.transactionHash === 'string')
      assert.ok(Array.isArray(firstLog.topics))
      console.log(`First log: block ${parseInt(firstLog.blockNumber, 16)}, tx ${firstLog.transactionHash}`)
    }
  })
})
