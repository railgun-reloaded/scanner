import type { Ciphertext, EncryptedCommitment, Transact, TransactCommitment } from '../../../models'
import { ActionType } from '../../../models'

import { formatTokenFromRPC, hexToBytes } from '../shared'

/**
 * The ABI encodes ciphertext as bytes32[4]. Element [0] packs iv (first 16 bytes)
 * and tag (last 16 bytes) into a single 32-byte word. Elements [1..3] are the data.
 * This matches how the engine decodes it in V2-events.ts / legacy-events.ts.
 * @param packed - bytes32[4] array from decoded event args
 */
function formatCiphertextFromRPC (packed: string[]): Ciphertext {
  const ivTag = packed[0]
  if (!ivTag) throw new Error('Ciphertext packed array is empty')
  return {
    iv: hexToBytes(ivTag.slice(0, 34)),      // '0x' + 32 hex chars = 16 bytes
    tag: hexToBytes('0x' + ivTag.slice(34)), // remaining 32 hex chars = 16 bytes
    data: packed.slice(1).map((d: string) => hexToBytes(d))
  }
}

/**
 *
 * @param hash
 * @param commitment
 * @param treeNumber
 * @param utxoBatchStartPositionOut
 * @param indexInBatch
 */
function formatTransactCommitmentFromRPC (
  hash: string,
  commitment: any,
  treeNumber: number,
  utxoBatchStartPositionOut: number,
  indexInBatch: number
): TransactCommitment {
  return {
    hash: hexToBytes(hash),
    ciphertext: formatCiphertextFromRPC(commitment.ciphertext as string[]),
    blindedSenderViewingKey: hexToBytes(commitment.blindedSenderViewingKey),
    blindedReceiverViewingKey: hexToBytes(commitment.blindedReceiverViewingKey),
    annotationData: hexToBytes(commitment.annotationData || '0x'),
    memo: commitment.memo.map((m: string) => hexToBytes(m)),
    treeNumber,
    treePosition: utxoBatchStartPositionOut + indexInBatch
  }
}

/**
 *
 * @param hash
 * @param commitment
 * @param treeNumber
 * @param utxoBatchStartPositionOut
 * @param indexInBatch
 */
function formatEncryptedCommitmentFromRPC (
  hash: string,
  commitment: any,
  treeNumber: number,
  utxoBatchStartPositionOut: number,
  indexInBatch: number
): EncryptedCommitment {
  return {
    hash: hexToBytes(hash),
    ciphertext: formatCiphertextFromRPC(commitment.ciphertext as string[]),
    memo: commitment.memo.map((m: string) => hexToBytes(m)),
    ephemeralKeys: commitment.ephemeralKeys.map((k: string) => hexToBytes(k)),
    treeNumber,
    treePosition: utxoBatchStartPositionOut + indexInBatch
  }
}

/**
 *
 * @param eventName
 * @param args
 * @param txHash
 */
function formatTransactFromRPC (eventName: string, args: any, txHash: string): Transact {
  const utxoBatchStartPositionOut = Number(args.outputStartIndex || args.startPosition || 0)
  const utxoTreeIn = Number(args.treeNumber || 0)
  const utxoTreeOut = Math.floor(utxoBatchStartPositionOut / 65536)
  const hasUnshield = Boolean(args.unshield)

  let commitments: (TransactCommitment | EncryptedCommitment)[]
  let actionType: ActionType

  if (eventName === 'Transact') {
    actionType = ActionType.TransactCommitment
    commitments = (args.ciphertext || []).map((c: any, index: number) =>
      formatTransactCommitmentFromRPC(args.hash[index], c, utxoTreeOut, utxoBatchStartPositionOut, index)
    )
  } else if (eventName === 'CommitmentBatch') {
    actionType = ActionType.EncryptedCommitment
    commitments = (args.ciphertext || []).map((c: any, index: number) =>
      formatEncryptedCommitmentFromRPC(args.hash[index], c, utxoTreeOut, utxoBatchStartPositionOut, index)
    )
  } else {
    throw new Error(`Unknown transact event type: ${eventName}`)
  }

  const transact: Transact = {
    actionType,
    txID: hexToBytes(txHash),
    nullifiers: (args.nullifiers || []).map((n: string) => hexToBytes(n)),
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
