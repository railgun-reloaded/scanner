import { hexToBytes } from '@railgun-reloaded/bytes'

/**
 * 32 zero bytes. The V2 RAILGUN contract emits this single-entry sentinel as
 * `bytes32[] memo` when the sender attached no memo, so the AES-GCM tag for
 * those commitments was computed without any memo bytes. Treating the
 * sentinel as "empty" lets the decryptor skip the memo append for these
 * commitments while still appending real memo bytes for later commitments.
 */
const MEMO_NO_MEMO_SENTINEL: Uint8Array = new Uint8Array(32)

/**
 * Collapse the raw `bytes32[] memo` payload into a single `Uint8Array` that
 * matches engine's runtime view. Returns an empty `Uint8Array` when the
 * payload is the contract's "no memo" sentinel; otherwise concatenates every
 * entry verbatim.
 *
 * The decryptor appends this buffer to the AES-GCM-tagged ciphertext data
 * array when its length > 0, matching the contract's tag-computation input.
 * @param rawMemo - hex-encoded entries straight from the indexer/RPC.
 * @returns Single concatenated memo buffer.
 */
function flattenMemo (rawMemo: ReadonlyArray<string>): Uint8Array {
  if (rawMemo.length === 0) {
    return new Uint8Array(0)
  }
  const entries = rawMemo.map(entry => hexToBytes(entry, { allowOddLength: true }))
  if (entries.length === 1 && isNoMemoSentinel(entries[0]!)) {
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

function isNoMemoSentinel (entry: Uint8Array): boolean {
  if (entry.length !== MEMO_NO_MEMO_SENTINEL.length) return false
  for (let i = 0; i < entry.length; i++) {
    if (entry[i] !== 0) return false
  }
  return true
}

export { MEMO_NO_MEMO_SENTINEL, flattenMemo }
