import { describe, test } from 'node:test'

import dotenv from 'dotenv'

import { SubsquidProvider } from '../src'
import { RPCConnectionManager, RPCProvider } from '../src/sources/rpc'
import { SourceAggregator } from '../src/sources/source-aggregator'

dotenv.config()

const MOCK_RPC_URL = process.env['RPC_API_KEY_POLYGON']!
const MOCK_SQUID_URL = process.env['SQUID_ENDPOINT']!
const RAILGUN_PROXY_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9' as `0x${string}`
const RAILGUN_PROXY_DEPLOYMENT_BLOCK = 28083766n

describe('GraphProvider [Polygon]', () => {
  test('Should create an aggregated source', async () => {
    const graphProvider = new SubsquidProvider(
      MOCK_SQUID_URL
    )

    const connectionManager = new RPCConnectionManager(1)
    const rpcProvider = new RPCProvider(RAILGUN_PROXY_ADDRESS, MOCK_RPC_URL, connectionManager)

    const aggregatedSource = new SourceAggregator([
      graphProvider,
      rpcProvider
    ])

    const iterator = aggregatedSource.from({
      startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK,
      chunkSize: 499n,
    })

    for await (const block of iterator) {
      console.log(block.number)
    }

    aggregatedSource.destroy()
  })
})
