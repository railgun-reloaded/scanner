import type { Token, Unshield } from '../../../models'
import { ActionType } from '../../../models'

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

/**
 *
 * @param tokenData
 */
function formatTokenFromRPC (tokenData: any): Token {
  return {
    id: hexToBytes(tokenData.tokenAddress),
    tokenType: String(tokenData.tokenType),
    tokenSubID: hexToBytes(tokenData.tokenSubID || '0x00'),
    tokenAddress: hexToBytes(tokenData.tokenAddress)
  }
}

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
