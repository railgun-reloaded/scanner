import type { Token } from '../../models'

import { hexToBytes } from './bytes'

/**
 * Format input token to Token object
 * @param token - Input token to format
 * @returns - Formatted Token object
 */
function formatToken (token: Record<string, any>) : Token {
  return {
    id: hexToBytes(token['id']),
    tokenType: token['tokenType'],
    tokenSubID: hexToBytes(token['tokenSubID']),
    tokenAddress: hexToBytes(token['tokenAddress'])
  }
}

export { formatToken }
