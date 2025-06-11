type RPCEvent = {
  name: string
  args: Record<string, any>
  blockNumber: number
  transactionIndex: number
  transactionHash: string
  logIndex: number
}

type Data = RPCEvent
type RPCData = Data & {}
/*
// TODO:
type Event = {
  blockHeight: bigint
  event: ContractEventPayload
}
*/
enum DataSourceType {
  Snapshot = 0x0,
  Historical = 0x1,
  Live = 0x2,
}

export type { RPCData, RPCEvent, Data }
export { DataSourceType }
