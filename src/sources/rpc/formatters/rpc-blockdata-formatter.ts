import type { Action, EVMBlock, EVMTransaction } from '../../../models'

import { formatShieldFromRPC } from './rpc-shield-formatter'
import { formatTransactFromRPC } from './rpc-transact-formatter'
import { formatUnshieldFromRPC } from './rpc-unshield-formatter'

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

/**
 *
 * @param log
 */
function formatActionFromRPC (log: DecodedLog): Action {
  const { eventName, args, logIndex } = log

  switch (eventName) {
    case 'Shield':
    case 'GeneratedCommitmentBatch':
      return formatShieldFromRPC(eventName, args)

    case 'Transact':
    case 'CommitmentBatch':
      return formatTransactFromRPC(eventName, args)

    case 'Unshield':
      return formatUnshieldFromRPC(args, logIndex)

    default:
      throw new Error(`Unknown event type: ${eventName}`)
  }
}

/**
 *
 * @param logs
 */
function groupLogsByBlock (logs: DecodedLog[]): EVMBlock[] {
  const blockMap = new Map<string, {
    number: bigint
    hash: string
    timestamp: bigint
    transactions: Map<string, {
      hash: string
      index: number
      from: string
      actions: Action[]
    }>
  }>()

  for (const log of logs) {
    const blockKey = log.blockNumber.toString()

    if (!blockMap.has(blockKey)) {
      blockMap.set(blockKey, {
        number: log.blockNumber,
        hash: log.blockHash,
        timestamp: log.blockTimestamp,
        transactions: new Map()
      })
    }

    const block = blockMap.get(blockKey)!
    const txKey = log.transactionHash

    if (!block.transactions.has(txKey)) {
      block.transactions.set(txKey, {
        hash: log.transactionHash,
        index: log.transactionIndex,
        from: log.address,
        actions: []
      })
    }

    try {
      const action = formatActionFromRPC(log)
      block.transactions.get(txKey)!.actions.push(action)
    } catch (err) {
      console.warn(`Failed to format action for log ${log.logIndex}:`, err)
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
