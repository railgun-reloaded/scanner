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
    let totalCount = 0
    const idSet = new Set()
    for await (const event of provider.from({ startBlock: BigInt(0), endBlock: BigInt(30_000_000) })) {
      t.ok(event, `Events should be yielded: ${event.length} events`)
      // @ts-ignore

      for (const e of event ?? []) {
        if (!idSet.has(e.args.id)) {
          totalCount++
          idSet.add(e.args.id)
        }
      }
    }
    console.log('Total events:', totalCount)
    // for (const e in totalCount) {
    if (totalCount > 0) {
      t.is(totalCount > 30_000, true, 'Total events should be greater than 30_000')
    } else {
      t.fail('No events found')
    }
  })
})
