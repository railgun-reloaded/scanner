import { hexToBytes } from '@railgun-reloaded/bytes'

import type { Action, EVMBlock, EVMTransaction } from '../../../models/index.js'
import { ActionType } from '../../../models/index.js'
import type { RawMemoPayload } from '../memo.js'
import { flattenMemo } from '../memo.js'

type SnapshotBytes = Uint8Array | string

type SnapshotActionData = {
  actionType: string
  commitments?: Array<{
    memo: RawMemoPayload
  } & Record<string, unknown>>
} & Record<string, unknown>

type SnapshotTransactionData = {
  hash: SnapshotBytes
  index: number
  from: SnapshotBytes
  actions: SnapshotActionData[][]
}

type SnapshotBlockData = {
  number: bigint
  hash: SnapshotBytes
  timestamp: bigint
  transactions: SnapshotTransactionData[]
}

type SnapshotData = {
  startHeight: bigint
  endHeight: bigint
  blocks: SnapshotBlockData[]
}

type SnapshotContent = {
  startHeight: bigint
  endHeight: bigint
  blocks: EVMBlock[]
}

/**
 * Convert snapshot byte fields to scanner bytes.
 * @param value - Snapshot byte representation.
 * @returns Scanner byte representation.
 */
function formatBytes (value: SnapshotBytes): Uint8Array {
  return typeof value === 'string'
    ? hexToBytes(value, { allowOddLength: true })
    : value
}

/**
 * Adapt one snapshot action to a scanner action.
 * @param action - Snapshot action.
 * @returns Scanner action.
 */
function formatAction (action: SnapshotActionData): Action {
  if (!Object.values(ActionType).includes(action.actionType as ActionType)) {
    throw new Error(`Invalid decoded snapshot: unknown action type ${action.actionType}`)
  }

  if (
    action.actionType !== ActionType.TransactCommitment &&
    action.actionType !== ActionType.EncryptedCommitment
  ) {
    return action as unknown as Action
  }

  if (!action.commitments) {
    throw new Error('Invalid decoded snapshot: commitments must be an array')
  }

  return {
    ...action,
    commitments: action.commitments.map(commitment => ({
      ...commitment,
      memo: flattenMemo(commitment.memo)
    }))
  } as unknown as Action
}

/**
 * Adapt one snapshot transaction to a scanner transaction.
 * @param transaction - Snapshot transaction.
 * @returns Scanner transaction.
 */
function formatTransaction (
  transaction: SnapshotTransactionData
): EVMTransaction {
  return {
    hash: formatBytes(transaction.hash),
    index: transaction.index,
    from: formatBytes(transaction.from),
    actions: transaction.actions.map(actions => actions.map(formatAction))
  }
}

/**
 * Adapt one snapshot block to a scanner block.
 * @param block - Snapshot block.
 * @returns Scanner block.
 */
function formatBlock (block: SnapshotBlockData): EVMBlock {
  return {
    number: block.number,
    hash: formatBytes(block.hash),
    timestamp: block.timestamp,
    transactions: block.transactions.map(formatTransaction)
  }
}

/**
 * Adapt snapshot-owned decoded data for scanner iteration.
 * @param snapshot - Decoded snapshot.
 * @returns Scanner snapshot content.
 */
function formatSnapshot (snapshot: SnapshotData): SnapshotContent {
  return {
    startHeight: snapshot.startHeight,
    endHeight: snapshot.endHeight,
    blocks: snapshot.blocks.map(formatBlock)
  }
}

export { formatSnapshot }
export type { SnapshotContent, SnapshotData }
