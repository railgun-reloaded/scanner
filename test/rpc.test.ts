import assert from 'node:assert'
import { test } from 'node:test'

import { RpcProvider } from '../src/sources/providers/rpc'

const TEST_RPC_URL = 'https://eth.llamarpc.com'
const RAILGUN_PROXY_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9'
const RAILGUN_PROXY_DEPLOYMENT_BLOCK = 14737691n

test('Fetch first 10000 block from RPC', async () => {
  const rpcProvider = new RpcProvider(TEST_RPC_URL, RAILGUN_PROXY_ADDRESS)

  const iterator = rpcProvider.from({
    startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK,
    endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 10_000n,
    chunkSize: 500n
  })

  const events = []
  for await (const event of iterator) {
    console.log('EVENT', event)
    events.push(event)
  }
  assert.ok(true, 'Finished')
})
