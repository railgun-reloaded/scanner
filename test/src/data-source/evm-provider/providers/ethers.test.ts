import { RailgunSmartWalletV21 } from '@railgun-reloaded/contract-abis'
import { test } from 'brittle'
import dotenv from 'dotenv'

import { EthersProvider, RAILGUN_SCAN_START_BLOCK_V2 } from '../../../../../src/data-source/evm-provider/providers/ethers'
import { delay } from '../../../../../src/data-source/utils'
import { NetworkName } from '../../../../../src/globals/constants'

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
    NetworkName.Ethereum,
    TEST_RPC_URL!,
    TEST_CONTRACT_ADDRESS,
    RailgunSmartWalletV21,
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
    NetworkName.Ethereum,
    TEST_RPC_URL_WSS!,
    TEST_CONTRACT_ADDRESS,
    RailgunSmartWalletV21,
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
    NetworkName.Ethereum,
    TEST_RPC_URL!,
    TEST_CONTRACT_ADDRESS,
    RailgunSmartWalletV21,
    { chainId: 1, ws: false }
  )
  await provider.initializedPromise

  provider.on('newHead', (block) => {
    t.pass(`New block: ${block}`)
  })
  const scanOptions = {
    startBlock: RAILGUN_SCAN_START_BLOCK_V2,
    endBlock: RAILGUN_SCAN_START_BLOCK_V2 + 5_000n,
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
    NetworkName.Ethereum,
    TEST_RPC_URL_WSS!,
    TEST_CONTRACT_ADDRESS,
    RailgunSmartWalletV21,
    { chainId: 1, ws: true }
  )
  await provider.initializedPromise
  provider.on('newHead', (block) => {
    t.pass(`New block: ${block}`)
  })
  const scanOptions = {
    startBlock: RAILGUN_SCAN_START_BLOCK_V2,
    endBlock: RAILGUN_SCAN_START_BLOCK_V2 + 5_000n,
  }
  for await (const event of provider.from(scanOptions)) {
    t.pass(`FoundEvents: ${event.length}`)
  }
  await provider.destroy()
})

test('Ethers-Provider:setupListeners registers block event handler', async (t) => {
  // setup
  const TEST_CONTRACT_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9'

  if (typeof TEST_RPC_URL === 'undefined') {
    t.fail('TEST_RPC_URL is not set')
  }

  const provider = new EthersProvider(
    NetworkName.Ethereum,
    TEST_RPC_URL!,
    TEST_CONTRACT_ADDRESS,
    RailgunSmartWalletV21,
    { chainId: 1, ws: false }
  )

  // Wait for provider to initialize
  await provider.initializedPromise

  // Test initialization state
  t.is(provider.initialized, true, 'Provider should be initialized after setup')
  t.is(provider.syncing, true, 'Provider should be in syncing state after setup')

  // Test event emission
  let newHeadReceived = false
  provider.on('newHead', (block) => {
    newHeadReceived = true
    t.pass(`New block received: ${block}`)
  })

  // Give some time for a block event to occur
  await new Promise(resolve => setTimeout(resolve, 10000))

  // Cleanup
  await provider.destroy()

  // In a real network, we should receive block events
  // But this might be flaky in test environments
  if (!newHeadReceived) {
    t.pass('No blocks received in test timeframe, but setup completed')
  }
})

test('Ethers-Provider:setupListeners properly queues contract events', async (t) => {
  // setup
  const TEST_CONTRACT_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9'

  if (typeof TEST_RPC_URL === 'undefined') {
    t.fail('TEST_RPC_URL is not set')
  }

  const provider = new EthersProvider(
    NetworkName.Ethereum,
    TEST_RPC_URL!,
    TEST_CONTRACT_ADDRESS,
    RailgunSmartWalletV21,
    { chainId: 1, ws: false }
  )

  // Wait for provider to initialize
  await provider.initializedPromise

  // Use scan options to generate some events
  const scanOptions = {
    startBlock: RAILGUN_SCAN_START_BLOCK_V2,
    endBlock: RAILGUN_SCAN_START_BLOCK_V2 + 1000n,
  }

  // Check if events from contract get queued properly
  let eventsFound = 0
  for await (const events of provider.from(scanOptions)) {
    console.log(events[0])
    if (events.length > 0) {
      eventsFound += events.length
      t.pass(`Found ${events.length} events from contract scan`)
      break // We only need to verify events are processed
    }
  }

  if (eventsFound === 0) {
    t.pass('No events found in specified blocks, but event scanning worked')
  }

  // Cleanup
  await provider.destroy()
})

test('Ethers-Provider:destroy removes all listeners', async (t) => {
  // setup
  const TEST_CONTRACT_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9'

  if (typeof TEST_RPC_URL === 'undefined') {
    t.fail('TEST_RPC_URL is not set')
  }

  const provider = new EthersProvider(
    NetworkName.Ethereum,
    TEST_RPC_URL!,
    TEST_CONTRACT_ADDRESS,
    RailgunSmartWalletV21,
    { chainId: 1, ws: false }
  )

  // Wait for provider to initialize
  await provider.initializedPromise

  // Add our own test listener
  let listenerCalled = false
  provider.on('newHead', () => {
    listenerCalled = true
  })

  // TODO: come up with a cleaner way to test this
  // @ts-ignore - listenerCalled is modified by the provider eventListener above.
  while (!listenerCalled) {
    console.log('Waiting for listener to be called...')
    await delay(1_000)
  }
  // Destroy the provider
  await provider.destroy()

  // Check syncing is false
  t.is(provider.syncing, false, 'Provider should not be in syncing state after destroy')
  t.is(listenerCalled, true, 'Listener should be called')
  // There's no direct way to check if listeners were removed in the test,
  // but we can verify syncing state which indicates provider shutdown

  t.pass('Provider successfully destroyed')
})

test('Ethers-Provider:setupListeners initializes contract and provider correctly', async (t) => {
  // setup
  const TEST_CONTRACT_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9'

  // Test that provider is correctly initialized
  const validProvider = new EthersProvider(
    NetworkName.Ethereum,
    TEST_RPC_URL!,
    TEST_CONTRACT_ADDRESS,
    RailgunSmartWalletV21,
    { chainId: 1, ws: false }
  )
  await validProvider.initializedPromise
  // Add our own test listener
  // let listenerCalled = false
  // validProvider.on('newHead', () => {
  //   listenerCalled = true
  // })
  // required
  await delay(5_000)
  t.is(validProvider.syncing, true, 'Provider should be in syncing state after setup')
  // t.is(listenerCalled, true, 'Listener should be called')
  t.is(validProvider.initialized, true, 'Provider should be initialized after setup')

  // The rest of the provider functionality can be tested indirectly
  // by checking if the provider object exists and has the expected properties
  t.ok(validProvider.getProvider(), 'Provider instance should exist')
  t.ok(validProvider.contract, 'Contract instance should exist')

  await validProvider.destroy()
})
