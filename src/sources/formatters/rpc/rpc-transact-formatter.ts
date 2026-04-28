import { hexToBytes } from '@railgun-reloaded/bytes'

import type { Ciphertext, EncryptedCommitment, Transact, TransactCommitment } from '../../../models'
import { ActionType } from '../../../models'
import { formatTokenFromRPC } from '../shared'

import { EventName, TREE_MAX_ITEMS } from './constants'

/**
 * Raw ciphertext commitment as it arrives from a decoded V2 `Transact` event.
 * Fields match the struct emitted by the contract.
 */
type RPCTransactCommitment = {
  ciphertext: string[]
  blindedSenderViewingKey: string
  blindedReceiverViewingKey: string
  annotationData?: string
  memo: string[]
}

/**
 * Raw ciphertext commitment as it arrives from a decoded V1 `CommitmentBatch` event.
 * V1 uses ephemeralKeys instead of blinded viewing keys.
 */
type RPCEncryptedCommitment = {
  ciphertext: string[]
  memo: string[]
  ephemeralKeys: string[]
}

/**
 * The ABI encodes ciphertext as bytes32[4]. Element [0] packs iv (first 16 bytes)
 * and tag (last 16 bytes) into a single 32-byte word. Elements [1..3] are the data.
 * This matches how the engine decodes it in V2-events.ts / legacy-events.ts.
 * @param packed - bytes32[4] array from decoded event args
 * @returns Canonical Ciphertext (iv, tag, data)
 */
function formatCiphertextFromRPC (packed: string[]): Ciphertext {
  const ivTag = packed[0]
  if (!ivTag) throw new Error('Ciphertext packed array is empty')
  return {
    iv: hexToBytes(ivTag.slice(0, 34)),      // '0x' + 32 hex chars = 16 bytes
    tag: hexToBytes('0x' + ivTag.slice(34)), // remaining 32 hex chars = 16 bytes
    data: packed.slice(1).map((b: string) => hexToBytes(b))
  }
}

/**
 * Format one commitment from a V2 `Transact` event into the canonical TransactCommitment.
 * @param hash - Commitment hash (hex)
 * @param commitment - Raw commitment struct from decoded event args
 * @param treeNumber - Output merkle tree index
 * @param utxoBatchStartPositionOut - Global tree position at which this batch starts
 * @param indexInBatch - Zero-based offset of this commitment within the batch
 * @returns Canonical TransactCommitment
 */
function formatTransactCommitmentFromRPC (
  hash: string,
  commitment: RPCTransactCommitment,
  treeNumber: number,
  utxoBatchStartPositionOut: number,
  indexInBatch: number
): TransactCommitment {
  return {
    hash: hexToBytes(hash),
    ciphertext: formatCiphertextFromRPC(commitment.ciphertext),
    blindedSenderViewingKey: hexToBytes(commitment.blindedSenderViewingKey),
    blindedReceiverViewingKey: hexToBytes(commitment.blindedReceiverViewingKey),
    annotationData: hexToBytes(commitment.annotationData || '0x'),
    memo: commitment.memo.map((b: string) => hexToBytes(b)),
    treeNumber,
    treePosition: utxoBatchStartPositionOut + indexInBatch
  }
}

/**
 * Format one commitment from a V1 `CommitmentBatch` event into the canonical EncryptedCommitment.
 * @param hash - Commitment hash (hex)
 * @param commitment - Raw commitment struct from decoded event args
 * @param treeNumber - Output merkle tree index
 * @param utxoBatchStartPositionOut - Global tree position at which this batch starts
 * @param indexInBatch - Zero-based offset of this commitment within the batch
 * @returns Canonical EncryptedCommitment
 */
function formatEncryptedCommitmentFromRPC (
  hash: string,
  commitment: RPCEncryptedCommitment,
  treeNumber: number,
  utxoBatchStartPositionOut: number,
  indexInBatch: number
): EncryptedCommitment {
  return {
    hash: hexToBytes(hash),
    ciphertext: formatCiphertextFromRPC(commitment.ciphertext),
    memo: commitment.memo.map((b: string) => hexToBytes(b)),
    ephemeralKeys: commitment.ephemeralKeys.map((b: string) => hexToBytes(b)),
    treeNumber,
    treePosition: utxoBatchStartPositionOut + indexInBatch
  }
}

/**
 * Format a decoded transact-family event (`Transact` V2 or `CommitmentBatch` V1)
 * into the canonical Transact action. The output tree is derived from the batch
 * start position; the input tree comes directly from the event.
 * `boundParamsHash` is left zero because it is not emitted in the event — it's
 * only available from the transaction calldata.
 * @param eventName - One of EventName.Transact / EventName.CommitmentBatch
 * @param args - Decoded event args (field shape varies by version)
 * @param txHash - Enclosing transaction hash (hex)
 * @returns Canonical Transact action
 */
function formatTransactFromRPC (eventName: string, args: any, txHash: string): Transact {
  const utxoBatchStartPositionOut = Number(args.outputStartIndex || args.startPosition || 0)
  const utxoTreeIn = Number(args.treeNumber || 0)
  const utxoTreeOut = Math.floor(utxoBatchStartPositionOut / TREE_MAX_ITEMS)
  const hasUnshield = Boolean(args.unshield)

  let commitments: (TransactCommitment | EncryptedCommitment)[]
  let actionType: ActionType

  if (eventName === EventName.Transact) {
    actionType = ActionType.TransactCommitment
    commitments = (args.ciphertext || []).map((c: RPCTransactCommitment, index: number) =>
      formatTransactCommitmentFromRPC(args.hash[index], c, utxoTreeOut, utxoBatchStartPositionOut, index)
    )
  } else if (eventName === EventName.CommitmentBatch) {
    actionType = ActionType.EncryptedCommitment
    commitments = (args.ciphertext || []).map((c: RPCEncryptedCommitment, index: number) =>
      formatEncryptedCommitmentFromRPC(args.hash[index], c, utxoTreeOut, utxoBatchStartPositionOut, index)
    )
  } else {
    throw new Error(`Unknown transact event type: ${eventName}`)
  }

  const transact: Transact = {
    actionType,
    txID: hexToBytes(txHash),
    nullifiers: (args.nullifiers || []).map((b: string) => hexToBytes(b)),
    commitments,
    boundParamsHash: hexToBytes('0x00'), // not emitted in the event; available only from tx calldata
    utxoBatchStartPositionOut,
    utxoTreeIn,
    utxoTreeOut,
    hasUnshield
  }

  if (hasUnshield && args.unshield) {
    transact.unshieldCommitment = hexToBytes(args.unshield.npk || '0x00')
    transact.unshieldToAddress = hexToBytes(args.unshield.to)
    transact.unshieldToken = formatTokenFromRPC(args.unshield.token)
    transact.unshieldValue = BigInt(args.unshield.value)
  }

  return transact
}

export { formatTransactFromRPC }
