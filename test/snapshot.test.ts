import assert from 'node:assert'
import { describe, test } from 'node:test'

import dotenv from 'dotenv'

import { SnapshotProvider } from '../src/sources'

dotenv.config()

describe('SnapshotProvider[Ethereum]', () => {
  test('Should fetch snapshot and validate head', async () => {
    const ipfsHash = 'Qmc6pYwTse9B3ggCX75PzS8fXpNVcg1bCf5AuNHkV2DhxV'
    const provider = new SnapshotProvider(ipfsHash)
    /*
    const iterator = provider.from({
      startHeight: 14737691n,
      liveSync: false
    })
    */
    const head = await provider.head()
    assert(head === 24266500n, 'Head is invalid')
  })
})
