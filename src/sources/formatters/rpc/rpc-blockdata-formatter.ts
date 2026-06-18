import { hexToBytes } from '@railgun-reloaded/bytes'

import type { Action, EVMBlock, EVMTransaction } from '../../../models/index.js'

import { EventName } from './constants.js'
import { formatShieldFromRPC } from './rpc-shield-formatter.js'
import { formatTransactFromRPC } from './rpc-transact-formatter.js'
import { formatUnshieldFromRPC } from './rpc-unshield-formatter.js'

type DecodedLog = {
  eventName: string
  args: Record<string, any>
  blockNumber: bigint
  blockHash: string
  blockTimestamp: bigint
  transactionHash: string
  transactionIndex: number
  logIndex: number
  address: string
}

type BlockBucket = {
  number: bigint
  hash: string
  timestamp: bigint
  transactions: Map<string, {
    hash: string
    index: number
    from: string
    actions: Action[]
  }>
}

/**
 * Dispatch a decoded RAILGUN log to the matching action formatter.
 * Throws on unknown event names so the caller can decide whether to skip or surface the error.
 * @param log - Decoded EVM log with event name and typed args
 * @returns The canonical Action (Shield / Transact / Unshield)
 */
function formatActionFromRPC (log: DecodedLog): Action {
  const { eventName, args, logIndex, transactionHash } = log

  switch (eventName) {
    case EventName.Shield:
    case EventName.GeneratedCommitmentBatch:
      return formatShieldFromRPC(eventName, args)

    case EventName.Transact:
    case EventName.CommitmentBatch:
      return formatTransactFromRPC(eventName, args, transactionHash)

    case EventName.Unshield:
      return formatUnshieldFromRPC(args, logIndex)

    default:
      throw new Error(`Unknown event type: ${eventName}`)
  }
}

/**
 * Bucket a flat list of decoded logs into EVMBlock[] grouped by block,
 * then by transaction within each block. Logs whose event type is unknown
 * are silently skipped so unrelated proxy events don't break the stream.
 * The returned blocks are sorted by block number ascending.
 * @param logs - Decoded logs from a single range query, in any order
 * @returns Blocks in ascending order, each with its transactions and actions
 */
function groupLogsByBlock (logs: DecodedLog[]): EVMBlock[] {
  const blockMap = new Map<string, BlockBucket>()

  for (const log of logs) {
    const blockKey = log.blockNumber.toString()

    let block = blockMap.get(blockKey)
    if (!block) {
      block = {
        number: log.blockNumber,
        hash: log.blockHash,
        timestamp: log.blockTimestamp,
        transactions: new Map()
      }
      blockMap.set(blockKey, block)
    }

    const txKey = log.transactionHash
    let tx = block.transactions.get(txKey)
    if (!tx) {
      tx = {
        hash: log.transactionHash,
        index: log.transactionIndex,
        from: log.address,
        actions: []
      }
      block.transactions.set(txKey, tx)
    }

    try {
      tx.actions.push(formatActionFromRPC(log))
    } catch {
      // skip logs with unknown event types
    }
  }

  const blocks: EVMBlock[] = []

  for (const block of blockMap.values()) {
    const transactions: EVMTransaction[] = []

    for (const tx of block.transactions.values()) {
      if (tx.actions.length > 0) {
        transactions.push({
          hash: hexToBytes(tx.hash),
          index: tx.index,
          from: hexToBytes(tx.from),
          actions: [tx.actions]
        })
      }
    }

    if (transactions.length > 0) {
      blocks.push({
        number: block.number,
        hash: hexToBytes(block.hash),
        timestamp: block.timestamp,
        transactions
      })
    }
  }

  return blocks.sort((a, b) => Number(a.number - b.number))
}

export { groupLogsByBlock }
export type { DecodedLog }
