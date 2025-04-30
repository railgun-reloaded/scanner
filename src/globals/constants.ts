// File to define all constant/shared values and functions
const SCAN_CHUNKS = 1000n
const EVENTS_SCAN_TIMEOUT = 5000
const SCAN_TIMEOUT_ERROR_MESSAGE = 'getLogs request timed out after 5 seconds.'

// TODO: map out blockranges for v2 scanning across all networks
const RAILGUN_SCAN_START_BLOCK_V2 = 16076000n

enum NetworkName {
  // Mainnets
  Ethereum = 'Ethereum',
  BNBChain = 'BNB_Chain',
  Polygon = 'Polygon',
  Arbitrum = 'Arbitrum',

  // Testnets
  EthereumSepolia = 'Ethereum_Sepolia',
  PolygonAmoy = 'Polygon_Amoy',

  // Dev only
  Hardhat = 'Hardhat',

  // Deprecated
  EthereumRopsten_DEPRECATED = 'Ethereum_Ropsten',
  EthereumGoerli_DEPRECATED = 'Ethereum_Goerli',
  ArbitrumGoerli_DEPRECATED = 'Arbitrum_Goerli',
  PolygonMumbai_DEPRECATED = 'Polygon_Mumbai',
}

const SubsquidNetworkName: Record<NetworkName, string> = {
  [NetworkName.Ethereum]: 'ethereum',
  [NetworkName.BNBChain]: 'bsc',
  [NetworkName.Polygon]: 'polygon',
  [NetworkName.Arbitrum]: 'arbitrum',
  [NetworkName.EthereumSepolia]: 'ethereumSepolia',
  [NetworkName.PolygonAmoy]: 'polygonAmoy',
  [NetworkName.Hardhat]: 'hardhat',
  [NetworkName.EthereumRopsten_DEPRECATED]: 'ethereumRopsten',
  [NetworkName.EthereumGoerli_DEPRECATED]: 'ethereumGoerli',
  [NetworkName.ArbitrumGoerli_DEPRECATED]: 'arbitrumGoerli',
  [NetworkName.PolygonMumbai_DEPRECATED]: 'polygonMumbai',
}

const RailgunProxyContract: Record<NetworkName, string> = {
  // Main nets
  [NetworkName.Ethereum]: '0xfa7093cdd9ee6932b4eb2c9e1cde7ce00b1fa4b9',
  [NetworkName.BNBChain]: '0x590162bf4b50f6576a459b75309ee21d92178a10',
  [NetworkName.Polygon]: '0x19b620929f97b7b990801496c3b361ca5def8c71',
  [NetworkName.Arbitrum]: '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9',

  // Test nets
  [NetworkName.EthereumSepolia]: '0xeCFCf3b4eC647c4Ca6D49108b311b7a7C9543fea',
  [NetworkName.PolygonAmoy]: '0xD1aC80208735C7f963Da560C42d6BD82A8b175B5',

  // Dev only
  [NetworkName.Hardhat]: '0x610178dA211FEF7D417bC0e6FeD39F05609AD788',

  // Deprecated
  [NetworkName.EthereumRopsten_DEPRECATED]: '',
  [NetworkName.EthereumGoerli_DEPRECATED]: '',
  [NetworkName.ArbitrumGoerli_DEPRECATED]: '',
  [NetworkName.PolygonMumbai_DEPRECATED]: '',
}

const RelayAdaptContract: Record<NetworkName, string> = {
  // Main nets
  [NetworkName.Ethereum]: '0x4025ee6512DBbda97049Bcf5AA5D38C54aF6bE8a',
  [NetworkName.BNBChain]: '0x741936fb83DDf324636D3048b3E6bC800B8D9e12',
  [NetworkName.Polygon]: '0xc7FfA542736321A3dd69246d73987566a5486968',
  [NetworkName.Arbitrum]: '0x5aD95C537b002770a39dea342c4bb2b68B1497aA',

  // Test nets
  [NetworkName.EthereumSepolia]: '0x7e3d929EbD5bDC84d02Bd3205c777578f33A214D',
  [NetworkName.PolygonAmoy]: '0xc340f7E17A42154674d6B50190386C9a2982D12E',

  // Dev only
  [NetworkName.Hardhat]: '0x0355B7B8cb128fA5692729Ab3AAa199C1753f726',

  // Deprecated
  [NetworkName.EthereumRopsten_DEPRECATED]: '',
  [NetworkName.EthereumGoerli_DEPRECATED]: '',
  [NetworkName.ArbitrumGoerli_DEPRECATED]: '',
  [NetworkName.PolygonMumbai_DEPRECATED]: '',
}

const RailgunProxyDeploymentBlock: Record<NetworkName, number> = {
  // Main nets
  [NetworkName.Ethereum]: 14693000,
  [NetworkName.BNBChain]: 17633701,
  [NetworkName.Polygon]: 28083766,
  [NetworkName.Arbitrum]: 56109834,

  // Test nets
  [NetworkName.EthereumSepolia]: 5784866,
  [NetworkName.PolygonAmoy]: 6666136,

  // Dev only
  [NetworkName.Hardhat]: 0,

  // Deprecated
  [NetworkName.EthereumRopsten_DEPRECATED]: 12226000,
  [NetworkName.EthereumGoerli_DEPRECATED]: 7795991,
  [NetworkName.ArbitrumGoerli_DEPRECATED]: 2611949,
  [NetworkName.PolygonMumbai_DEPRECATED]: 28697343,
}

export {

  NetworkName,
  SubsquidNetworkName,
  RelayAdaptContract,
  RailgunProxyDeploymentBlock,
  RailgunProxyContract,
  RAILGUN_SCAN_START_BLOCK_V2,
  SCAN_CHUNKS,
  EVENTS_SCAN_TIMEOUT,
  SCAN_TIMEOUT_ERROR_MESSAGE
}
