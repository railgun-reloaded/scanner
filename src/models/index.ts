type ActionType = {
  actionType: string
}

type TokenInfo = {
  id: Uint8Array
  tokenType: string
  tokenSubID: Uint8Array
  tokenAddress: Uint8Array
}

type CommitmentPreimage = {
  npk: Uint8Array
  token: TokenInfo
  value: BigInt
}

type RailgunGeneratedCommitment = {
  hash: Uint8Array
  treeNumber: number
  treePosition: number
  preimage: CommitmentPreimage
  encryptedRandom: Uint8Array[]
}

type RailgunShieldCommitment = {
  hash: Uint8Array
  treeNumber: number;
  treePosition: number
  preimage: CommitmentPreimage
  encryptedBundle: Uint8Array[]
  shieldKey: Uint8Array
  fee: BigInt
}

type RailgunShield = {
  batchStartTreePosition: number;
  commitment: RailgunGeneratedCommitment | RailgunShieldCommitment
} & ActionType

type RailgunUnshield = {
  to: Uint8Array;
  token: TokenInfo
  amount: BigInt
  fee: BigInt
  eventLogIndex: number
} & ActionType

type RailgunCiphertext = {
  iv: Uint8Array
  tag: Uint8Array
  data: Uint8Array[]
}

type RailgunEncryptedCommitment = {
  hash: Uint8Array
  ciphertext: RailgunCiphertext
  memo: Uint8Array[]
  ephemeralKeys: Uint8Array[]
  treeNumber: number
  treePosition: number
}

type RailgunTransactCommitment = {
  hash: Uint8Array
  ciphertext: RailgunCiphertext
  blindedSenderViewingKey: Uint8Array
  blindedReceiverViewingKey: Uint8Array
  annotationData: Uint8Array
  memo: Uint8Array[]
  treeNumber: number
  treePosition: number
}

type TransactCommitment = RailgunTransactCommitment | RailgunEncryptedCommitment

type RailgunTransact = {
  txID: Uint8Array
  nullifiers: Uint8Array[]
  commitments: TransactCommitment[]
  unshieldCommitment: Uint8Array
  boundParamsHash: Uint8Array
  utxoBatchStartPositionOut: BigInt
  utxoTreeIn: BigInt
  utxoTreeOut: BigInt
  hasUnshield: boolean

  // Optional unshield params
  unshieldToAddress: Uint8Array
  unshieldToken: TokenInfo
  unshieldValue: BigInt
} & ActionType

type RailgunAction = RailgunShield | RailgunUnshield | RailgunTransact

type EVMTransaction = {
  hash: string;
  index: number
  from: string
  actions: RailgunAction[][]
}

type EVMBlock = {
  number: BigInt
  hash: string
  timestamp: BigInt
  transactions: EVMTransaction[];
}

export type { EVMBlock, EVMTransaction, RailgunAction, RailgunShield, RailgunUnshield, RailgunTransact }
