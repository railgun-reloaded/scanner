import type { Action, EVMBlock, EVMTransaction } from '../../models'

import { hexToBytes } from './bytes'
import { formatShield } from './shield-formatter'
import { formatTransact } from './transact-formatter'
import { formatUnshield } from './unshield-formatter'

/**
 * Format input action data to Action
 * @param action - Input action data
 * @returns - Formatted Action object
 */
function formatActionData (action: Record<string, any>) : Action {
  const actionType = action['actionType']

  switch (actionType) {
    case 'Shield':
    case 'GeneratedCommitmentBatch':
      return formatShield(action)
    case 'Transact':
    case 'CommitmentBatch':
      return formatTransact(action)
    case 'Unshield':
      return formatUnshield(action)
    default:
      throw new Error(`Unknown action type ${actionType}`)
  }
}

/**
 * Format input transaction data to EvmTransaction
 * @param transaction - Input transaction data to format
 * @returns - Formatted EvmTransaction object
 */
function formatTransaction (transaction: Record<string, any>) : EVMTransaction {
  return {
    hash: hexToBytes(transaction['hash']),
    index: Number(transaction['index']),
    from: hexToBytes(transaction['from']),
    actions: transaction['actions'].map(
      (actions: Record<string, any>[]) => actions.map(formatActionData)
    )
  }
}

/**
 * Format input blockData to EVMBlock
 * @param block - Input block data to format
 * @returns - Formatted EvmBlock object
 */
function formatBlockData (block: Record<string, any>) : EVMBlock {
  return {
    number: BigInt(block['number']),
    hash: hexToBytes(block['hash']),
    timestamp: BigInt(block['timestamp']),
    transactions: block['transactions'].map(formatTransaction)
  }
}

export { formatBlockData }
