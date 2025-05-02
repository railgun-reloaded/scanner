import type { ContractEventPayload } from 'ethers'

// TODO:
type Data = {
  blockHeight: bigint
  event: ContractEventPayload
}
// TODO:

type RPCData = Data & {}

// TODO:
type Event = {
  blockHeight: bigint
  event: ContractEventPayload
}

enum DataSourceType {
  Snapshot = 0x0,
  Historical = 0x1,
  Live = 0x2,
}

export type { Data, RPCData, Event }
export { DataSourceType }
