import { RailgunLogicV1, RailgunSmartWalletV2, RailgunSmartWalletV21 } from '@railgun-reloaded/contract-abis'
import { skip, test } from 'brittle'

import { NetworkName } from '../src/globals/constants.js'
import { getAbiForNetworkBlockRange } from '../src/utils/abi-helper.js'
skip('getAbiForNetworkBlockRange - returns correct ABIs for Ethereum within range', async (t) => {
  // V1 Range
  const abis0 = getAbiForNetworkBlockRange(
    NetworkName.Ethereum,
    0n,
    15964145n - 1n
  )
  t.is(abis0.length, 1)
  t.is(abis0[0], RailgunLogicV1)
  // V1 -> V2 range
  const abis1 = getAbiForNetworkBlockRange(
    NetworkName.Ethereum,
    15964145n - 100n,
    15964145n + 100n
  )
  t.is(abis1.length, 1)
  t.is(abis1[0], RailgunSmartWalletV2)

  // V2 -> V21 range
  const abis2 = getAbiForNetworkBlockRange(
    NetworkName.Ethereum,
    16714777n - 100n,
    16714777n + 100n
  )
  t.is(abis2.length, 1)
  t.is(abis2[0], RailgunSmartWalletV21)
})

skip('getAbiForNetworkBlockRange - returns multiple ABIs when range spans upgrades', async (t) => {
  const abis = getAbiForNetworkBlockRange(
    NetworkName.Ethereum,
    15964145n,
    16714777n
  )
  t.is(abis.length, 2)
  t.is(abis[0], RailgunSmartWalletV2)
  t.is(abis[1], RailgunSmartWalletV21)
})

test('getAbiForNetworkBlockRange - throws when start > end', async (t) => {
  try {
    getAbiForNetworkBlockRange(NetworkName.Ethereum, 1000n, 500n)
    t.fail('Should have thrown an error')
  } catch (error) {
    t.is((error as Error).message, 'Start block cannot be greater than end block')
  }
})

test('getAbiForNetworkBlockRange - throws for unsupported network', async (t) => {
  try {
    getAbiForNetworkBlockRange('UnsupportedNetwork' as NetworkName, 0n, 1000n)
    t.fail('Should have thrown an error')
  } catch (error) {
    t.is((error as Error).message, 'No network upgrades found for UnsupportedNetwork')
  }
})

skip('getAbiForNetworkBlockRange - throws when no ABIs in range', async (t) => {
  try {
    // Using a very future block range that shouldn't contain any upgrades
    getAbiForNetworkBlockRange(NetworkName.Ethereum, 99999999n, 999999999n)
    t.fail('Should have thrown an error')
  } catch (error) {
    t.is((error as Error).message.startsWith('No ABI data found for'), true)
  }
})
