import assert from 'node:assert'
import { describe, test } from 'node:test'

import dotenv from 'dotenv'

import { SnapshotProvider, SubsquidProvider } from '../src/sources'

dotenv.config()

const SUBSQUID_SEPOLIA_ENDPOINT = 'https://rail-squid.squids.live/squid-railgun-eth-sepolia-v2/graphql'
const TEST_IPFS_HASH = 'QmNmjsFruGJ7dVtMPHA5EwikWapBoTz3jzUg6xoNCSGcR4'
const TEST_START_HEIGHT = 5784866n
const TEST_END_HEIGHT = 6066713n

const provider = new SnapshotProvider(TEST_IPFS_HASH)

describe('SnapshotProvider[EthereumSepolia]', () => {
  test('Should throw error in case of invalid ipfs hash', async () => {
    const provider = new SnapshotProvider('Qeieiwqiw')
    await assert.rejects(provider.head(), /Failed to fetch heads/)
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
