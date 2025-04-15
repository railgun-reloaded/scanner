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
export type { Data, RPCData, Event }
