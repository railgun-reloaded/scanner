import { hexToBytes } from '@railgun-reloaded/bytes'

import type { Unshield } from '../../../models/index.js'
import { ActionType } from '../../../models/index.js'

import { formatToken } from './token-formatter.js'

/**
 * Format input unshield object to Unshield
 * @param unshield - Input unshield to format
 * @returns - Formatted RailgunUnshield object
 */
function formatUnshield (unshield : Record<string, any>) : Unshield {
  return {
    actionType: ActionType.Unshield,
    to: hexToBytes(unshield['to'], { allowOddLength: true }),
    token: formatToken(unshield['token']),
    amount: BigInt(unshield['amount']),
    fee: BigInt(unshield['fee']),
    eventLogIndex: Number(unshield['eventLogIndex'])
  }
}

export { formatUnshield }
