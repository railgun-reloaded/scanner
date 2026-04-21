import type { Token } from '../../../models'

import { hexToBytes } from './bytes'

/**
 * Format token data from RPC event args
 * @param tokenData - Token data from contract event
 * @returns Formatted Token object
 */
function formatTokenFromRPC (tokenData: any): Token {
  return {
    id: hexToBytes(tokenData.tokenAddress),
    tokenType: String(tokenData.tokenType),
    tokenSubID: hexToBytes(tokenData.tokenSubID || '0x00'),
    tokenAddress: hexToBytes(tokenData.tokenAddress)
  }
}

export { formatTokenFromRPC }
