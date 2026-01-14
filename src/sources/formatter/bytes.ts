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
 * @param hex - Input hex string
 * @returns - Uint8Array representation of hex string
 */
function hexToBytes (hex: string) : Uint8Array {
  hex = padEven(strip0x(hex))
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/**
 * Convert bigint number to bytes
 * @param n - Input bigint/string number
 * @returns - Uint8Array representation of bigint
 */
function bigIntToBytes (n: bigint) : Uint8Array {
  // Convert bigint to hex and pad it to even
  const hex = padEven(n.toString(16))
  return hexToBytes(hex)
}

export { hexToBytes, bigIntToBytes }
