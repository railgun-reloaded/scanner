import type { Ciphertext, EncryptedCommitment, Transact, TransactCommitment } from '../../../models'
import { ActionType } from '../../../models'

import { formatTokenFromRPC, hexToBytes } from '../shared'

/**
 *
 * @param ciphertext
 */
function formatCiphertextFromRPC (ciphertext: any): Ciphertext {
  return {
    iv: hexToBytes(ciphertext.iv),
    tag: hexToBytes(ciphertext.tag),
    data: ciphertext.data.map((d: string) => hexToBytes(d))
  }
}

/**
 *
 * @param commitment
 * @param treeNumber
 * @param utxoBatchStartPositionOut
 * @param indexInBatch
 */
function formatTransactCommitmentFromRPC (
  commitment: any,
  treeNumber: number,
  utxoBatchStartPositionOut: number,
  indexInBatch: number
): TransactCommitment {
  return {
    hash: hexToBytes(commitment.npk),
    ciphertext: formatCiphertextFromRPC(commitment.ciphertext),
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
 * @param commitment
 * @param treeNumber
 * @param utxoBatchStartPositionOut
 * @param indexInBatch
 */
function formatEncryptedCommitmentFromRPC (
  commitment: any,
  treeNumber: number,
  utxoBatchStartPositionOut: number,
  indexInBatch: number
): EncryptedCommitment {
  return {
    hash: hexToBytes(commitment.npk),
    ciphertext: formatCiphertextFromRPC(commitment.ciphertext),
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
 */
function formatTransactFromRPC (eventName: string, args: any): Transact {
  const utxoBatchStartPositionOut = Number(args.outputStartIndex || args.startPosition || 0)
  const utxoTreeIn = Number(args.treeNumber || 0)
  const utxoTreeOut = Math.floor(utxoBatchStartPositionOut / 65536)
  const hasUnshield = Boolean(args.unshield)

  let commitments: (TransactCommitment | EncryptedCommitment)[]
  let actionType: ActionType

  if (eventName === 'Transact') {
    actionType = ActionType.TransactCommitment
    commitments = (args.commitments || []).map((c: any, index: number) =>
      formatTransactCommitmentFromRPC(c, utxoTreeOut, utxoBatchStartPositionOut, index)
    )
  } else if (eventName === 'CommitmentBatch') {
    actionType = ActionType.EncryptedCommitment
    commitments = (args.commitments || []).map((c: any, index: number) =>
      formatEncryptedCommitmentFromRPC(c, utxoTreeOut, utxoBatchStartPositionOut, index)
    )
  } else {
    throw new Error(`Unknown transact event type: ${eventName}`)
  }

  const transact: Transact = {
    actionType,
    txID: hexToBytes(args.merkleRoot || args.txid || '0x00'),
    nullifiers: (args.nullifiers || []).map((n: string) => hexToBytes(n)),
    commitments,
    boundParamsHash: hexToBytes(args.boundParams || '0x00'),
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
