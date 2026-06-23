import { hexToBytes } from '@railgun-reloaded/bytes'

type RawMemoBytes = string | bigint | Uint8Array | readonly number[]
type RawMemoPayload = RawMemoBytes | ReadonlyArray<RawMemoBytes>

/**
 * 32 zero bytes. Some source payloads preserve this single-entry sentinel
 * exactly while others strip leading zero bytes down to `0x`, `0x0`, or one
 * zero byte. Treating all single zero-only payloads up to this width as
 * "empty" lets the decryptor skip the memo append for no-memo commitments.
 */
const MEMO_NO_MEMO_SENTINEL: Uint8Array = new Uint8Array(32)

/**
 * Collapse raw memo payloads into a single `Uint8Array` that matches engine's
 * runtime view. RPC and Subsquid can expose memo as a single bytes field or as
 * an array of word-like entries; decoded snapshots can already carry bytes.
 * Returns empty when the payload is the contract's no-memo sentinel; otherwise
 * concatenates every entry verbatim.
 *
 * The decryptor appends this buffer to the AES-GCM-tagged ciphertext data
 * array when its length > 0, matching the contract's tag-computation input.
 * @param rawMemo - Memo payload straight from the indexer/RPC/snapshot.
 * @returns Single concatenated memo buffer.
 */
function flattenMemo (rawMemo: RawMemoPayload): Uint8Array {
  const entries = rawMemoToEntries(rawMemo).map(decodeMemoBytes)
  if (entries.length === 0) {
    return new Uint8Array(0)
  }
  if (entries.length === 1 && isNoMemoSentinel(entries[0] as Uint8Array)) {
    return new Uint8Array(0)
  }
  let totalLength = 0
  for (const entry of entries) totalLength += entry.length
  const out = new Uint8Array(totalLength)
  let offset = 0
  for (const entry of entries) {
    out.set(entry, offset)
    offset += entry.length
  }
  return out
}

/**
 * Distinguish a decoded byte array from an array of memo entries.
 * @param value - Raw value from a source payload.
 * @returns True when the value is a plain array of byte numbers.
 */
function isNumberArray (value: unknown): value is readonly number[] {
  return Array.isArray(value) && value.every(entry => typeof entry === 'number')
}

/**
 * Determine whether a value is a scalar memo bytes payload.
 * @param value - Raw value from a source payload.
 * @returns True when the value should be decoded as one memo payload.
 */
function isRawMemoBytes (value: RawMemoPayload): value is RawMemoBytes {
  return (
    typeof value === 'string' ||
    typeof value === 'bigint' ||
    value instanceof Uint8Array ||
    isNumberArray(value)
  )
}

/**
 * Convert a source memo payload into entry-shaped chunks.
 * @param rawMemo - Raw memo payload.
 * @returns Entries to decode and concatenate.
 */
function rawMemoToEntries (rawMemo: RawMemoPayload): RawMemoBytes[] {
  if (isRawMemoBytes(rawMemo)) {
    return [rawMemo]
  }
  return [...rawMemo]
}

/**
 * Decode one memo entry into bytes while preserving nonzero payload length.
 * @param entry - Raw memo entry.
 * @returns Decoded bytes.
 */
function decodeMemoBytes (entry: RawMemoBytes): Uint8Array {
  if (typeof entry === 'string') {
    return hexToBytes(entry, { allowOddLength: true })
  }
  if (typeof entry === 'bigint') {
    if (entry < 0n) throw new Error('Memo bigint entry cannot be negative')
    return hexToBytes(entry.toString(16), { allowOddLength: true })
  }
  if (entry instanceof Uint8Array) {
    return entry
  }

  const bytes = new Uint8Array(entry.length)
  for (let i = 0; i < entry.length; i++) {
    const value = entry[i]
    if (value === undefined || !Number.isInteger(value) || value < 0 || value > 255) {
      throw new Error('Memo byte array entry must contain byte values')
    }
    bytes[i] = value
  }
  return bytes
}

/**
 * Determine whether a memo entry is the "no memo" sentinel (all zero bytes
 * no longer than the sentinel length).
 * @param entry - Raw memo entry bytes.
 * @returns True when the entry is the no-memo sentinel.
 */
function isNoMemoSentinel (entry: Uint8Array): boolean {
  if (entry.length > MEMO_NO_MEMO_SENTINEL.length) return false
  for (let i = 0; i < entry.length; i++) {
    if (entry[i] !== 0) return false
  }
  return true
}

export { MEMO_NO_MEMO_SENTINEL, flattenMemo }
export type { RawMemoPayload }
