# `FAFO-SCANNER`

> Event scanner for Railgun. It currently only use RPC to scan the events. Support for subsquid is still in progress.

## Example Usage
```ts
    import { RPCProvider } from 'fafo-scanner'

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

## Install
```sh
npm install fafo-scanner 
```