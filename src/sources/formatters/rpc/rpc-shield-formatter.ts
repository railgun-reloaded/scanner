import { hexToBytes } from '@railgun-reloaded/bytes'

import type { CommitmentPreimage, GeneratedCommitment, Shield, ShieldCommitment } from '../../../models/index.js'
import { ActionType } from '../../../models/index.js'
import { formatTokenFromRPC } from '../shared/index.js'

import { EventName, TREE_MAX_ITEMS } from './constants.js'

/**
 * Build the canonical CommitmentPreimage from raw RPC args.
 * @param npk - Note public key (hex)
 * @param token - Token struct from event args (hex addresses + subID)
 * @param value - Commitment value as bigint
 * @returns Canonical CommitmentPreimage
 */
function formatPreimageFromRPC (npk: string, token: any, value: bigint): CommitmentPreimage {
  return {
    npk: hexToBytes(npk),
    token: formatTokenFromRPC(token),
    value
  }
}

/**
 * Format a V1 `GeneratedCommitmentBatch` entry into the canonical GeneratedCommitment.
 * The final tree position is computed as `batchStartTreePosition + indexInBatch`
 * because the batch is laid out sequentially in the merkle tree.
 * @param commitment - Commitment hash (hex)
 * @param npk - Note public key (hex)
 * @param token - Token struct from event args
 * @param value - Commitment value as bigint
 * @param encryptedRandom - Encrypted randomness array (hex)
 * @param treeNumber - Merkle tree index the commitment lives in
 * @param batchStartTreePosition - Global tree position at which this batch starts
 * @param indexInBatch - Zero-based offset of this commitment within the batch
 * @returns Canonical GeneratedCommitment
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
    encryptedRandom: encryptedRandom.map((b) => hexToBytes(b))
  }
}

/**
 * Format a V2 `Shield` entry into the canonical ShieldCommitment.
 * `fee` is optional because early V2 shield events didn't emit it.
 * @param commitment - Commitment hash (hex)
 * @param npk - Note public key (hex)
 * @param token - Token struct from event args
 * @param value - Commitment value as bigint
 * @param encryptedBundle - Encrypted bundle (hex triplet)
 * @param shieldKey - Shared shield key (hex)
 * @param fee - Optional shield fee; undefined when not emitted
 * @param treeNumber - Merkle tree index the commitment lives in
 * @param batchStartTreePosition - Global tree position at which this batch starts
 * @param indexInBatch - Zero-based offset of this commitment within the batch
 * @returns Canonical ShieldCommitment
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
    encryptedBundle: encryptedBundle.map((b) => hexToBytes(b)),
    shieldKey: hexToBytes(shieldKey)
  }

  if (fee !== undefined) {
    formatted.fee = fee
  }

  return formatted
}

/**
 * Format a decoded shield-family event (`Shield` V2 or `GeneratedCommitmentBatch` V1)
 * into the canonical Shield action. Tree number is derived from the batch start
 * position using TREE_MAX_ITEMS because the contract doesn't emit it directly.
 * @param eventName - One of EventName.Shield / EventName.GeneratedCommitmentBatch
 * @param args - Decoded event args (field shape varies by version)
 * @returns Canonical Shield action
 */
function formatShieldFromRPC (eventName: string, args: any): Shield {
  const batchStartTreePosition = Number(args.startPosition || args.treePosition || 0)
  const treeNumber = Math.floor(batchStartTreePosition / TREE_MAX_ITEMS)

  if (eventName === EventName.GeneratedCommitmentBatch) {
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

  if (eventName === EventName.Shield) {
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
