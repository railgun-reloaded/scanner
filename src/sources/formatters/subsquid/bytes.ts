import { hexToBytes as hexToBytesStrict, stripHexPrefix } from '@railgun-reloaded/bytes'

/**
 * Decodes a hex string from a Subsquid response into a byte array.
 *
 * Subsquid serializes some numeric fields as odd-length hex (e.g. `0x4c47554`
 * for the value `0x04c47554`), so this wrapper left-pads odd-length input
 * with a leading zero before delegating to the strict decoder.
 *
 * Use this exclusively for Subsquid-sourced fields. For everything else,
 * prefer `hexToBytes` from `@railgun-reloaded/bytes` directly so malformed
 * input is rejected rather than silently padded.
 * @param input - Hex string from a Subsquid response, with or without `0x` prefix.
 * @returns Decoded bytes.
 * @throws If `input` is empty or contains non-hex characters.
 */
const hexToBytes = (input: string): Uint8Array => {
  if (!input) {
    throw new Error(`Invalid hexadecimal input ${input}`)
  }

  const stripped = stripHexPrefix(input)
  const padded = stripped.length % 2 === 0 ? stripped : `0${stripped}`
  return hexToBytesStrict(padded)
}

export { hexToBytes }
