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
  log: Record<string, any>
  // transactionHash: string
}

type RailgunTransactionData = {
  blockNumber: bigint;
  blockHash: string;
  blockTimestamp: bigint;
  transactionIndex: number;

  origin: string;
  from: string;

  logs: Array<EVMLog>

  // Call traces information
  tracePath: [number]
  input: string
}

export type { RailgunTransactionData, EVMLog }
