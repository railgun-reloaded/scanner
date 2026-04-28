import { hexToBytes } from '@railgun-reloaded/bytes'

import type { Token } from '../../../models'

/**
 * Format input token to Token object
 * @param token - Input token to format
 * @returns - Formatted Token object
 */
function formatToken (token: Record<string, any>) : Token {
  return {
    id: hexToBytes(token['id'], { allowOddLength: true }),
    tokenType: token['tokenType'],
    tokenSubID: hexToBytes(token['tokenSubID'], { allowOddLength: true }),
    tokenAddress: hexToBytes(token['tokenAddress'], { allowOddLength: true })
  }
}

export { formatToken }
