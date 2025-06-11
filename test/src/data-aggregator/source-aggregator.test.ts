// import { RailgunSmartWalletV21 } from '@railgun-reloaded/contract-abis'
// import { solo, test } from 'brittle'
// import dotenv from 'dotenv'

// import { SourceAggregator } from '../../../src/data-aggregator/source-aggregator.js'
// import { EthersProvider } from '../../../src/data-source/evm-provider/providers/ethers.js'
// import { ViemProvider } from '../../../src/data-source/evm-provider/providers/viem.js'
// import { EVMProvider } from '../../../src/data-source/evm-provider.js'
// import { SubsquidProvider } from '../../../src/data-source/graph-provider/subsquid.js'
// import { GraphProvider } from '../../../src/data-source/graph-provider.js'
// import { NetworkName, RailgunProxyContract, RailgunProxyDeploymentBlock } from '../../../src/globals/constants.js'

// dotenv.config()
// const TEST_RPC_URL = process.env['TEST_RPC_URL_HTTPS']
// // 'http://127.0.0.1:8545'//
// const TEST_CONTRACT_ADDRESS = RailgunProxyContract[NetworkName.Ethereum]
// const TEST_RPC_CHUNK_SIZE = process.env['TEST_RPC_CHUNK_SIZE'] ?? '500'
// const TEST_IS_CI = Boolean(process.env['TEST_IS_CI']) ?? false
// if (TEST_IS_CI) {
//   RailgunProxyDeploymentBlock[NetworkName.Ethereum] = 22191561
// }
// const START_TESTING_BLOCK = RailgunProxyDeploymentBlock[NetworkName.Ethereum]

// /**
//  * Test Ethers Provider
//  * @returns EVM Provider
//  */
// // NOTE: be sure to destroy all datasources to close out the test.
// // NOTE: be sure to destroy all datasources to close out the test.
// // NOTE: be sure to destroy all datasources to close out the test.
// // NOTE: be sure to destroy all datasources to close out the test.
// const getTestEthersProvider = () => {
//   if (typeof TEST_RPC_URL === 'undefined') {
//     throw new Error('TEST_RPC_URL is not set')
//   }
//   const provider = new EthersProvider(
//     NetworkName.Ethereum,
//     TEST_RPC_URL!,
//     TEST_CONTRACT_ADDRESS,
//     RailgunSmartWalletV21,
//     { chainId: 1, ws: false, chunkSize: BigInt(TEST_RPC_CHUNK_SIZE) }
//   )

//   const datasource = new EVMProvider(provider)

//   return { provider, datasource, }
// }
// /**
//  *  Test Viem Provider
//  * @returns EVM Provider
//  */
// const getTestViemProvider = () => {
//   if (typeof TEST_RPC_URL === 'undefined') {
//     throw new Error('TEST_RPC_URL is not set')
//   }

//   const provider = new ViemProvider(
//     NetworkName.Ethereum,
//     TEST_RPC_URL!,
//     TEST_CONTRACT_ADDRESS as `0x${string}`,
//     RailgunSmartWalletV21,
//     { chainId: 1, ws: false, chunkSize: BigInt(TEST_RPC_CHUNK_SIZE) }
//   )
//   const datasource = new EVMProvider(provider)

//   return { provider, datasource, }
// }

// /**
//  * Test Subsquid Provider
//  * @returns Graph Provider
//  */
// const getTestGraphProvider = () => {
//   const provider = new SubsquidProvider(NetworkName.Ethereum)
//   const datasource = new GraphProvider(provider)
//   return { provider, datasource }
// }

// test('Source Aggregator:Full Sync', async () => {
//   test('EthersProvider: Source should sync from zero state given a single evm provider', async (t) => {
//     // scenario 0. NO STORED DATA. BUILD ALL
//     t.timeout(390_000)
//     const { datasource, provider } = getTestEthersProvider()
//     // await datasource.initialize()
//     // comes from provider, data source is not an emitter.

