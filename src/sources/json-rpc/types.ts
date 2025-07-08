/**
 * JSON-RPC 2.0 Request interface
 */
export interface JSONRPCRequest {
  jsonrpc: '2.0'
  method: string
  params?: any[]
  id: number
}

/**
 * JSON-RPC 2.0 Response interface
 */
export interface JSONRPCResponse<T = any> {
  jsonrpc: '2.0'
  id: number
  result?: T
  error?: {
    code: number
    message: string
    data?: any
  }
}

/**
 * JSON-RPC 2.0 Error interface
 */
export interface JSONRPCError {
  code: number
  message: string
  data?: any
}

/**
 * Request data for internal queue management
 */
export interface RequestData {
  id: number
  request: JSONRPCRequest
  resolve: (value: any) => void
  reject: (error: any) => void
}

/**
 * Common Ethereum JSON-RPC method parameters
 */
export interface EthGetLogsParams {
  fromBlock?: string
  toBlock?: string
  address?: string | string[]
  topics?: (string | string[] | null)[]
}

/**
 * Ethereum log object
 */
export interface EthLog {
  address: string
  blockHash: string
  blockNumber: string
  data: string
  logIndex: string
  removed: boolean
  topics: string[]
  transactionHash: string
  transactionIndex: string
}

/**
 * Ethereum transaction object
 */
export interface EthTransaction {
  hash: string
  blockHash: string
  blockNumber: string
  from: string
  gas: string
  gasPrice: string
  input: string
  nonce: string
  to: string
  transactionIndex: string
  value: string
  v: string
  r: string
  s: string
}

/**
 * Ethereum block object
 */
export interface EthBlock {
  number: string
  hash: string
  parentHash: string
  timestamp: string
  transactions: string[] | EthTransaction[]
  [key: string]: any
}
