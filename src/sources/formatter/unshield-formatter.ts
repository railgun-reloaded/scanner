import type { Unshield } from '../../models'
import { ActionType } from '../../models'

import { hexToBytes } from './bytes'
import { formatToken } from './token-formatter'

/**
 * Format input unshield object to Unshield
 * @param unshield - Input unshield to format
 * @returns - Formatted RailgunUnshield object
 */
function formatUnshield (unshield : Record<string, any>) : Unshield {
  return {
    actionType: ActionType.Unshield,
    to: hexToBytes(unshield['to']),
    token: formatToken(unshield['token']),
    amount: BigInt(unshield['amount']),
    fee: BigInt(unshield['fee']),
    eventLogIndex: Number(unshield['eventLogIndex'])
  }
}

export { formatUnshield }
