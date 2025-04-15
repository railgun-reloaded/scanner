import { RailgunSmartWalletV21 } from '@railgun-reloaded/contract-abis'
import { solo } from 'brittle'
import dotenv from 'dotenv'

import { SourceAggregator } from '../../../src/data-aggregator/source-aggregator.js'
import { EthersProvider } from '../../../src/data-source/evm-provider/providers/ethers.js'
import { EVMProvider } from '../../../src/data-source/evm-provider.js'
import { NetworkName, RailgunProxyDeploymentBlock } from '../../../src/globals/constants.js'

dotenv.config()
const TEST_RPC_URL = 'http://127.0.0.1:8545'// process.env['TEST_RPC_URL_HTTPS']
const TEST_CONTRACT_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9'

/**
 * Test EVM Provider
 * @returns EVM Provider
 */
const getTestEVMProvider = () => {
  if (typeof TEST_RPC_URL === 'undefined') {
    throw new Error('TEST_RPC_URL is not set')
  }
  const provider = new EthersProvider(
    NetworkName.Ethereum,
    TEST_RPC_URL!,
    TEST_CONTRACT_ADDRESS,
    RailgunSmartWalletV21,
    { chainId: 1, ws: false }
  )
  const datasource = new EVMProvider(provider)
  return { provider, datasource }
}

solo('Source should sync from zero state given a single evm provider', async (t) => {
  // scenario 0. NO STORED DATA. BUILD ALL
  t.timeout(1000_000)
  const { datasource, provider } = getTestEVMProvider()
  // await datasource.initialize()
  // comes from provider, data source is not an emitter.

  const aggregator = new SourceAggregator([datasource as any])

  provider.on('newHead', (blockNumber) => {
    t.pass(`http:iterator New block: ${blockNumber}`)
  })
  // START BLOCK
  await aggregator.initialize()
  await aggregator.sync()
  const START_TESTING_BLOCK = RailgunProxyDeploymentBlock[NetworkName.Ethereum]
  // Kills source to exit test.
  // setTimeout(async () => {
  //   await datasource.destroy()
  // }, 50_000)
  for await (const event of (await aggregator.read(BigInt(START_TESTING_BLOCK)))) {
    // console.log('FoundEvent', event)
    // t.pass('EVM-Provider:http:iterator FoundEvent')
    if (event?.blockHeight) {
      t.is(event.blockHeight > BigInt(START_TESTING_BLOCK), true)
    }
    // console.log('handledEvent', event?.blockHeight)
  }
  t.pass('Data Synced.')

  // check the height
})

export { getTestEVMProvider }
