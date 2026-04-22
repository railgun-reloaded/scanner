import type { Unshield } from '../../../models'
import { ActionType } from '../../../models'
import { formatTokenFromRPC, hexToBytes } from '../shared'

/**
 * Format a decoded V2 `Unshield` event into the canonical Unshield action.
 * `logIndex` is preserved so the wallet can match an unshield back to its
 * enclosing Transact action when reconstructing transaction history.
 * @param args - Decoded event args (to, token struct, amount, optional fee)
 * @param logIndex - Index of this log within the transaction's log array
 * @returns Canonical Unshield action
 */
function formatUnshieldFromRPC (args: any, logIndex: number): Unshield {
  return {
    actionType: ActionType.Unshield,
    to: hexToBytes(args.to),
    token: formatTokenFromRPC(args.token),
    amount: BigInt(args.amount),
    fee: BigInt(args.fee || 0),
    eventLogIndex: logIndex
  }
}

export { formatUnshieldFromRPC }
