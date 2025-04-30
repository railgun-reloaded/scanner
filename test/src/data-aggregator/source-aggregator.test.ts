import { RailgunSmartWalletV21 } from '@railgun-reloaded/contract-abis'
import { test as solo } from 'brittle'
import dotenv from 'dotenv'

import { SourceAggregator } from '../../../src/data-aggregator/source-aggregator.js'
import { EthersProvider } from '../../../src/data-source/evm-provider/providers/ethers.js'
import { ViemProvider } from '../../../src/data-source/evm-provider/providers/viem.js'
import { EVMProvider } from '../../../src/data-source/evm-provider.js'
import { NetworkName, RailgunProxyContract, RailgunProxyDeploymentBlock } from '../../../src/globals/constants.js'

dotenv.config()
const TEST_RPC_URL = 'http://127.0.0.1:8545'// process.env['TEST_RPC_URL_HTTPS']
const TEST_CONTRACT_ADDRESS = RailgunProxyContract[NetworkName.Ethereum]

/**
 * Test Ethers Provider
 * @returns EVM Provider
 */
// NOTE: be sure to destroy all datasources to close out the test.
// NOTE: be sure to destroy all datasources to close out the test.
// NOTE: be sure to destroy all datasources to close out the test.
// NOTE: be sure to destroy all datasources to close out the test.
const getTestEthersProvider = () => {
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

  return { provider, datasource, }
}
/**
 *  Test Viem Provider
 * @returns EVM Provider
 */
const getTestViemProvider = () => {
  if (typeof TEST_RPC_URL === 'undefined') {
    throw new Error('TEST_RPC_URL is not set')
  }

  const provider = new ViemProvider(
    NetworkName.Ethereum,
    TEST_RPC_URL!,
    TEST_CONTRACT_ADDRESS as `0x${string}`,
    RailgunSmartWalletV21,
    { chainId: 1, ws: false }
  )
  const datasource = new EVMProvider(provider)

  return { provider, datasource, }
}

solo('EthersProvider: Source should sync from zero state given a single evm provider', async (t) => {
  // scenario 0. NO STORED DATA. BUILD ALL
  t.timeout(390_000)
  const { datasource, provider } = getTestEthersProvider()
  // await datasource.initialize()
  // comes from provider, data source is not an emitter.

  const aggregator = new SourceAggregator([datasource as any], './ethersstore.rgblock')

  provider.on('newHead', (blockNumber) => {
    t.pass(`http:iterator New block: ${blockNumber}`)
  })
  // START BLOCK
  await aggregator.initialize()
  await aggregator.sync()
  const START_TESTING_BLOCK = RailgunProxyDeploymentBlock[NetworkName.Ethereum]
  // Kills source to exit test.

  setTimeout(async () => {
    await datasource.destroy()
  }, 5_000)
  for await (const event of (await aggregator.read(BigInt(START_TESTING_BLOCK)))) {
    console.log('FoundEvent', event)
    // t.pass('EVM-Provider:http:iterator FoundEvent')
    if (event?.blockHeight) {
      t.is(event.blockHeight > BigInt(START_TESTING_BLOCK), true)
    }
    // console.log('handledEvent', event?.blockHeight)
  }
  t.pass('Data Synced.')

  // check the height
})

solo('ViemProvider: Source should sync from zero state given a single evm provider', async (t) => {
  // scenario 0. NO STORED DATA. BUILD ALL
  t.timeout(390_000)
  const { datasource, provider } = getTestViemProvider()
  // await datasource.initialize()
  // comes from provider, data source is not an emitter.

  const aggregator = new SourceAggregator([datasource as any], './viemstore.rgblock')

  provider.on('newHead', (blockNumber) => {
    t.pass(`http:iterator New block: ${blockNumber}`)
  })
  // START BLOCK
  await aggregator.initialize()
  await aggregator.sync()
  const START_TESTING_BLOCK = RailgunProxyDeploymentBlock[NetworkName.Ethereum]
  // Kills source to exit test.
  console.log('Finished Syncing')
  setTimeout(async () => {
    console.log('Destroying datasource')
    await datasource.destroy()
  }, 5_000)
  for await (const event of (await aggregator.read(BigInt(START_TESTING_BLOCK)))) {
    console.log('FoundEvent', event)
    // t.pass('EVM-Provider:http:iterator FoundEvent')
    if (event?.blockHeight) {
      t.is(event.blockHeight > BigInt(START_TESTING_BLOCK), true, 'BlockHeight is greater than start block')
    }
    // console.log('handledEvent', event?.blockHeight)
  }
  t.pass('Data Synced.')

  // check the height
})

// export { getTestEthersProvider, getTestViemProvider }
