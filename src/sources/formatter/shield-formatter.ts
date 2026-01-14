import type { CommitmentPreimage, GeneratedCommitment, Shield, ShieldCommitment } from '../../models'
import { ActionType } from '../../models'

import { hexToBytes } from './bytes'
import { formatToken } from './token-formatter'

/**
 * Format input preimage to CommitmentPreimage
 * @param preimage - Input preimage to format
 * @returns - Formatted CommitmentPreimage
 */
function formatCommitmentPreimage (preimage: Record<string, any>) : CommitmentPreimage {
  return {
    npk: hexToBytes(preimage['npk']),
    token: formatToken(preimage['token']),
    value: BigInt(preimage['value'])
  }
}

/**
 * Format input commitment to GeneratedCommitment
 * @param commitment - Input commitment to format
 * @returns - Formatted Commitments
 */
function formatRailgunGeneratedCommitment (commitment: Record<string, any>) : GeneratedCommitment {
  return {
    hash: hexToBytes(commitment['hash']),
    treeNumber: Number(commitment['treeNumber']),
    treePosition: Number(commitment['treePosition']),
    preimage: formatCommitmentPreimage(commitment['preimage']),
    encryptedRandom: commitment['encryptedRandom'].map(hexToBytes)
  }
}

/**
 * Format input commitment to ShieldCommitment
 * @param commitment - Input commitment to format
 * @returns - Formatted ShieldCommitment
 */
function formatRailgunShieldCommitment (commitment: Record<string, any>) : ShieldCommitment {
  return {
    hash: hexToBytes(commitment['hash']),
    treeNumber: Number(commitment['treeNumber']),
    treePosition: Number(commitment['treePosition']),
    preimage: formatCommitmentPreimage(commitment['preimage']),
    encryptedBundle: commitment['encryptedBundle'].map(hexToBytes),
    shieldKey: hexToBytes(commitment['shieldKey']),
    fee: BigInt(commitment['fee'])
  }
}

/**
 * Format input shield to Shield
 * @param shield - Input shield to format
 * @returns - Formatted Shield
 */
function formatShield (shield: Record<string, any>) : Shield {
  const actionType = shield['actionType']
  switch (actionType) {
    case 'GeneratedCommitmentBatch':
    {
      return {
        batchStartTreePosition: Number(shield['batchStartTreePosition']),
        actionType: ActionType.GeneratedCommitment,
        commitment: formatRailgunGeneratedCommitment(shield['commitment'])
      }
    }
    case 'Shield': {
      return {
        actionType: ActionType.ShieldCommitment,
        batchStartTreePosition: Number(shield['batchStartTreePosition']),
        commitment: formatRailgunShieldCommitment(shield['commitment'])
      }
    }
    default:
      throw new Error(`Unknown shield action type: ${actionType}`)
  }
}

export { formatShield }
