import type { DataSource } from './datasource'
import type { RPCData } from './types'

/**
 * Provides an interface for interacting with Ethereum Virtual Machine (EVM) compatible blockchain networks.
 * This class handles the connection, communication, and data retrieval from EVM-based blockchains.
 * @description A provider implementation for connecting to and querying EVM-compatible blockchain networks
 * @example
 * ```typescript
 * const provider = new EVMProvider(networkName);
 * ```
 */
class EVMProvider implements DataSource<RPCData> {

}

export { EVMProvider }
