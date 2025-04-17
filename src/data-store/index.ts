import fs from 'node:fs'

import * as msgpk from '@msgpack/msgpack'

/**
 *  Reads a file and decodes its contents using MessagePack.
 * @param filePath - Path of the file to read.
 * @returns The decoded data or undefined if the file does not exist or an error occurs.
 */
const readFile = <T>(filePath: string) => {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    return undefined
  }
  try {
    const data = fs.readFileSync(filePath)
    const decoded = msgpk.decode(data)
    return decoded as T
  } catch (error) {
    console.error(`Error reading or parsing file: ${filePath}`, error)
    return undefined
  }
}

/**
 * Saves a JSON file to the specified path.
 * @param filePath - The path to the file where the data will be saved
 * @param data - The data to be saved
 */
const saveFile = (filePath: string, data: any) => {
  try {
    // this is because treehandler is expecting stringified json object
    // giving it bigints will give invalid merkle root
    // OG: const encoded = msgpk.encode(data, {useBigInt64: true});
    // this should chunk the data and write it sequentially,
    // append only style...
    const encoded = msgpk.encode(stringifyBigInts(data))
    fs.writeFileSync(filePath, encoded)
  } catch (error) {
    console.error(`Error writing to file: ${filePath}`, error)
  }
}
/**
 * Recursively stringify BigInt values in an object or array.
 * @param obj - The object to stringify
 * @returns The object with BigInt values converted to strings
 */
const stringifyBigInts = (obj: any): any => {
  if (typeof obj === 'bigint') {
    return obj.toString()
  }

  if (Array.isArray(obj)) {
    return obj.map(stringifyBigInts)
  }

  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, stringifyBigInts(value)])
    )
  }

  return obj
}

export { saveFile, readFile }
