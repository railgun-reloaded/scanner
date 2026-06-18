/**
 * Compute the producer-compatible CIDv1 for snapshot artifact bytes.
 * @param bytes - Compressed snapshot artifact bytes.
 * @returns Base32 CIDv1 using dag-cbor and sha2-256.
 */
async function dagCborCIDFromBytes (bytes: Uint8Array): Promise<string> {
  const [
    dagCbor,
    { CID },
    { sha256 }
  ] = await Promise.all([
    import('@ipld/dag-cbor'),
    import('multiformats/cid'),
    import('multiformats/hashes/sha2')
  ])

  const hash = await sha256.digest(bytes)
  return CID.createV1(dagCbor.code, hash).toString()
}

/**
 * Verify snapshot artifact bytes against an expected CID.
 * @param bytes - Compressed snapshot artifact bytes.
 * @param expectedCid - CID configured for the snapshot.
 */
async function verifyDagCborCID (
  bytes: Uint8Array,
  expectedCid: string
): Promise<void> {
  const [{ CID }, actualCid] = await Promise.all([
    import('multiformats/cid'),
    dagCborCIDFromBytes(bytes)
  ])

  let expected
  try {
    expected = CID.parse(expectedCid)
  } catch (err) {
    throw new Error(`Invalid expected snapshot CID: ${expectedCid}`, {
      cause: err
    })
  }

  if (!CID.parse(actualCid).equals(expected)) {
    throw new Error(
      `Snapshot CID mismatch: expected ${expectedCid}, got ${actualCid}`
    )
  }
}

export { dagCborCIDFromBytes, verifyDagCborCID }
