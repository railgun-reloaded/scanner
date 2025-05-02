import { solo as test } from 'brittle'
import dotenv from 'dotenv'

import { NetworkName } from '../../../../src'
import { GraphProvider } from '../../../../src/data-source'
import { SubsquidProvider } from '../../../../src/data-source/graph-provider/subsquid'

dotenv.config()

test('Graph-Provider:GraphQL', async (t) => {
  t.timeout(300_000)
  t.test('GraphQL', async (g) => {
    const graphProvider = new GraphProvider(
      new SubsquidProvider(NetworkName.Ethereum)
    )
    let hasYeilded = false
    for await (const event of graphProvider.from({
      startBlock: BigInt(0),
      endBlock: BigInt(30_000_000),
    })) {
      // g.ok(event, 'Event should be yielded')
      if (event?.event) { hasYeilded = true }
    }
    g.ok(hasYeilded, 'GraphQL should yield events')
    await graphProvider.destroy()
  })
})
