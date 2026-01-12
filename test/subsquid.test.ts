import { describe, test } from 'node:test'

import dotenv from 'dotenv'

import { SubsquidProvider } from '../src'

dotenv.config()
const MOCK_SQUID_URL = process.env['SQUID_ENDPOINT']!
const RAILGUN_PROXY_DEPLOYMENT_BLOCK = 14737691n

describe('Graph Provider', () => {
  test('Start Graph Provider', async () => {
    const provider = new SubsquidProvider(MOCK_SQUID_URL)
    const iterator = provider.from({
      startHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK,
      endHeight: RAILGUN_PROXY_DEPLOYMENT_BLOCK + 30_000n,
      liveSync: false
    })

    try {
      for await (const entry of iterator) {
        console.log(entry.number)
      }
    } catch (err) {
      console.error(err)
    }
  })
})
