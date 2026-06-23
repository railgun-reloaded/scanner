import { padBytesLeft } from '@railgun-reloaded/bytes'

import type { EVMBlock, Token, Transact } from '../models/index.js'
import { ActionType } from '../models/index.js'

const RAILGUN_TXID_BYTE_LENGTH = 32

enum RailgunTxidVersion {
  V2 = 2,
  V3 = 3,
}

type ScannedRailgunTransactionUnshield = {
  to: Uint8Array
  token: Token
  value: bigint
}

type ScannedRailgunTransaction = {
  railgunTxid: Uint8Array
  txidVersion: RailgunTxidVersion
  chainTxid: Uint8Array
  blockNumber: bigint
  timestamp: bigint
  nullifiers: Uint8Array[]
  commitments: Uint8Array[]
  boundParamsHash: Uint8Array
  hasUnshield: boolean
  unshield: ScannedRailgunTransactionUnshield | null
  utxoTreeIn: number
  utxoTreeOut: number
  utxoBatchStartPositionOut: number
}

/**
 * Length-32 check for canonical Railgun-tx byte fields.
 * @param value - Byte array.
 * @returns True when length is exactly 32.
 */
function isBytes32 (value: Uint8Array): boolean {
  return value.length === RAILGUN_TXID_BYTE_LENGTH
}

/**
 * Left-pad a byte array to 32 bytes. Throws when input exceeds 32 bytes.
 * @param value - Byte array to normalize.
 * @returns 32-byte array.
 */
function normalizeBytes32 (value: Uint8Array): Uint8Array {
  return padBytesLeft(value, RAILGUN_TXID_BYTE_LENGTH, { strict: true })
}

/**
 * A PPOI-complete Transact is one whose canonical byte fields are already at
 * full 32-byte width. RPC sources can emit truncated fields; PPOI-complete
 * sources (subsquid, snapshot) do not.
 * @param transact - Scanner Transact action.
 * @returns True when the action is PPOI-complete.
 */
function isPpoiCompleteTransact (transact: Transact): boolean {
  if (
    !isBytes32(transact.txID) ||
    !isBytes32(transact.boundParamsHash) ||
    !transact.nullifiers.every(isBytes32) ||
    !transact.commitments.every(commitment => isBytes32(commitment.hash))
  ) {
    return false
  }
  if (!transact.hasUnshield) {
    return true
  }
  if (
    transact.unshieldToAddress === undefined ||
    transact.unshieldToken === undefined ||
    transact.unshieldValue === undefined
  ) {
    throw new Error('PPOI-complete Transact unshield is missing unshield data')
  }
  return true
}

/**
 * Lift Transact's optional unshield fields into a structured DTO.
 * @param transact - Scanner Transact action.
 * @returns Unshield DTO or null when the Transact has no unshield.
 */
function formatUnshield (transact: Transact): ScannedRailgunTransactionUnshield | null {
  if (!transact.hasUnshield) {
    return null
  }
  return {
    to: transact.unshieldToAddress!,
    token: transact.unshieldToken!,
    value: transact.unshieldValue!,
  }
}

/**
 * Extract canonical Railgun transactions from a scanned EVM block.
 * PPOI-incomplete (e.g. RPC-source) Transact actions are filtered out.
 * @param block - Scanned EVM block.
 * @param txidVersion - Railgun txid version. Defaults to V2.
 * @returns Storage-agnostic Railgun-tx DTOs.
 */
function extractRailgunTransactions (
  block: EVMBlock,
  txidVersion: RailgunTxidVersion = RailgunTxidVersion.V2
): ScannedRailgunTransaction[] {
  const out: ScannedRailgunTransaction[] = []

  for (const tx of block.transactions) {
    const actions = tx.actions.flat()
    for (const action of actions) {
      if (
        action.actionType !== ActionType.TransactCommitment &&
        action.actionType !== ActionType.EncryptedCommitment
      ) {
        continue
      }
      const transact = action as Transact
      if (!isPpoiCompleteTransact(transact)) {
        continue
      }
      out.push({
        railgunTxid: normalizeBytes32(transact.txID),
        txidVersion,
        chainTxid: normalizeBytes32(tx.hash),
        blockNumber: block.number,
        timestamp: block.timestamp,
        nullifiers: transact.nullifiers.map(normalizeBytes32),
        commitments: transact.commitments.map(c => normalizeBytes32(c.hash)),
        boundParamsHash: normalizeBytes32(transact.boundParamsHash),
        hasUnshield: transact.hasUnshield,
        unshield: formatUnshield(transact),
        utxoTreeIn: transact.utxoTreeIn,
        utxoTreeOut: transact.utxoTreeOut,
        utxoBatchStartPositionOut: transact.utxoBatchStartPositionOut,
      })
    }
  }

  return out
}

export { extractRailgunTransactions, RailgunTxidVersion }
export type { ScannedRailgunTransaction, ScannedRailgunTransactionUnshield }
