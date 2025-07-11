# `Railgun-SCANNER`

Module to fetch RAILGUN Events.

## Example Usage
```ts
    import { RPCProvider } from '@railgun-reloaded/scanner'

    // Create a new provider
    const provider = new RPCProvider(
        TEST_RPC_URL!,
        RAILGUN_PROXY_ADDRESS,
        3
    )

    // Spawn iterator that iterates over the given start/end height
    const blockIterator = provider.from({
      startHeight: ...,
      endHeight: ...,
      chunkSize: 499n,
      liveSync: false
    })

    // Extract data from the iterator
    for await (const blockData of blockIterator) {
        // Process blockData
    }

```

You can also set liveSync to listen to new events happening:

```ts
    import { RPCProvider } from '../src/sources/rpc/provider'

    const liveProvider = new RPCProvider(
        RPC_URL,
        RAILGUN_PROXY_ADDRESS,
        3
    )

   const startHeight = 22792284n
   const iterator = provider.from({
     startHeight,
     chunkSize: 500n,
     liveSync: true
   })

   for await (const blockInfo of iterator) {
     console.log(blockInfo)
   }

```

Also, scanner supports multiple iterators concurrently

```ts
const providerWithManyIterators = new RPCProvider(
  rpcUrl,
  RAILGUN_PROXY_ADDRESS,
  3
)

const iteratorA = provider.from({
  startHeight: SOME_BLOCK_A,
  endHeight: SOME_BLOCK_B,
  chunkSize: 499n,
  liveSync: false
})

const iterator2 = provider.from({
  startHeight: SOME_BLOCK_B,
  endHeight: SOME_BLOCK_B + 10000n,
  chunkSize: 499n,
  liveSync: false
})

  try {
    const processIterator1 = async () => {
      for await (const _data of iterator1) {
        // process _data
      }
    }
    const processIterator2 = async () => {
      for await (const _data of iterator2) {
        // process _data
      }
    }
  await Promise.all([processIterator1(), processIterator2()])

```

# Note: We're using chunkSize as 499n due to _most known rpcs free tier_ limitations.


## Install
```sh
npm install @railgun-reloaded/scanner
```
