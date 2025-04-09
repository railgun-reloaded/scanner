import { test } from 'brittle'
import dotenv from 'dotenv'

import { ABIRailgunSmartWallet } from '../../../../../src/abi/abi'
import { EthersProvider, RAILGUN_SCAN_START_BLOCK_V2 } from '../../../../../src/data-source/evm-provider/providers/ethers'

dotenv.config()

const TEST_RPC_URL = process.env['TEST_RPC_URL_HTTPS']
const TEST_RPC_URL_WSS = process.env['TEST_RPC_URL_WSS']

test('Ethers-Provider:iterator https', async (t) => {
  // setup
  const TEST_CONTRACT_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9'

  if (typeof TEST_RPC_URL === 'undefined') {
    t.fail('TEST_RPC_URL is not set')
  }
  const provider = new EthersProvider(
    TEST_RPC_URL!,
    TEST_CONTRACT_ADDRESS,
    ABIRailgunSmartWallet,
    { chainId: 1, ws: false }
  )
  await provider.initializedPromise

  provider.on('newHead', (block) => {
    t.pass(`New block: ${block}`)
  })
  setTimeout(async () => {
    await provider.destroy()
  }, 20_000)
  for await (const event of provider) {
    t.pass(`FoundEvent: ${event.fragment.name}`)
  }
})

test('Ethers-Provider:iterator wss', async (t) => {
  // setup
  const TEST_CONTRACT_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9'

  if (typeof TEST_RPC_URL_WSS === 'undefined') {
    t.fail('TEST_RPC_URL_WSS is not set')
  }
  const provider = new EthersProvider(
    TEST_RPC_URL_WSS!,
    TEST_CONTRACT_ADDRESS,
    ABIRailgunSmartWallet,
    { chainId: 1, ws: true }
  )
  await provider.initializedPromise
  provider.on('newHead', (block) => {
    t.pass(`New block: ${block}`)
  })
  setTimeout(async () => {
    await provider.destroy()
  }, 20_000)
  for await (const event of provider) {
    // console.log('FoundEvent', event.fragment.name)
    t.pass(`FoundEvent: ${event.fragment.name}`)
  }
})

test('Ethers-Provider:from https with scanOptions', async (t) => {
  t.timeout(120_000)
  // setup
  const TEST_CONTRACT_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9'

  if (typeof TEST_RPC_URL === 'undefined') {
    t.fail('TEST_RPC_URL is not set')
  }
  const provider = new EthersProvider(
    TEST_RPC_URL!,
    TEST_CONTRACT_ADDRESS,
    ABIRailgunSmartWallet,
    { chainId: 1, ws: false }
  )
  await provider.initializedPromise

  provider.on('newHead', (block) => {
    t.pass(`New block: ${block}`)
  })
  const scanOptions = {
    startBlock: RAILGUN_SCAN_START_BLOCK_V2,
    endBlock: RAILGUN_SCAN_START_BLOCK_V2 + 50_000n,
  }
  for await (const event of provider.from(scanOptions)) {
    t.pass(`FoundEvents: ${event.length}`)
  }
  await provider.destroy()
})

test('Ethers-Provider:from wss with scanOptions', async (t) => {
  t.timeout(120_000)
  // setup
  const TEST_CONTRACT_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9'

  if (typeof TEST_RPC_URL_WSS === 'undefined') {
    t.fail('TEST_RPC_URL_WSS is not set')
  }
  const provider = new EthersProvider(
    TEST_RPC_URL_WSS!,
    TEST_CONTRACT_ADDRESS,
    ABIRailgunSmartWallet,
    { chainId: 1, ws: true }
  )
  await provider.initializedPromise
  provider.on('newHead', (block) => {
    t.pass(`New block: ${block}`)
  })
  const scanOptions = {
    startBlock: RAILGUN_SCAN_START_BLOCK_V2,
    endBlock: RAILGUN_SCAN_START_BLOCK_V2 + 50_000n,
  }
  for await (const event of provider.from(scanOptions)) {
    t.pass(`FoundEvents: ${event.length}`)
  }
  await provider.destroy()
})
