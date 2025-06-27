/*
enum RailgunFunctions {
  CGenerateDepositV1,
  CTransactV1,
  CShieldV2,
  CTransactV2,
  CShieldV2_1,
  CTransactV2_1
}

enum RailgunEvents {
  ECommitmentBatchV1,
  EGeneratedCommitmentBatchV1,
  ENullifiersV1,
  ETransactV2,
  EShieldV2,
  EUnshieldV2,
  ENullifiedV2,
  ETransactV2_1,
  EShieldV2_1,
  EUnshieldV2_1,
  ENullifiedV2_1
}
*/
type EVMLog = {
  index: number
  address: string
  name: string
  args: Record<string, any>
  // transactionHash: string
}

// Only intended for the data obtained from the call traces
type RailgunTransactionBatch = {
  tracePath: number[]
  from: string;
}

type EVMTransaction = {
  hash: string;
  index: number;
  from: string;
  logs: EVMLog[]
}

type EVMBlock = {
  number: bigint;
  hash: string;
  timestamp: bigint;
  transactions: EVMTransaction[];
  // Optional only intended for call traces
  internalTransaction: RailgunTransactionBatch[]
}

export type { EVMBlock, EVMLog, EVMTransaction }
