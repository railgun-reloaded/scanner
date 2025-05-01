import { test } from 'brittle'

import { NetworkName } from '../../../../src'
import { SubsquidProvider } from '../../../../src/data-source/graph-provider/subsquid'

test('SubsquidProvider', (t) => {
  t.timeout(300_000)

  t.test('should create a SubsquidProvider instance', (t) => {
    const provider = new SubsquidProvider(NetworkName.Ethereum)
    t.ok(provider, 'SubsquidProvider instance created')
  })

  t.test('should return the correct network', (t) => {
    const provider = new SubsquidProvider(NetworkName.Ethereum)
    t.is(provider.network, NetworkName.Ethereum, 'Network should be mainnet')
  })

  // t.test('should return the correct provider', async (t) => {
  //   const provider = new SubsquidProvider(NetworkName.Ethereum)
  //   const graphProvider = provider.getProvider()
  //   t.ok(graphProvider, 'Graph provider should be returned')
  // })

  t.test('should await initialization', async (t) => {
    const provider = new SubsquidProvider(NetworkName.Ethereum)
    await provider.awaitInitialized()
    t.pass('Initialization awaited successfully')
  })

  t.test('should iterate events', async (t) => {
    const provider = new SubsquidProvider(NetworkName.Ethereum)
    const iterator = provider[Symbol.asyncIterator]()
    t.ok(iterator, 'Async iterator should be returned')
    const totalCount: Record<string, number> = {}
    for await (const event of provider.from({ startBlock: BigInt(0), endBlock: BigInt(30_000_000) })) {
      // console.log('Event:', event)
      t.ok(event, 'Event should be yielded')

      // totalcount += event.length
      // @ts-ignore
      for (const e in event ?? []) {
        if (!totalCount[e]) {
          totalCount[e] = 0
        }
        totalCount[e] += event[e]?.length ?? 0
        t.ok(event[e], 'Event should be yielded')
        // t.is(e.blockHeight > BigInt(0), true)
      }
      // t.fail('Should not yield any events')
    }
    console.log('Total events:', totalCount)
    for (const e in totalCount) {
      if (totalCount[e]) {
        t.is(totalCount[e] > 30_000, true)
      } else {
        t.fail(`No events for ${e}`)
      }
    }
  })
})
