import type { CommitmentPreimage, GeneratedCommitment, Shield, ShieldCommitment, Token } from '../../../models'
import { ActionType } from '../../../models'

/**
 *
 * @param hex
 */
function hexToBytes (hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(cleanHex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/**
 *
 * @param tokenData
 */
function formatTokenFromRPC (tokenData: any): Token {
  return {
    id: hexToBytes(tokenData.tokenAddress),
    tokenType: String(tokenData.tokenType),
    tokenSubID: hexToBytes(tokenData.tokenSubID || '0x00'),
    tokenAddress: hexToBytes(tokenData.tokenAddress)
  }
}

/**
 *
 * @param npk
 * @param token
 * @param value
 */
function formatPreimageFromRPC (npk: string, token: any, value: bigint): CommitmentPreimage {
  return {
    npk: hexToBytes(npk),
    token: formatTokenFromRPC(token),
    value
  }
}

/**
 *
 * @param commitment
 * @param npk
 * @param token
 * @param value
 * @param encryptedRandom
 * @param treeNumber
 * @param batchStartTreePosition
 * @param indexInBatch
 */
function formatGeneratedCommitmentFromRPC (
  commitment: string,
  npk: string,
  token: any,
  value: bigint,
  encryptedRandom: string[],
  treeNumber: number,
  batchStartTreePosition: number,
  indexInBatch: number
): GeneratedCommitment {
  return {
    hash: hexToBytes(commitment),
    treeNumber,
    treePosition: batchStartTreePosition + indexInBatch,
    preimage: formatPreimageFromRPC(npk, token, value),
    encryptedRandom: encryptedRandom.map(hexToBytes)
  }
}

/**
 *
 * @param commitment
 * @param npk
 * @param token
 * @param value
 * @param encryptedBundle
 * @param shieldKey
 * @param fee
 * @param treeNumber
 * @param batchStartTreePosition
 * @param indexInBatch
 */
function formatShieldCommitmentFromRPC (
  commitment: string,
  npk: string,
  token: any,
  value: bigint,
  encryptedBundle: string[],
  shieldKey: string,
  fee: bigint | undefined,
  treeNumber: number,
  batchStartTreePosition: number,
  indexInBatch: number
): ShieldCommitment {
  const formatted: ShieldCommitment = {
    hash: hexToBytes(commitment),
    treeNumber,
    treePosition: batchStartTreePosition + indexInBatch,
    preimage: formatPreimageFromRPC(npk, token, value),
    encryptedBundle: encryptedBundle.map(hexToBytes),
    shieldKey: hexToBytes(shieldKey)
  }

  if (fee !== undefined) {
    formatted.fee = fee
  }

  return formatted
}

/**
 *
 * @param eventName
 * @param args
 */
function formatShieldFromRPC (eventName: string, args: any): Shield {
  const batchStartTreePosition = Number(args.startPosition || args.treePosition || 0)
  const treeNumber = Math.floor(batchStartTreePosition / 65536)

  if (eventName === 'GeneratedCommitmentBatch') {
    return {
      actionType: ActionType.GeneratedCommitment,
      batchStartTreePosition,
      commitment: formatGeneratedCommitmentFromRPC(
        args.commitments[0],
        args.npk,
        args.token,
        BigInt(args.value),
        args.encryptedRandom,
        treeNumber,
        batchStartTreePosition,
        0
      )
    }
  }

  if (eventName === 'Shield') {
    return {
      actionType: ActionType.ShieldCommitment,
      batchStartTreePosition,
      commitment: formatShieldCommitmentFromRPC(
        args.commitments?.[0] || args.commitment,
        args.npk,
        args.token,
        BigInt(args.value),
        args.encryptedBundle,
        args.shieldKey,
        args.fee ? BigInt(args.fee) : undefined,
        treeNumber,
        batchStartTreePosition,
        0
      )
    }
  }

  throw new Error(`Unknown shield event type: ${eventName}`)
}

export { formatShieldFromRPC }
