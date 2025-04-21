import { RailgunSmartWalletV2, RailgunSmartWalletV21 } from '@railgun-reloaded/contract-abis'
// use the abis from ../../abi
import { Interface } from 'ethers'

import { NetworkName, RailgunProxyDeploymentBlock } from '../globals/constants'

type NetworkUpgrade = {
  blockHeight: bigint
  abi: any,
  eventTopics: string[]
}

/**
 * Network upgrade blocks
 * @param abi - The ABI to get event topic hashes for
 * @returns - An array of event topic hashes
 */
const getEventTopicHashesForAbi = (abi: any): string[] => {
  const iface = new Interface(abi)
  const toInclude = [
    'Nullified',
    'Shield',
    'Transact',
    'Unshield',
    'CommitmentBatch',
    'GeneratedCommitmentBatch',
    'Nullifiers'
  ]
  const eventNames: string[] = abi.filter((item: any) => item.type === 'event' && toInclude.includes(item.name)).map((item: any) => item.name)
  const eventTopicHashes = eventNames.map((eventName) => iface.getEvent(eventName)?.topicHash.toLowerCase() ?? undefined)
  console.log('EventNames', eventNames, eventTopicHashes.length)
  // remove undefined
  // TODO: typefix this
  const output = eventTopicHashes.filter((topic: any) => topic !== undefined) as string[]
  // filter out undefined
  if (output.length === 0) {
    return []
  }
  return output
}

const NETWORK_UPGRADE_BLOCKS: Record<NetworkName, NetworkUpgrade[]> = {
  // Add your network deployment blocks here
  // Example: 'networkName': BigInt(deploymentBlockNumber),
  [NetworkName.Ethereum]: [
    {
      blockHeight: BigInt(RailgunProxyDeploymentBlock[NetworkName.Ethereum]) - 1n,
      abi: RailgunSmartWalletV2,
      eventTopics: getEventTopicHashesForAbi(RailgunSmartWalletV2)
    },
    // {
    //   blockHeight: 15964145n,
    //   abi: RailgunSmartWalletV2,
    //   eventTopics: getEventTopicHashesForAbi(RailgunSmartWalletV2)
    // },
    {
      blockHeight: 16714777n,
      abi: RailgunSmartWalletV21,
      eventTopics: getEventTopicHashesForAbi(RailgunSmartWalletV21)
    },
  ],
  [NetworkName.BNBChain]: [],
  [NetworkName.Polygon]: [],
  [NetworkName.Arbitrum]: [],
  [NetworkName.EthereumSepolia]: [],
  [NetworkName.PolygonAmoy]: [],
  [NetworkName.Hardhat]: [],
  [NetworkName.EthereumRopsten_DEPRECATED]: [],
  [NetworkName.EthereumGoerli_DEPRECATED]: [],
  [NetworkName.ArbitrumGoerli_DEPRECATED]: [],
  [NetworkName.PolygonMumbai_DEPRECATED]: []
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
  // use for loop to gather the proper abis
  const relevantAbis = []

  for (let i = 0; i < networkUpgrades.length; i++) {
    const upgrade = networkUpgrades[i]
    const nextUpgrade = networkUpgrades[i + 1]
    if (!upgrade) {
      continue
    }
    // If the upgrade block is within or before our range
    if (upgrade.blockHeight <= end) {
      // If this is the last upgrade or the next upgrade is after our start
      if (!nextUpgrade || nextUpgrade.blockHeight >= end) {
        relevantAbis.push(upgrade)
      }
    }
  }

  if (relevantAbis.length === 0) {
    throw new Error(`No ABI data found for ${networkName} between blocks ${start} and ${end}`)
  }

  return relevantAbis
  // const filteredUpgrades = networkUpgrades.filter((upgrade: NetworkUpgrade) => {
  //   return upgrade.blockHeight <= start && upgrade.blockHeight <= end
  // })

  // if (filteredUpgrades.length === 0) {
  //   throw new Error(`No ABI data found for ${networkName} between blocks ${start} and ${end}`)
  // }

  // return filteredUpgrades.map((upgrade: NetworkUpgrade) => upgrade.abi)
}

export type { NetworkUpgrade }
export { getAbiForNetworkBlockRange }
