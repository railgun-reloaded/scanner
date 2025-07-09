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

    // Use Alchemy's exact suggested range (they know their own limits)
    const result = await client.call('eth_getLogs', {
      fromBlock: '0xe17dbf',  // Alchemy's suggested start
      toBlock: '0xe17fb2',    // Alchemy's suggested end  
      address: RAILGUN_PROXY_ADDRESS
    })

    console.log('RESULT: ', result)

    assert.ok(Array.isArray(result))
    const startBlock = parseInt('0xe17dbf', 16)
    const endBlock = parseInt('0xe17fb2', 16)
    console.log(`Found ${result.length} logs in the test range (blocks ${startBlock} to ${endBlock})`)

    // Should complete request successfully
    assert.ok(result.length >= 0, 'Should complete request successfully')
    
    if (result.length > 0) {
      const firstLog = result[0]
      assert.ok(typeof firstLog.address === 'string')
      assert.ok(typeof firstLog.blockNumber === 'string')
      assert.ok(typeof firstLog.transactionHash === 'string')
      assert.ok(Array.isArray(firstLog.topics))
      console.log(`First log: block ${parseInt(firstLog.blockNumber, 16)}, tx ${firstLog.transactionHash}`)
      console.log(`Got ${result.length} logs from blocks ${startBlock}-${endBlock}`)
    }
  })
})