//     const aggregator = new SourceAggregator([datasource as any], './ethersstore.rgblock')

//     provider.on('newHead', (blockNumber) => {
//       t.pass(`http:iterator New block: ${blockNumber}`)
//     })
//     // START BLOCK
//     await aggregator.initialize()
//     await aggregator.sync()
//     // const START_TESTING_BLOCK = RailgunProxyDeploymentBlock[NetworkName.Ethereum]
//     // Kills source to exit test.

//     setTimeout(async () => {
//       await datasource.destroy()
//     }, 5_000)
//     for await (const event of (await aggregator.read(BigInt(START_TESTING_BLOCK)))) {
//       console.log('FoundEvent', event)
//       // t.pass('EVM-Provider:http:iterator FoundEvent')
//       if (event?.blockHeight) {
//         t.is(event.blockHeight > BigInt(START_TESTING_BLOCK), true)
//       }
//       // console.log('handledEvent', event?.blockHeight)
//     }
//     t.pass('Data Synced.')

//     // check the height
//   })

//   test('ViemProvider: Source should sync from zero state given a single evm provider', async (t) => {
//     // scenario 0. NO STORED DATA. BUILD ALL
//     t.timeout(390_000)
//     const { datasource, provider } = getTestViemProvider()
//     // await datasource.initialize()
//     // comes from provider, data source is not an emitter.

//     const aggregator = new SourceAggregator([datasource as any], './viemstore.rgblock')

//     provider.on('newHead', (blockNumber) => {
//       t.pass(`http:iterator New block: ${blockNumber}`)
//     })
//     // START BLOCK
//     await aggregator.initialize()
//     await aggregator.sync()
//     // Kills source to exit test.
//     console.log('Finished Syncing')
//     setTimeout(async () => {
//       console.log('Destroying datasource')
//       await datasource.destroy()
//     }, 5_000)
//     for await (const event of (await aggregator.read(BigInt(START_TESTING_BLOCK)))) {
//       console.log('FoundEvent', event)
//       // t.pass('EVM-Provider:http:iterator FoundEvent')
//       if (event?.blockHeight) {
//         t.is(event.blockHeight > BigInt(START_TESTING_BLOCK), true, 'BlockHeight is greater than start block')
//       }
//       // console.log('handledEvent', event?.blockHeight)
//     }
//     t.pass('Data Synced.')

//     // check the height
//   })

//   solo('SubsquidProvider: Source should sync from zero state given a single evm provider', async (t) => {
//     // scenario 0. NO STORED DATA. BUILD ALL
//     t.timeout(390_000)
//     const { datasource, provider } = getTestGraphProvider()
//     // await datasource.initialize()
//     // comes from provider, data source is not an emitter.
//     const aggregator = new SourceAggregator([datasource as any], './subsquidstore.rgblock', true)

//     provider.on('newHead', (blockNumber) => {
//       t.pass(`http:iterator New block: ${blockNumber}`)
//     })
//     // START BLOCK
//     await aggregator.initialize()
//     await aggregator.sync()
//     // Kills source to exit test.
//     console.log('Finished Syncing')
//     setTimeout(async () => {
//       console.log('Destroying datasource')
//       await datasource.destroy()
//     }, 5_000)
//     // let blockHeightIncreased = false
//     for await (const event of (await aggregator.read(BigInt(START_TESTING_BLOCK)))) {
//       // console.log('FoundEvent', event)
//       // t.pass('EVM-Provider:http:iterator FoundEvent')
//       if (event?.blockHeight) {
//         if (event.blockHeight > BigInt(START_TESTING_BLOCK)) {
//           t.pass('BlockHeight is greater than start block')
//           break
//         }

//         // t.is(event.blockHeight > BigInt(START_TESTING_BLOCK), true, 'BlockHeight is greater than start block')
//       }
//       // console.log('handledEvent', event?.blockHeight)
//     }
//     t.pass('Data Synced.')
//   })
// })
// // export { getTestEthersProvider, getTestViemProvider }
