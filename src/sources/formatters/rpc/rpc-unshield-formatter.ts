import type { Unshield } from '../../../models'
import { ActionType } from '../../../models'

import { formatTokenFromRPC, hexToBytes } from '../shared'

/**
 *
 * @param args
 * @param logIndex
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
