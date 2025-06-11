// import {
//   /* hook, skip, */
//   skip,
//   test,
//   // test
// } from 'brittle'
// import dotenv from 'dotenv'

// import { ABIRailgunSmartWallet } from '../../../../src/abi/abi'
// import { EVMProvider } from '../../../../src/data-source'
// import { EthersProvider, RAILGUN_SCAN_START_BLOCK_V2 } from '../../../../src/data-source/evm-provider/providers/ethers'
// import { delay } from '../../../../src/data-source/utils'
// import { NetworkName } from '../../../../src/globals/constants'
// const TEST_CONTRACT_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9'
// dotenv.config()
// const TEST_RPC_URL = process.env['TEST_RPC_URL_HTTPS']
// const TEST_RPC_CHUNK_SIZE = process.env['TEST_RPC_CHUNK_SIZE'] ?? '500'

// /**
//  * Test EVM Provider
//  * @returns EVM Provider
//  */
// const getTestEVMProvider = (): { provider: EthersProvider; datasource: EVMProvider } => {
//   if (typeof TEST_RPC_URL === 'undefined') {
//     throw new Error('TEST_RPC_URL is not set')
//   }
//   const provider = new EthersProvider(
//     NetworkName.Ethereum,
//     TEST_RPC_URL!,
//     TEST_CONTRACT_ADDRESS,
//     ABIRailgunSmartWallet,
//     { chainId: 1, ws: false, chunkSize: BigInt(TEST_RPC_CHUNK_SIZE) }
//   )
//   const datasource = new EVMProvider(provider)
//   return { provider, datasource }
// }

// test('EVM-Provider:EthersProvider:read (iterator)', async (t) => {
//   t.timeout(30_000)
//   if (typeof TEST_RPC_URL === 'undefined') {
//     t.fail('TEST_RPC_URL is not set')
//   }
//   // const provider = new EthersProvider(
//   //   TEST_RPC_URL!,
//   //   TEST_CONTRACT_ADDRESS,
//   //   ABIRailgunSmartWallet,
//   //   { chainId: 1, ws: false }
//   // )
//   // const datasource = new EVMProvider(provider)

//   const { datasource, provider } = getTestEVMProvider()
//   await datasource.initialize()

//   // comes from provider, data source is not an emitter.
//   provider.on('newHead', (blockNumber) => {
//     t.pass(`http:iterator New block: ${blockNumber}`)
//   })

//   setTimeout(async () => {
//     await datasource.destroy()
//   }, 15_000)

//   for await (const event of datasource.read()) {
//     // console.log('FoundEvent', event)
//     t.pass('EVM-Provider:http:iterator FoundEvent: }' + event)
//   }

//   t.is(datasource.syncing, false)
//   // datasource head is only updated when event is found. so it might not end up getting to scanOptions.endBlock.
//   t.is(datasource.head > 0n, true, 'head is greater than 0')

//   // datasource should properly clean up.
//   t.is(datasource.events.length, 0, 'events length is 0')
//   t.is(datasource.syncing, false, 'syncing is false')
//   t.absent(datasource.provider, 'provider is destroyed')
// })

// skip('EVM-Provider:EthersProvider:from', async (t) => {
//   if (typeof TEST_RPC_URL === 'undefined') {
//     t.fail('TEST_RPC_URL is not set')
//   }
//   const { datasource, provider } = getTestEVMProvider()

//   await datasource.initialize()

//   // comes from provider, data source is not an emitter.
//   provider.on('newHead', (blockNumber) => {
//     t.pass(`http:iterator New block: ${blockNumber}`)
//   })
//   const scanOptions = {
//     startBlock: RAILGUN_SCAN_START_BLOCK_V2,
//     endBlock: RAILGUN_SCAN_START_BLOCK_V2 + 5_000n,
//   }
//   for await (const event of datasource.from(scanOptions)) {
//     // console.log('FoundEvent', event)
//     // con
//     t.pass(`EVM-Provider:http:iterator FoundEvent: ${event?.blockHeight}`)
//   }

//   // setTimeout(async () => {
//   await datasource.destroy()
//   // }, 20_000)
//   // await delay(25_000)
//   t.is(datasource.syncing, false)
//   // datasource head is only updated when event is found. so it might not end up getting to scanOptions.endBlock.
//   t.is(datasource.head > 0n, true, 'head is greater than 0')

//   // datasource should properly clean up.
//   t.is(datasource.events.length, 0, 'events length is 0')
//   t.is(datasource.syncing, false, 'syncing is false')
//   t.absent(datasource.provider, 'provider is destroyed')
// })

// test('EVM-Provider:EthersProvider:destroy', async (t) => {
//   if (typeof TEST_RPC_URL === 'undefined') {
//     t.fail('TEST_RPC_URL is not set')
//   }
//   const { datasource, provider } = getTestEVMProvider()

//   await datasource.initialize()

//   // comes from provider, data source is not an emitter.
//   provider.on('newHead', (blockNumber) => {
//     t.pass(`http:iterator New block: ${blockNumber}`)
//   })

//   await delay(5_000)

//   await datasource.destroy()
//   t.is(datasource.syncing, false)
//   t.is(datasource.syncing, false, 'syncing is false')
//   t.absent(datasource.provider, 'provider is destroyed')
// })
