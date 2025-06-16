import type { RPCEvent } from '../data-source/types'

/**
 * pad hex string
 * @param data - input data
 * @returns padded string
 */
const padTo32BytesStart = (data: string): string => {
  const padded = data
    .substring(2)
    .padStart(64, '0')
  return `0x${padded}`
}

/**
 * Convert bigint to string
 * @param data - input data
 * @returns paddedHex string
 */
function bigIntToPaddedHexString (data: bigint): string {
  const hex = data.toString(16)
  const padded = hex.length % 2 === 0 ? hex : '0' + hex
  return `0x${padded}`
}

/**
 * Pad hex string to event length
 * @param hexString - input hex string
 * @returns padded hex string
 */
const padHexStringToEven = (hexString: string): string => {
  const stripped = hexString.substring(2)
  const padded = stripped.length % 2 === 0 ? stripped : '0' + stripped
  return `0x${padded}`
}

/**
 * Format nullifier event data
 * @param e - eventData
 * @returns formatted eventData
 */
function handleNullifier (e: RPCEvent): Array<RPCEvent> {
  const nullifiers = e.args['nullifier']
  const treeNumber = e.args['treeNumber']
  const { blockNumber, transactionHash } = e

  const nullifiedEvents = new Array<RPCEvent>()
  for (let i = 0; i < nullifiers.length; i++) {
    // Making compatible with subgraph
    const nullifier = padTo32BytesStart(bigIntToPaddedHexString(nullifiers[i]))

    const args = {
      treeNumber,
      nullifier
    }

    nullifiedEvents.push({
      name: e.name,
      transactionIndex: e.transactionIndex,
      logIndex: e.logIndex,
      blockNumber,
      transactionHash,
      args
    })
  }

  return nullifiedEvents
}

type Ciphertext = {
  iv: string;
  tag: string;
  data: string[]
}

/**
 * Parse IV
 * @param ciphertext - ciphertext
 * @returns iv
 */
const getCiphertextIV = (ciphertext: string[]): string => {
  const ivTag = padTo32BytesStart(ciphertext[0]!).substring(2)
  return `0x${ivTag.substring(0, 32)}`
}

/**
 * Parse tag
 * @param ciphertext - cipheretext
 * @returns tag
 */
const getCiphertextTag = (ciphertext: string[]): string => {
  const ivTag = padTo32BytesStart(ciphertext[0]!).substring(2)
  return `0x${ivTag.substring(32)}`
}

// @TODO multiple stripping of 0x prefix and appending is happening here and can be removed
/**
 * Return data
 * @param ciphertext - input ciphertext
 * @returns data
 */
const getCiphertextData = (ciphertext: string[]): string[] => {
  const data = ciphertext.slice(1).map((dataField) => {
    return padTo32BytesStart(dataField.toString())
  })
  return data
}

/*
 *  ciphertexts: BigInt represented as hex string starting with 0x
*/
/**
 * Create ciphertext struct
 * @param ciphertexts - input ciphertext
 * @returns formatted ciphertext
 */
function parseCiphertext (ciphertexts: string[]): Ciphertext {
  const iv = getCiphertextIV(ciphertexts)
  const tag = getCiphertextTag(ciphertexts)
  const data = getCiphertextData(ciphertexts)
  return {
    iv,
    tag,
    data
  }
}

/**
 * Handle transact event
 * @param e - event
 * @returns - formatted events
 */
