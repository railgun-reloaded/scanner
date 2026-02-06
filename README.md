## ⚠️ Work in Progress

This module is currently under active development and **not ready for production use**.
Please do **not use** this module until a stable release is published.

# `@railgun-reloaded/scanner`

> Unified blockchain data abstraction layer for RAILGUN events

## Overview

The scanner module provides a pluggable data source interface for fetching and processing RAILGUN events from multiple backends. It abstracts away the complexity of different data providers (Subsquid indexers, IPFS snapshots, RPC nodes) behind a unified async iterator API.

### Key Features

- **Multi-source support**: Subsquid, Snapshot (IPFS), and RPC providers
- **Unified interface**: Same API across all data sources via `DataSource<T>`
- **Streaming data**: Memory-efficient async generators for large datasets
- **Type-safe events**: Strongly typed RAILGUN events (Shield, Unshield, Transact)
- **Configurable chunking**: Control batch sizes for optimal performance
- **Live sync support**: Real-time event streaming (RPC provider only)

## Installation

```bash
npm install @railgun-reloaded/scanner
```

## Quick Start

### SubsquidProvider

Fast, indexed historical data from Subsquid GraphQL endpoints.

```typescript
import { SubsquidProvider } from '@railgun-reloaded/scanner'

const provider = new SubsquidProvider('https://squid.subsquid.io/railgun-eth/graphql')

const iterator = provider.from({
  startHeight: 15000000n,
  endHeight: 15001000n,
  chunkSize: 100n,
  liveSync: false // Subsquid does not support live sync
})

for await (const block of iterator) {
  console.log(`Block ${block.number}: ${block.transactions.length} transactions`)
  for (const tx of block.transactions) {
    for (const actions of tx.actions) {
      // Process Shield, Unshield, Transact events
    }
  }
}
```

## API Reference

### DataSource Interface

All providers implement the `DataSource<T>` interface:

```typescript
interface DataSource<T extends EVMBlock> {
  isLiveProvider: boolean
  head(): Promise<bigint>
  from(options: SyncOptions): AsyncGenerator<T>
  destroy(): void
}
```

### SyncOptions

```typescript
type SyncOptions = {
  startHeight: bigint      // Starting block number
  endHeight?: bigint       // Ending block number (optional)
  chunkSize: bigint        // Number of blocks per request
  liveSync?: boolean       // Enable real-time streaming (RPC only)
}
```

### Event Types

The scanner normalizes all events into typed structures:

```typescript
type EVMBlock = {
  number: bigint
  hash: Uint8Array
  timestamp: bigint
  transactions: EVMTransaction[]
}

type EVMTransaction = {
  hash: Uint8Array
  index: number
  from: Uint8Array
  actions: Action[][] // Nested array of Shield/Unshield/Transact events
}

type Action = Shield | Unshield | Transact

enum ActionType {
  Unshield = 'Unshield',
  GeneratedCommitment = 'GeneratedCommitment',
  ShieldCommitment = 'ShieldCommitment',
  EncryptedCommitment = 'EncryptedCommitment',
  TransactCommitment = 'TransactCommitment'
}
```

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

## License

[MIT](LICENSE)
