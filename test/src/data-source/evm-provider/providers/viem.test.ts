import { RailgunSmartWalletV21 } from '@railgun-reloaded/contract-abis'
import { test } from 'brittle'
import dotenv from 'dotenv'

import { RAILGUN_SCAN_START_BLOCK_V2, ViemProvider } from '../../../../../src/data-source/evm-provider/providers/viem'

dotenv.config()

const TEST_RPC_URL = process.env['TEST_RPC_URL_HTTPS']
// const TEST_RPC_URL_WSS = process.env['TEST_RPC_URL_WSS']

test('Viem-Provider:iterator https', async (t) => {
  // setup
  const TEST_CONTRACT_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9'

  if (typeof TEST_RPC_URL === 'undefined') {
    t.fail('TEST_RPC_URL is not set')
  }
  const provider = new ViemProvider(
    TEST_RPC_URL!,
    TEST_CONTRACT_ADDRESS,
    RailgunSmartWalletV21,
    { chainId: 1, ws: false }
  )
  await provider.initializedPromise
  provider.on('newHead', (block) => {
    t.pass(`http:iterator New block: ${block}`)
  })
  setTimeout(async () => {
    await provider.destroy()
  }, 20_000)
  for await (const event of provider) {
    t.pass(`http:iterator FoundEvent: ${event.fragment.name}`)
  }
})

// test('Viem-Provider:iterator wss', async (t) => {
//   // setup
//   const TEST_CONTRACT_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9'

//   if (typeof TEST_RPC_URL_WSS === 'undefined') {
//     t.fail('TEST_RPC_URL_WSS is not set')
//   }
//   const provider = new ViemProvider(
//     TEST_RPC_URL_WSS!,
//     TEST_CONTRACT_ADDRESS,
//     ABIRailgunSmartWallet,
//     { chainId: 1, ws: true }
//   )

//   await provider.awaitInitialized()

//   provider.on('newHead', (block) => {
//     t.pass(`wss:iterator New block: ${block}`)
//   })
//   setTimeout(async () => {
//     await provider.destroy()
//   }, 20_000)
//   for await (const event of provider) {
//     // console.log('FoundEvent', event.fragment.name)
//     t.pass(`wss:iterator FoundEvent: ${event.fragment.name}`)
//   }
// })

test('Viem-Provider:from https with scanOptions', async (t) => {
  t.timeout(120_000)
  // setup
  const TEST_CONTRACT_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9'

  if (typeof TEST_RPC_URL === 'undefined') {
    t.fail('TEST_RPC_URL is not set')
  }
  const provider = new ViemProvider(
    TEST_RPC_URL!,
    TEST_CONTRACT_ADDRESS,
    RailgunSmartWalletV21,
    { chainId: 1, ws: false }
  )
  await provider.initializedPromise

  // provider.on('newHead', (block) => {
  //   t.pass(`https:from New block: ${block}`)
  // })
  const scanOptions = {
    startBlock: RAILGUN_SCAN_START_BLOCK_V2,
    endBlock: RAILGUN_SCAN_START_BLOCK_V2 + 5_000n,
  }
  for await (const event of provider.from(scanOptions)) {
    t.pass(`wss:from FoundEvents: ${event.length}`)
  }
  await provider.destroy()
})

// test('Viem-Provider:from wss with scanOptions', async (t) => {
//   t.timeout(120_000)
//   // setup
//   const TEST_CONTRACT_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9'

//   if (typeof TEST_RPC_URL_WSS === 'undefined') {
//     t.fail('TEST_RPC_URL_WSS is not set')
//   }
//   const provider = new ViemProvider(
//     TEST_RPC_URL_WSS!,
//     TEST_CONTRACT_ADDRESS,
//     ABIRailgunSmartWallet,
//     { chainId: 1, ws: true }
//   )
//   await provider.initializedPromise
//   // provider.on('newHead', (block) => {
//   //   t.pass(`wss:from New block: ${block}`)
//   // })
//   const scanOptions = {
//     startBlock: RAILGUN_SCAN_START_BLOCK_V2,
//     endBlock: RAILGUN_SCAN_START_BLOCK_V2 + 5_000n,
//   }
//   for await (const event of provider.from(scanOptions)) {
//     t.pass(`wss:from FoundEvents: ${event.length}`)
//   }
//   await provider.destroy()
// })

test('Viem-Provider:chainIdToNetwork', async (t) => {
  // setup
  const TEST_CONTRACT_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9'
  if (typeof TEST_RPC_URL === 'undefined') {
    t.fail('TEST_RPC_URL is not set')
  }

  const provider = new ViemProvider(
    TEST_RPC_URL!,
    TEST_CONTRACT_ADDRESS,
    RailgunSmartWalletV21,
    { chainId: 1, ws: false }
  )

  // Test supported chain IDs
  t.is(provider.chainIdToNetwork(1).name, 'Ethereum')
  t.is(provider.chainIdToNetwork(5).name, 'Arbitrum One')
  t.is(provider.chainIdToNetwork(56).name, 'BNB Smart Chain')
  t.is(provider.chainIdToNetwork(137).name, 'Polygon')

  // Test unsupported chain ID
  console.log('Should throw an error for unsupported chain ID')
  t.test('Should throw an error for unsupported chain ID', (a) => {
    try {
      provider.chainIdToNetwork(999)
      a.fail('Should have thrown an error for unsupported chain ID')
    } catch (error) {
      a.pass('Error Thrown: \'Unsupported chain ID: 999\'')
    }
  })
  // try {
  //   provider.chainIdToNetwork(999)
  //   t.fail('Should have thrown an error for unsupported chain ID')
  // } catch (error) {
  //   t.pass('Error Thrown: \'Unsupported chain ID: 999\'')
  // }

  await provider.destroy()
})
