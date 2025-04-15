import { RailgunLogicV1, RailgunSmartWalletV2, RailgunSmartWalletV21 } from '@railgun-reloaded/contract-abis'

import { NetworkName, RailgunProxyDeploymentBlock } from '../globals/constants'

type NetworkUpgrade = {
  blockHeight: bigint
  abi: any
}

const NETWORK_UPGRADE_BLOCKS = {
  // Add your network deployment blocks here
  // Example: 'networkName': BigInt(deploymentBlockNumber),
  [NetworkName.Ethereum]: [
    {
      blockHeight: BigInt(RailgunProxyDeploymentBlock[NetworkName.Ethereum]),
      abi: RailgunLogicV1
    },
    {
      blockHeight: 15964145n,
      abi: RailgunSmartWalletV2
    },
    {
      blockHeight: 16714777n,
      abi: RailgunSmartWalletV21
    },
  ],
}

/**
 * Get the ABI for a given network and block range.
 * @param networkName - The name of the network
 * @param start - start of block range
 * @param end - end of block range
 * @returns - an array of ABI data
 */
const getAbiForNetworkBlockRange = (networkName: NetworkName, start: bigint, end: bigint) => {
  // check start end are valid.
  if (start > end) {
    throw new Error('Start block cannot be greater than end block')
  }
  // TODO: fix this typeshit
  // @ts-ignore
  const networkUpgrades = NETWORK_UPGRADE_BLOCKS[networkName]
  if (!networkUpgrades) {
    throw new Error(`No network upgrades found for ${networkName}`)
  }

  const filteredUpgrades = networkUpgrades.filter((upgrade: NetworkUpgrade) => {
    return start >= upgrade.blockHeight && end >= upgrade.blockHeight
  })

  if (filteredUpgrades.length === 0) {
    throw new Error(`No ABI data found for ${networkName} between blocks ${start} and ${end}`)
  }

  return filteredUpgrades.map((upgrade: NetworkUpgrade) => upgrade.abi)
}

export { getAbiForNetworkBlockRange }