function handleTransact (
  e: RPCEvent
): RPCEvent[] {
  const ciphertextStructs = e.args['ciphertext']
  const ciphertexts = new Array<Ciphertext>()
  const commitmentCiphertexts = new Array<{
    ciphertext: Ciphertext,
    blindedSenderViewingKey: string,
    blindedReceiverViewingKey: string,
    annotationData: string,
    memo: string
  }>()
  const formattedEvents = new Array<RPCEvent>()

  const batchStartTreePosition = e.args['startPosition']
  const hashes = e.args['hash']
  for (let i = 0; i < ciphertextStructs.length; i++) {
    const ciphertextStruct = ciphertextStructs[i]

    const treeNumber = e.args['treeNumber']
    const treePosition = batchStartTreePosition + BigInt(i)
    const ciphertext = parseCiphertext(
      ciphertextStruct.ciphertext.map((ct: string) => padHexStringToEven(ct))
    )
    ciphertexts.push(ciphertext)

    commitmentCiphertexts.push({
      ciphertext,
      blindedSenderViewingKey: ciphertextStruct.blindedSenderViewingKey,
      blindedReceiverViewingKey: ciphertextStruct.blindedReceiverViewingKey,
      annotationData: ciphertextStruct.annotationData,
      memo: ciphertextStruct.memo,
    })

    formattedEvents.push({
      name: e.name,
      blockNumber: e.blockNumber,
      transactionHash: e.transactionHash,
      logIndex: e.logIndex,
      transactionIndex: e.transactionIndex,
      args: {
        treeNumber,
        batchStartTreePosition,
        treePosition: Number(treePosition),
        hash: BigInt(hashes[i]),
        ciphertext: commitmentCiphertexts,
      }
    })
  }
  return formattedEvents
}

/**
 * Get token type from number
 * @param tokenType - number representation of tokentype
 * @returns string token type
 */
const getTokenType = (tokenType: number): string => {
  switch (Number(tokenType)) {
    case 0:
      return 'ERC20'
    case 1:
      return 'ERC721'
    case 2:
      return 'ERC1155'
  }
  console.log(tokenType)
  throw new Error('Unhandled token type')
}

/**
 * Format unshield event
 * @param e - unshield event
 * @returns formatted unshieldEvent
 */
function handleUnshield (e: RPCEvent): RPCEvent[] {
  const tokenInfo = e.args['token']
  const to = e.args['to']
  const amount = e.args['amount']
  const fee = e.args['fee']

  const token = {
    tokenType: getTokenType(Number(tokenInfo[0])),
    tokenAddress: tokenInfo[1],
    tokenSubID: `0x${BigInt(tokenInfo[2]).toString(16)}`
  }

  return [{
    name: e.name,
    blockNumber: e.blockNumber,
    transactionHash: e.transactionHash,
    transactionIndex: e.transactionIndex,
    logIndex: e.logIndex,
    args: {
      to,
      amount,
      fee,
      token
    }
  }]
}

/**
 * Format shield event
 * @param e - input event data
 * @returns - Array of destructured event
 */
function handleShield (
  e: RPCEvent
): RPCEvent[] {
  const commitments = e.args['commitments']
  const startPosition = e.args['startPosition']
  const shieldCiphertext = e.args['shieldCiphertext']
  const fees = e.args['fees']
  const formattedEvents = new Array<RPCEvent>()

  for (let i = 0; i < commitments.length; i++) {
    const commitment = commitments[i]

    const treePosition = startPosition + BigInt(i)
    const tokenInfo = commitment[1]
    const token = {
      tokenType: getTokenType(Number(tokenInfo[0])),
      tokenAddress: tokenInfo[1],
      tokenSubID: `0x${BigInt(tokenInfo[2]).toString(16)}`
    }
    const npk = commitment[0]

    const preimage = {
      npk,
      token,
      value: commitment[2]
    }

    // fee is not present in new LegacyShield
    const fee = fees ?? fees[i]
    const encryptedBundle = shieldCiphertext[i][0]
    formattedEvents.push({
      name: e.name,
      blockNumber: e.blockNumber,
      transactionHash: e.transactionHash,
      transactionIndex: e.transactionIndex,
      logIndex: e.logIndex,
      args: {
        treeNumber: e.args['treeNumber'],
        batchStartTreePosition: startPosition,
        treePosition,
        shieldKey: shieldCiphertext[i][1],
        encryptedBundle,
        preimage,
        fee
      }
    })
  }
  return formattedEvents
}

/**
 * Format RPC event
 * @param e - input event
 * @returns - array of destructured event
 */
function formatEvents (e: RPCEvent) {
  switch (e.name) {
    case 'Shield':
      return handleShield(e)
    case 'Unshield':
      return handleUnshield(e)
    case 'Transact':
      return handleTransact(e)
    case 'Nullified':
      return handleNullifier(e)
    default:
      throw new Error(`Unhandled event ${e.name}`)
  }
}

export { formatEvents }
