/**
 * Strip 0x from the hex string if present
 * @param hex - Input hex string
 * @returns Stripped hex string
 */
function strip0x (hex: string) : string {
  if (hex.startsWith('0x')) { return hex.substring(2) }
  return hex
}

/**
 * Pad hex string to even length
 * @param hex - Input hex string
 * @returns Padded hex string
 */
function padEven (hex: string) : string {
  if (hex.length % 2 === 0) return hex
  return `0${hex}`
}

/**
 * Convert hex string without 0x prefix to Uint8Array
 * @param input - Input hex string
 * @returns - Uint8Array representation of hex string
 */
function hexToBytes (input: string) : Uint8Array {
  if (!input) {
    throw new Error(`Invalid hexadecimal input ${input}`)
  }

  const hex = padEven(strip0x(input))

  // Regex to test for hex, also passes for '0x' string
  const isHex = /^[0-9a-fA-F]*$/.test(hex)
  if (!isHex) {
    throw new Error(`${hex} is not a valid hexadecimal string`)
  }

  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

export { hexToBytes }
