import assert from 'node:assert'
import { afterEach, describe, mock, test } from 'node:test'

import type { EVMBlock, Transact } from '../src/models/index.js'
import { ActionType } from '../src/models/index.js'
import { SnapshotProvider } from '../src/sources/index.js'

afterEach(() => {
  mock.restoreAll()
})

const TEST_CID = 'bafyreigennh5c6abpgadzpwjooykj67jvbii5cl5hjjhzq5dtesl3rgqgu'
const TEST_IPFS_GATEWAYS = ['https://gateway.test/ipfs/']

type SnapshotActionFixture = {
  actionType: string
  commitments?: Array<{
    memo: Uint8Array | Uint8Array[]
  } & Record<string, unknown>>
} & Record<string, unknown>

type SnapshotFixture = {
  version: number
  chainID: number
  startHeight: bigint
  endHeight: bigint
  entryCount: number
  blocks: Array<{
    number: bigint
    hash: Uint8Array
    timestamp: bigint
    transactions: Array<{
      hash: Uint8Array
      index: number
      from: Uint8Array
      actions: SnapshotActionFixture[][]
    }>
  }>
}

/**
 * Mock a successful artifact fetch.
 * @param bytes - Response bytes.
 */
function mockFetchBytes (bytes: Uint8Array) {
  mock.method(
    globalThis,
    'fetch',
    async () => new Response(Uint8Array.from(bytes), { status: 200 })
  )
}

/**
 * Build decoded snapshot fixture data.
 * @param overrides - Fixture overrides.
 * @returns Snapshot fixture.
 */
function buildSnapshot (
  overrides: Partial<SnapshotFixture> = {}
): SnapshotFixture {
  return {
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
    }],
    ...overrides
  }
}

/**
 * Build a decoder returning fixed snapshot data.
 * @param snapshot - Snapshot fixture.
 * @returns Decoder function.
 */
function decoderReturning (snapshot: SnapshotFixture) {
  /**
   * Return the fixed snapshot.
   * @returns Snapshot fixture.
   */
  return async () => snapshot
}

/**
 * Reject artifact decoding.
 * @returns Never.
 */
async function failingDecoder (): Promise<never> {
  throw new Error('Failed to decode snapshot')
}

/**
 * Build a provider with mocked fetched bytes.
 * @param bytes - Fetched bytes.
 * @param snapshot - Decoded snapshot fixture.
 * @returns Snapshot provider.
 */
function createProvider (
  bytes: Uint8Array,
  snapshot: SnapshotFixture
): SnapshotProvider<EVMBlock> {
  mockFetchBytes(bytes)
  return new SnapshotProvider({
    ipfsHash: TEST_CID,
    gateways: TEST_IPFS_GATEWAYS,
    decodeArtifact: decoderReturning(snapshot)
  })
}

describe('SnapshotProvider adapter', () => {
  test('Should require a decodeArtifact function', () => {
    assert.throws(
      () => new SnapshotProvider({
        ipfsHash: TEST_CID,
        gateways: TEST_IPFS_GATEWAYS,
        // @ts-expect-error - intentionally missing decoder
        decodeArtifact: undefined
      }),
      /decodeArtifact function is required/
    )
  })

  test('Should pass fetched bytes and expected CID to the decoder', async () => {
    const responseBytes = new Uint8Array([5, 6, 7, 8])
    const decodeArtifact = mock.fn(
      async (_bytes: Uint8Array, _expectedCid: string) => buildSnapshot()
    )
    mockFetchBytes(responseBytes)
    const provider = new SnapshotProvider({
      ipfsHash: TEST_CID,
      gateways: TEST_IPFS_GATEWAYS,
      decodeArtifact
    })

    await provider.head()

    assert.equal(decodeArtifact.mock.callCount(), 1)
    const [bytesArg, cidArg] = decodeArtifact.mock.calls[0]!.arguments
    assert.deepEqual(bytesArg, responseBytes)
    assert.equal(cidArg, TEST_CID)
  })

  test('Should expose head and iterate the snapshot range', async () => {
    const provider = createProvider(new Uint8Array([9, 9, 9]), buildSnapshot())

    const head = await provider.head()
    const events = await Array.fromAsync(provider.from({
      startHeight: 17000000n,
      endHeight: 17000001n,
      liveSync: false
    }))

    assert.equal(head, 17000001n)
    assert.equal(events[0]?.number, 17000000n)
  })

  test('Should map commitment memos to canonical EVMBlock bytes', async () => {
    const nestedMemo = [new Uint8Array([1, 2]), new Uint8Array([3, 4])]
    const snapshot = buildSnapshot({
      blocks: [{
        number: 17000000n,
        hash: new Uint8Array([1]),
        timestamp: 100n,
        transactions: [{
          hash: new Uint8Array([2]),
          index: 0,
          from: new Uint8Array([3]),
          actions: [[{
            actionType: ActionType.TransactCommitment,
            commitments: [{ memo: nestedMemo }]
          }]]
        }]
      }]
    })
    const provider = createProvider(new Uint8Array([4, 2]), snapshot)

    const events = await Array.fromAsync(provider.from({
      startHeight: 17000000n,
      endHeight: 17000001n,
      liveSync: false
    }))

    const action = events[0]?.transactions[0]?.actions[0]?.[0] as Transact
    assert.deepEqual(action.commitments[0]?.memo, new Uint8Array([1, 2, 3, 4]))
  })

  test('Should reject liveSync', async () => {
    const provider = createProvider(new Uint8Array([1]), buildSnapshot())
    await assert.rejects(
      () => Array.fromAsync(provider.from({ startHeight: 0n, liveSync: true })),
      /doesn't support liveSync/
    )
  })
})

describe('SnapshotProvider fetch failures', () => {
  test('Should throw error in case of failed HTTP request', async () => {
    mock.method(
      globalThis,
      'fetch',
      async () => new Response(null, { status: 404 })
    )

    const provider = new SnapshotProvider({
      ipfsHash: TEST_CID,
      gateways: TEST_IPFS_GATEWAYS,
      decodeArtifact: decoderReturning(buildSnapshot())
    })
    await assert.rejects(() => provider.head(), /Failed to fetch snapshot/)
  })

  test('Should surface a decoder failure as a fetch failure', async () => {
    mockFetchBytes(new Uint8Array([1, 2, 3]))
    const provider = new SnapshotProvider({
      ipfsHash: TEST_CID,
      gateways: TEST_IPFS_GATEWAYS,
      decodeArtifact: failingDecoder
    })
    await assert.rejects(() => provider.head(), /Failed to decode snapshot/)
  })
})
