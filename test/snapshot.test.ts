import assert from 'node:assert'
import { afterEach, describe, mock, test } from 'node:test'
import { brotliCompressSync } from 'node:zlib'

import { SnapshotProvider } from '../src/sources/index.js'
import { dagCborCIDFromBytes } from '../src/sources/snapshot/cid.js'

import { SNAPSHOT_CID_FIXTURE } from './fixtures/snapshot-cid-fixture.js'

afterEach(() => {
  mock.restoreAll()
})

const TEST_IPFS_GATEWAYS = ['https://gateway.test/ipfs/']

/**
 * Encode a producer-compatible DAG-CBOR fixture.
 * @param value - Fixture value to encode.
 * @returns DAG-CBOR bytes.
 */
async function encodeDagCbor (value: unknown): Promise<Uint8Array> {
  const [
    dagCbor,
    { encode },
    { bigIntEncoder }
  ] = await Promise.all([
    import('@ipld/dag-cbor'),
    import('cborg'),
    import('cborg/taglib')
  ])

  return encode(value, {
    ...dagCbor.encodeOptions,
    typeEncoders: {
      ...dagCbor.encodeOptions.typeEncoders,
      bigint: bigIntEncoder
    }
  })
}

/**
 * Copy bytes into an ArrayBuffer suitable for a mocked fetch response.
 * @param bytes - Response bytes.
 * @returns Copied ArrayBuffer.
 */
function arrayBufferFromBytes (bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer
}

/**
 * Mock fetch with a successful binary response.
 * @param bytes - Response bytes.
 */
function mockFetchBytes (bytes: Uint8Array) {
  mock.method(globalThis, 'fetch', async () => ({
    ok: true,
    status: 200,
    /**
     * Resolve to array buffer
     * @returns - Array buffer
     */
    arrayBuffer: async () => arrayBufferFromBytes(bytes),
  } as Response))
}

/**
 * Create a provider whose expected CID matches mocked response bytes.
 * @param bytes - Mocked response bytes.
 * @param expectedCid - Optional expected CID override.
 * @returns Configured snapshot provider.
 */
async function createProviderForBytes (
  bytes: Uint8Array,
  expectedCid?: string
): Promise<SnapshotProvider<any>> {
  mockFetchBytes(bytes)
  return new SnapshotProvider({
    ipfsHash: expectedCid ?? await dagCborCIDFromBytes(bytes),
    gateways: TEST_IPFS_GATEWAYS
  })
}

describe('SnapshotProvider DAG-CBOR decoding', () => {
  test('Should match the shared producer CID fixture', async () => {
    const bytes = Uint8Array.from(
      Buffer.from(SNAPSHOT_CID_FIXTURE.artifactHex, 'hex')
    )

    assert.equal(
      await dagCborCIDFromBytes(bytes),
      SNAPSHOT_CID_FIXTURE.cid
    )
  })

  test('Should reject a CID mismatch before decoding', async () => {
    const invalidSnapshotBytes = new Uint8Array([1, 2, 3, 4])
    const provider = await createProviderForBytes(
      invalidSnapshotBytes,
      SNAPSHOT_CID_FIXTURE.cid
    )

    await assert.rejects(
      () => provider.head(),
      (err) => {
        return err instanceof Error &&
          err.message.includes('Snapshot CID mismatch') &&
          !err.message.includes('Failed to decode snapshot')
      }
    )
  })

  test('Should decode DAG-CBOR snapshots and preserve bigint height fields', async () => {
    const testSnapshot = {
      version: 1,
      chainID: 1,
      startHeight: 17000000n,
      endHeight: 17000001n,
      entryCount: 0,
      blocks: [{
        number: 17000000n,
        hash: new Uint8Array([1]),
        timestamp: 100n,
        transactions: []
      }]
    }
    const testCompressedBytes = brotliCompressSync(await encodeDagCbor(testSnapshot))
    const provider = await createProviderForBytes(testCompressedBytes)
    const head = await provider.head()
    const events = await Array.fromAsync(provider.from({
      startHeight: 17000000n,
      endHeight: 17000001n,
      liveSync: false
    }))

    assert.equal(head, 17000001n)
    assert.equal(typeof provider.snapshotContent?.startHeight, 'bigint')
    assert.equal(typeof provider.snapshotContent?.endHeight, 'bigint')
    assert.equal(typeof provider.snapshotContent?.blocks[0]?.number, 'bigint')
    assert.equal(events[0]?.number, 17000000n)
  })

  test('Should decode DAG-CBOR bignum tags emitted by the snapshot producer patch', async () => {
    const largeAmount = 18446744073709551616n
    const testSnapshot = {
      version: 1,
      chainID: 1,
      startHeight: 1n,
      endHeight: 1n,
      entryCount: 1,
      blocks: [{
        number: 1n,
        hash: new Uint8Array([1]),
        timestamp: 100n,
        transactions: [{
          hash: new Uint8Array([2]),
          index: 0,
          from: new Uint8Array([3]),
          actions: [[{
            actionType: 'Unshield',
            amount: largeAmount
          }]]
        }]
      }]
    }
    const testCompressedBytes = brotliCompressSync(await encodeDagCbor(testSnapshot))
    const provider = await createProviderForBytes(testCompressedBytes)
    const events = await Array.fromAsync(provider.from({
      startHeight: 1n,
      endHeight: 1n,
      liveSync: false
    }))

    assert.equal((events[0]?.transactions[0]?.actions[0]?.[0] as any).amount, largeAmount)
  })
})

