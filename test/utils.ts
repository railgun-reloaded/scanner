import { RailgunSmartWalletV21 } from '@railgun-reloaded/contract-abis'
import dotenv from 'dotenv'

import { NetworkName } from '../src'
import { EVMProvider } from '../src/data-source/evm-provider'
import { EthersProvider } from '../src/data-source/evm-provider/providers/ethers'
dotenv.config()
const TEST_RPC_URL = process.env['TEST_RPC_URL_HTTPS']
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

export { getTestEVMProvider }
