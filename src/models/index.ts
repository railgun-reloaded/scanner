type ActionType = {
  actionType: string
}

type TokenInfo = {
  id: string
  tokenType: string
  tokenSubID: string
  tokenAddress: string
}

type CommitmentPreimage = {
  npk: string
  token: TokenInfo
  value: string
}

type RailgunGeneratedCommitment = {
  hash: string
  treeNumber: number
  treePosition: number
  preimage: CommitmentPreimage
  encryptedRandom: string[]
}

type RailgunShieldCommitment = {
  hash: string
  treeNumber: number;
  treePosition: number
  preimage: CommitmentPreimage
  encryptedBundle: string[]
  shieldKey: string
  fee: string
}

type RailgunShield = {
  batchStartTreePosition: number;
  commitment: RailgunGeneratedCommitment | RailgunShieldCommitment
} & ActionType

type RailgunUnshield = {
  to: string;
  token: TokenInfo
  amount: string
  fee: string
  eventLogIndex: number
} & ActionType

type RailgunCiphertext = {
  iv: string
  tag: string
  data: string[]
}

type RailgunEncryptedCommitment = {
  hash: string
  ciphertext: RailgunCiphertext
  memo: string[]
  ephemeralKeys: string[]
  treeNumber: number
  treePosition: number
}

type RailgunTransactCommitment = {
  hash: string
  ciphertext: RailgunCiphertext
  blindedSenderViewingKey: string
  blindedReceiverViewingKey: string
  annotationData: string
  memo: string[]
  treeNumber: number
  treePosition: number
}

type TransactCommitment = RailgunTransactCommitment | RailgunEncryptedCommitment

type RailgunTransact = {
  txID: string
  nullifiers: string[]
  commitments: TransactCommitment[]
  unshieldCommitment: string
  boundParamsHash: string
  utxoBatchStartPositionOut: string
  utxoTreeIn: string
  utxoTreeOut: string
  hasUnshield: boolean

  // Optional unshield params
  unshieldToAddress: string
  unshieldToken: TokenInfo
  unshieldValue: string
} & ActionType

type RailgunAction = RailgunShield | RailgunUnshield | RailgunTransact

type EVMTransaction = {
  hash: string;
  index: number
  from: string
  actions: RailgunAction[][]
}

type EVMBlock = {
  number: string
  hash: string
  timestamp: string
  transactions: EVMTransaction[];
}

export type { EVMBlock, EVMTransaction, RailgunAction, RailgunShield, RailgunUnshield, RailgunTransact }