describe('Should handle invalid snapshot', async () => {
  test('Should throw error for an invalid expected CID', async () => {
    const bytes = Uint8Array.from(
      Buffer.from(SNAPSHOT_CID_FIXTURE.artifactHex, 'hex')
    )
    const provider = await createProviderForBytes(bytes, 'QInvalid')

    await assert.rejects(
      () => provider.head(),
      /Invalid expected snapshot CID/
    )
  })

  test('Should throw error in case of failed HTTP request', async () => {
    mock.method(globalThis, 'fetch', async () => ({
      ok: false,
      status: 404,
      /**
       * Resolve to empy array buffer
       * @returns - Empty Array buffer
       */
      arrayBuffer: async () => new ArrayBuffer(0),
    } as Response))

    const provider = new SnapshotProvider({
      ipfsHash: SNAPSHOT_CID_FIXTURE.cid,
      gateways: TEST_IPFS_GATEWAYS
    })
    await assert.rejects(() => provider.head(), /Failed to fetch snapshot/)
  })

  test('Should throw error on invalid brotli compressed format', async () => {
    const testResponseBytes = new Uint8Array([1, 2, 3, 4])
    const provider = await createProviderForBytes(testResponseBytes)
    await assert.rejects(() => provider.head(), /Failed to decode snapshot/)
  })

  test('Should throw error when DAG-CBOR encoded payload is invalid', async () => {
    const testCborEncodedBytes = new Uint8Array([1, 2, 3, 4])
    const testCompressedBytes = brotliCompressSync(testCborEncodedBytes)
    const provider = await createProviderForBytes(testCompressedBytes)
    await assert.rejects(() => provider.head(), /Failed to decode snapshot/)
  })

  test('Should throw error when startHeight is missing', async () => {
    const testSnapshot = {
      version: 1,
      chainID: 1,
      endHeight: 50,
      blocks: []
    }

    const testEncodedSnapshot = await encodeDagCbor(testSnapshot)
    const testCompressedBytes = brotliCompressSync(testEncodedSnapshot)
    const provider = await createProviderForBytes(testCompressedBytes)
    await assert.rejects(
      () => provider.head(),
      (err) => {
        return err instanceof Error &&
          err.message.includes('Failed to decode snapshot') &&
          err.cause instanceof Error &&
          err.cause.message.includes('missing or invalid startHeight')
      }
    )
  })

  test('Should throw error when endHeight is missing', async () => {
    const testSnapshot = {
      version: 1,
      chainID: 1,
      startHeight: 50,
      blocks: []
    }

    const testEncodedSnapshot = await encodeDagCbor(testSnapshot)
    const testCompressedBytes = brotliCompressSync(testEncodedSnapshot)
    const provider = await createProviderForBytes(testCompressedBytes)
    await assert.rejects(
      () => provider.head(),
      (err) => {
        return err instanceof Error &&
          err.message.includes('Failed to decode snapshot') &&
          err.cause instanceof Error &&
          err.cause.message.includes('missing or invalid endHeight')
      }
    )
  })

  test('Should throw error when startHeight is greater than endHeight', async () => {
    const testSnapshot = {
      version: 1,
      chainID: 1,
      startHeight: 100,
      endHeight: 50,
      blocks: []
    }

    const testEncodedSnapshot = await encodeDagCbor(testSnapshot)
    const testCompressedBytes = brotliCompressSync(testEncodedSnapshot)
    const provider = await createProviderForBytes(testCompressedBytes)
    await assert.rejects(
      () => provider.head(),
      (err) => {
        return err instanceof Error &&
          err.message.includes('Failed to decode snapshot') &&
          err.cause instanceof Error &&
          err.cause.message.includes('startHeight cannot be greater than endHeight')
      }
    )
  })

  test('Should throw error when a numeric height is not a safe integer', async () => {
    const testSnapshot = {
      version: 1,
      chainID: 1,
      startHeight: Number.MAX_SAFE_INTEGER + 1,
      endHeight: Number.MAX_SAFE_INTEGER + 1,
      blocks: []
    }
    const testCompressedBytes = brotliCompressSync(await encodeDagCbor(testSnapshot))
    const provider = await createProviderForBytes(testCompressedBytes)
    await assert.rejects(
      () => provider.head(),
      (err) => {
        return err instanceof Error &&
          err.message.includes('Failed to decode snapshot') &&
          err.cause instanceof Error &&
          err.cause.message.includes('missing or invalid startHeight')
      }
    )
  })

  test('Should throw error when chainID is missing', async () => {
    const testSnapshot = {
      version: 1,
      startHeight: 50,
      endHeight: 100,
      blocks: []
    }

    const testEncodedSnapshot = await encodeDagCbor(testSnapshot)
    const testCompressedBytes = brotliCompressSync(testEncodedSnapshot)
    const provider = await createProviderForBytes(testCompressedBytes)
    await assert.rejects(
      () => provider.head(),
      (err) => {
        return err instanceof Error &&
          err.message.includes('Failed to decode snapshot') &&
          err.cause instanceof Error &&
          err.cause.message.includes('missing or invalid chainID')
      }
    )
  })

  test('Should throw error when block is missing', async () => {
    const testSnapshot = {
      chainID: 1,
      version: 1,
      startHeight: 50,
      endHeight: 100,
    }

    const testEncodedSnapshot = await encodeDagCbor(testSnapshot)
    const testCompressedBytes = brotliCompressSync(testEncodedSnapshot)
    const provider = await createProviderForBytes(testCompressedBytes)
    await assert.rejects(
      () => provider.head(),
      (err) => {
        return err instanceof Error &&
          err.message.includes('Failed to decode snapshot') &&
          err.cause instanceof Error &&
          err.cause.message.includes('Invalid snapshot: blocks must be an array')
      }
    )
  })
})
