import type { Ciphertext, EncryptedCommitment, Transact, TransactCommitment } from '../../models'
import { ActionType } from '../../models'

import { hexToBytes } from './bytes'
import { formatToken } from './token-formatter'

/**
 * Format input ciphertex to Ciphertext
 * @param ciphertext - Input ciphertext to format
 * @returns - Formatted Ciphertext
 */
function formatCiphertext (ciphertext: Record<string, any>) : Ciphertext {
  return {
    iv: hexToBytes(ciphertext['iv']),
    tag: hexToBytes(ciphertext['tag']),
    data: ciphertext['data'].map(hexToBytes)
  }
}

/**
 * Format input encrypted commitment to EncryptedCommitment
 * @param commitment - Input encrypted commitment
 * @returns - Formatted EncryptedCommitment object
 */
function formatEncryptedCommitment (commitment : Record<string, any>) : EncryptedCommitment {
  return {
    hash: hexToBytes(commitment['hash']),
    ciphertext: formatCiphertext(commitment['ciphertext']),
    memo: commitment['memo'].map(hexToBytes),
    ephemeralKeys: commitment['ephemeralKeys'].map(hexToBytes),
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
    hash: hexToBytes(commitment['hash']),
    ciphertext: formatCiphertext(commitment['ciphertext']),
    blindedSenderViewingKey: hexToBytes(commitment['blindedSenderViewingKey']),
    blindedReceiverViewingKey: hexToBytes(commitment['blindedReceiverViewingKey']),
    annotationData: hexToBytes(commitment['annotationData']),
    memo: commitment['memo'].map(hexToBytes),
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
    txID: hexToBytes(transact['txID']),
    nullifiers: transact['nullifiers'].map(hexToBytes),
    commitments,
    boundParamsHash: hexToBytes(transact['boundParamsHash']),
    utxoBatchStartPositionOut: Number(transact['utxoBatchStartPositionOut']),
    utxoTreeIn: Number(transact['utxoTreeIn']),
    utxoTreeOut: Number(transact['utxoTreeOut']),
    hasUnshield
  }
  if (hasUnshield) {
    formattedTransact.unshieldCommitment = hexToBytes(transact['unshieldCommitment'])
    formattedTransact.unshieldToAddress = hexToBytes(transact['unshieldToAddress'])
    formattedTransact.unshieldToken = formatToken(transact['unshieldToken'])
    formattedTransact.unshieldValue = BigInt(transact['unshieldValue'])
  }
  return formattedTransact
}

export { formatTransact }
