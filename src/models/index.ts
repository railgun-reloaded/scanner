enum ActionType {
  Unshield = 'Unshield',
  GeneratedCommitment = 'GeneratedCommitment',
  ShieldCommitment = 'ShieldCommitment',
  EncryptedCommitment = 'EncryptedCommitment',
  TransactCommitment = 'TransactCommitment'
}

type Token = {
  id: Uint8Array
  tokenType: string
  tokenSubID: Uint8Array
  tokenAddress: Uint8Array
}

type CommitmentPreimage = {
  npk: Uint8Array
  token: Token
  value: bigint
}

type GeneratedCommitment = {
  hash: Uint8Array
  treeNumber: number
  treePosition: number
  preimage: CommitmentPreimage
  encryptedRandom: Uint8Array[]
}

type ShieldCommitment = {
  hash: Uint8Array
  treeNumber: number
  treePosition: number
  preimage: CommitmentPreimage
  encryptedBundle: Uint8Array[]
  shieldKey: Uint8Array
  fee?: bigint
}

type Shield = {
  actionType: ActionType
  batchStartTreePosition: number
  commitment: GeneratedCommitment | ShieldCommitment
}

type Unshield = {
  actionType: ActionType
  to: Uint8Array;
  token: Token
  amount: bigint
  fee: bigint
  eventLogIndex: number
}

type Ciphertext = {
  iv: Uint8Array
  tag: Uint8Array
  data: Uint8Array[]
}

type EncryptedCommitment = {
  hash: Uint8Array
  ciphertext: Ciphertext
  memo: Uint8Array[]
  ephemeralKeys: Uint8Array[]
  treeNumber: number
  treePosition: number
}

type TransactCommitment = {
  hash: Uint8Array
  ciphertext: Ciphertext
  blindedSenderViewingKey: Uint8Array
  blindedReceiverViewingKey: Uint8Array
  annotationData: Uint8Array
  memo: Uint8Array[]
  treeNumber: number
  treePosition: number
}

type Transact = {
  actionType: ActionType
  txID: Uint8Array
  nullifiers: Uint8Array[]
  commitments: (TransactCommitment | EncryptedCommitment)[]
  unshieldCommitment?: Uint8Array
  boundParamsHash: Uint8Array
  utxoBatchStartPositionOut: number
  utxoTreeIn: number
  utxoTreeOut: number
  hasUnshield: boolean

  // Optional unshield params
  unshieldToAddress?: Uint8Array
  unshieldToken?: Token
  unshieldValue?: bigint
}

type Action = Shield | Unshield | Transact

type EVMTransaction = {
  hash: Uint8Array
  index: number
  from: Uint8Array
  actions: Action[][]
}

type EVMBlock = {
  number: bigint,
  hash: Uint8Array
  timestamp: bigint
  transactions: EVMTransaction[]
}

export type {
  EVMBlock,
  EVMTransaction,
  Action,
  Shield,
  GeneratedCommitment,
  ShieldCommitment,
  Ciphertext,
  EncryptedCommitment,
  TransactCommitment,
  CommitmentPreimage,
  Unshield,
  Transact,
  Token
}
export { ActionType }
