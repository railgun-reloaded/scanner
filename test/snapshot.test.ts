import assert from 'node:assert'
import { before, describe, mock, test } from 'node:test'
import { brotliCompressSync } from 'node:zlib'

import { encode } from 'cbor2'
import dotenv from 'dotenv'

import { SnapshotProvider, SubsquidProvider } from '../src/sources'

dotenv.config()

const SUBSQUID_SEPOLIA_ENDPOINT = 'https://rail-squid.squids.live/squid-railgun-eth-sepolia-v2/graphql'
const TEST_IPFS_HASH = 'QmNmjsFruGJ7dVtMPHA5EwikWapBoTz3jzUg6xoNCSGcR4'
const TEST_START_HEIGHT = 5784866n
const TEST_END_HEIGHT = 6066713n

const provider = new SnapshotProvider(TEST_IPFS_HASH)

describe('SnapshotProvider[EthereumSepolia]', () => {
  before(async () => {
    // Trigger lazy fetching of snapshot
    await provider.head()
  })

  test('Should retrieve valid head for snapshot', async () => {
    const head = await provider.head()
    assert(head === TEST_END_HEIGHT, 'Head is invalid')
  })

  test('Should retrieve valid metadata for snapshot', async () => {
    const snapshot = provider.snapshotContent

    assert(snapshot != null)
    assert(snapshot.version === 1)
    assert(snapshot.chainID === 11155111)
    assert(BigInt(snapshot.endHeight) === TEST_END_HEIGHT)
    assert(BigInt(snapshot.startHeight) === TEST_START_HEIGHT)
    assert(snapshot.entryCount === 14)
    assert(snapshot.blocks.length === 10)
  })

  test('Should retrieve same data as graph provider for given block range', async () => {
    const graphProvider = new SubsquidProvider(SUBSQUID_SEPOLIA_ENDPOINT)

    const syncOptions = {
      startHeight: TEST_START_HEIGHT,
      endHeight: TEST_END_HEIGHT,
      liveSync: false
    }

    const graphEventsIterator = graphProvider.from(syncOptions)
    const graphEvents = await Array.fromAsync(graphEventsIterator)

    const snapshotEventsIterator = provider.from(syncOptions)
    const snapshotEvents = await Array.fromAsync(snapshotEventsIterator)

    assert.deepEqual(graphEvents, snapshotEvents)
  })
})

describe('Should handle invalid snapshot[EthereuumSepolia]', async () => {
  test('Should throw error in case of invalid ipfs hash', async () => {
    const provider = new SnapshotProvider('Qinvalid')
    await assert.rejects(provider.head(), /Failed to fetch snapshot/)
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

    const provider = new SnapshotProvider('Qinvalid')
    await assert.rejects(() => provider.head(), /Failed to fetch snapshot/)
  })

  test('Should throw error on invalid brotli compressed format', async () => {
    const testResponseBytes = new Uint8Array([1, 2, 3, 4])
    mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      status: 200,
      /**
       * Resolve to array buffer
       * @returns - Array buffer
       */
      arrayBuffer: async () => testResponseBytes.buffer,
    } as Response))

    const provider = new SnapshotProvider('QInvalidFormat')
    await assert.rejects(() => provider.head(), /Failed to decode snapshot/)
  })

  test('Should throw error when  cbor encoded payload is invalid', async () => {
    const testCborEncodedBytes = new Uint8Array([1, 2, 3, 4])
    const testCompressedBytes = brotliCompressSync(testCborEncodedBytes)

    mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      status: 200,
      /**
       * Resolve to array buffer
       * @returns - Array buffer
       */
      arrayBuffer: async () => testCompressedBytes.buffer,
    } as Response))

    const provider = new SnapshotProvider('QInvalidHeights')
    await assert.rejects(() => provider.head(), /Failed to decode snapshot/)
  })

  test('Should throw error when startHeight is missing', async () => {
    const testSnapshot = {
      version: 1,
      chainID: 1,
      endHeight: 50,
      blocks: []
    }

    const testEncodedSnapshot = encode(testSnapshot)
    const testCompressedBytes = brotliCompressSync(testEncodedSnapshot)

    mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      status: 200,
      /**
       * Resolve to array buffer
       * @returns - Array buffer
       */
      arrayBuffer: async () => testCompressedBytes.buffer,
    } as Response))

    const provider = new SnapshotProvider('QMissingHeight')
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

    const testEncodedSnapshot = encode(testSnapshot)
    const testCompressedBytes = brotliCompressSync(testEncodedSnapshot)

    mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      status: 200,
      /**
       * Resolve to array buffer
       * @returns - Array buffer
       */
      arrayBuffer: async () => testCompressedBytes.buffer,
    } as Response))

    const provider = new SnapshotProvider('QMissingHeight')
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

    const testEncodedSnapshot = encode(testSnapshot)
    const testCompressedBytes = brotliCompressSync(testEncodedSnapshot)

    mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      status: 200,
      /**
       * Resolve to array buffer
       * @returns - Array buffer
       */
      arrayBuffer: async () => testCompressedBytes.buffer,
    } as Response))

    const provider = new SnapshotProvider('QinvalidHeights')
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

  test('Should throw error when chainID is missing', async () => {
    const testSnapshot = {
      version: 1,
      startHeight: 50,
      endHeight: 100,
      blocks: []
    }

    const testEncodedSnapshot = encode(testSnapshot)
    const testCompressedBytes = brotliCompressSync(testEncodedSnapshot)

    mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      status: 200,
      /**
       * Resolve to array buffer
       * @returns - Array buffer
       */
      arrayBuffer: async () => testCompressedBytes.buffer,
    } as Response))

    const provider = new SnapshotProvider('Qinvalidchain')
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

    const testEncodedSnapshot = encode(testSnapshot)
    const testCompressedBytes = brotliCompressSync(testEncodedSnapshot)

    mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      status: 200,
      /**
       * Resolve to array buffer
       * @returns - Array buffer
       */
      arrayBuffer: async () => testCompressedBytes.buffer,
    } as Response))

    const provider = new SnapshotProvider('QinvalidBlock')
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
