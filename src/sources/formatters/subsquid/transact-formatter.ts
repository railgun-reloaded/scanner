import { hexToBytes } from '@railgun-reloaded/bytes'

import type { Ciphertext, EncryptedCommitment, Transact, TransactCommitment } from '../../../models/index.js'
import { ActionType } from '../../../models/index.js'
import { flattenMemo } from '../memo.js'

import { formatToken } from './token-formatter.js'

/**
 * Format input ciphertex to Ciphertext
 * @param ciphertext - Input ciphertext to format
 * @returns - Formatted Ciphertext
 */
function formatCiphertext (ciphertext: Record<string, any>) : Ciphertext {
  return {
    iv: hexToBytes(ciphertext['iv'], { allowOddLength: true }),
    tag: hexToBytes(ciphertext['tag'], { allowOddLength: true }),
    data: ciphertext['data'].map((b: string) => hexToBytes(b, { allowOddLength: true }))
  }
}

/**
 * Format input encrypted commitment to EncryptedCommitment
 * @param commitment - Input encrypted commitment
 * @returns - Formatted EncryptedCommitment object
 */
function formatEncryptedCommitment (commitment : Record<string, any>) : EncryptedCommitment {
  return {
    hash: hexToBytes(commitment['hash'], { allowOddLength: true }),
    ciphertext: formatCiphertext(commitment['ciphertext']),
    memo: flattenMemo(commitment['memo']),
    ephemeralKeys: commitment['ephemeralKeys'].map((b: string) => hexToBytes(b, { allowOddLength: true })),
    treeNumber: Number(commitment['treeNumber']),
    treePosition: Number(commitment['treePosition'])
  }
}

/**
 * Format input transact commitment to TransactCommitment
 * @param commitment - Input transact commitment
 * @returns - Formatted TransactCommitment object
 */
function formatTransactCommitment (commitment : Record<string, any>) : TransactCommitment {
  return {
    hash: hexToBytes(commitment['hash'], { allowOddLength: true }),
    ciphertext: formatCiphertext(commitment['ciphertext']),
    blindedSenderViewingKey: hexToBytes(commitment['blindedSenderViewingKey'], { allowOddLength: true }),
    blindedReceiverViewingKey: hexToBytes(commitment['blindedReceiverViewingKey'], { allowOddLength: true }),
    annotationData: hexToBytes(commitment['annotationData'], { allowOddLength: true }),
    memo: flattenMemo(commitment['memo']),
    treeNumber: Number(commitment['treeNumber']),
    treePosition: Number(commitment['treePosition'])
  }
}

/**
 * Format input transact to Transact
 * @param transact - Input transact to format
 * @returns - Formatted Transact object
 */
function formatTransact (transact: Record<string, any>) : Transact {
  const actionType = transact['actionType']

  let commitments = []
  let rgActionType

  switch (actionType) {
    case 'CommitmentBatch':
    {
      rgActionType = ActionType.EncryptedCommitment
      commitments = transact['commitments'].map(formatEncryptedCommitment)
      break
    }
    case 'Transact':
    {
      rgActionType = ActionType.TransactCommitment
      commitments = transact['commitments'].map(formatTransactCommitment)
      break
    }
    default:
      throw new Error(`Unknown transact actionType: ${actionType}`)
  }

  const hasUnshield = transact['hasUnshield']
  const formattedTransact : Transact = {
    actionType: rgActionType,
    txID: hexToBytes(transact['txID'], { allowOddLength: true }),
    nullifiers: transact['nullifiers'].map((b: string) => hexToBytes(b, { allowOddLength: true })),
    commitments,
    boundParamsHash: hexToBytes(transact['boundParamsHash'], { allowOddLength: true }),
    utxoBatchStartPositionOut: Number(transact['utxoBatchStartPositionOut']),
    utxoTreeIn: Number(transact['utxoTreeIn']),
    utxoTreeOut: Number(transact['utxoTreeOut']),
    hasUnshield
  }
  if (hasUnshield) {
    formattedTransact.unshieldCommitment = hexToBytes(transact['unshieldCommitment'], { allowOddLength: true })
    formattedTransact.unshieldToAddress = hexToBytes(transact['unshieldToAddress'], { allowOddLength: true })
    formattedTransact.unshieldToken = formatToken(transact['unshieldToken'])
    formattedTransact.unshieldValue = BigInt(transact['unshieldValue'])
  }
  return formattedTransact
}

export { formatTransact }
