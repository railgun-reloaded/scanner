import { brotliDecompressSync } from 'zlib'

import type { EVMBlock, Transact } from '../../models'
import { ActionType } from '../../models'
import type { DataSource, SyncOptions } from '../data-source'
import { flattenMemo } from '../formatters/memo'
import { minBigInt } from '../formatters/subsquid/bigint'

import { verifyDagCborCID } from './cid'

type Snapshot = {
  version: number
  chainID: number
  startHeight: bigint
  endHeight: bigint
  entryCount: number
  blocks: EVMBlock[]
}

/**
 * Configuration for SnapshotProvider
 */
type SnapshotProviderConfig = {
  /** IPFS hash of the snapshot file */
  ipfsHash: string
  /** IPFS gateway URLs (must end with /ipfs/) */
  gateways: string[]
}

/**
 * Normalize memo fields in a decoded snapshot block in place.
 * @param block - Decoded snapshot block.
 * @returns The same block with canonical memo bytes.
 */
function canonicalizeSnapshotBlockMemos<T extends EVMBlock> (block: T): T {
  for (const tx of block.transactions) {
    const actions = tx.actions.flat()
    for (const action of actions) {
      if (
        action.actionType !== ActionType.TransactCommitment &&
        action.actionType !== ActionType.EncryptedCommitment
      ) {
        continue
      }
      const transact = action as Transact
      for (const commitment of transact.commitments) {
        commitment.memo = flattenMemo(commitment.memo)
      }
    }
  }
  return block
}

/**
 * Convert a decoded snapshot height to the scanner's bigint representation.
 * @param value - Decoded height value.
 * @param fieldName - Field name used in validation errors.
 * @returns Normalized bigint height.
 */
function normalizeHeight (value: unknown, fieldName: string): bigint {
  if (typeof value === 'bigint') {
    return value
  }

  if (typeof value === 'number' && Number.isSafeInteger(value)) {
    return BigInt(value)
  }

  throw new Error(`Invalid snapshot: missing or invalid ${fieldName}`)
}

/**
 * Normalize snapshot range metadata.
 * @param snapshot - Decoded snapshot.
 * @returns Snapshot with bigint range metadata.
 */
function normalizeSnapshotHeights (snapshot: Snapshot): Snapshot {
  snapshot.startHeight = normalizeHeight(snapshot.startHeight, 'startHeight')
  snapshot.endHeight = normalizeHeight(snapshot.endHeight, 'endHeight')
  return snapshot
}

/**
 * Normalize every decoded block number.
 * @param snapshot - Validated decoded snapshot.
 * @returns Snapshot with bigint block numbers.
 */
function normalizeSnapshotBlockHeights (snapshot: Snapshot): Snapshot {
  snapshot.blocks = snapshot.blocks.map(block => {
    block.number = normalizeHeight(block.number, 'block number')
    return block
  })
  return snapshot
}

/**
 * Decode DAG-CBOR with the producer's extended BigInt tag support.
 * @param data - Decompressed snapshot bytes.
 * @returns Decoded DAG-CBOR value.
 */
async function decodeDagCbor<T> (data: Uint8Array): Promise<T> {
  const [
    dagCbor,
    { decode },
    { bigIntDecoder, bigNegIntDecoder }
  ] = await Promise.all([
    import('@ipld/dag-cbor'),
    import('cborg'),
    import('cborg/taglib')
  ])

  try {
    return dagCbor.decode(data) as T
  } catch (err) {
    if (
      !(err instanceof Error) ||
      !/tag not supported \([23]\)/.test(err.message)
    ) {
      throw err
    }
  }

  return decode(dagCbor.toByteView(data), {
    ...dagCbor.decodeOptions,
    tags: {
      ...dagCbor.decodeOptions.tags,
      2: bigIntDecoder,
      3: bigNegIntDecoder
    }
  }) as T
}

/**
 * SnapshotProvider fetches snapshot from IPFS and parses/decodes its contents.
 */
export class SnapshotProvider<T extends EVMBlock> implements DataSource<T> {
  /**
   * IPFS hash of the snapshot file
   */
  #ipfsHash: string

  /**
   * IPFS Gateways URL
   */
  #gateways: string[]

  /**
   * Flag to indicate if this provider can provide live data
   */
  isLiveProvider = false

  /**
   * Decompressed/Decoded content of the snapshot
   * The snapshot is lazily fetched and populated
   */
  snapshotContent: Snapshot | null

  /**
   * Initialize provider with IPFS hash of snapshot
   * @param config - SnapshotProvider config options
   */
  constructor (config: SnapshotProviderConfig) {
    if (!config.ipfsHash || config.ipfsHash.length === 0) {
      throw new Error('IPFS hash is empty')
    }
    this.#ipfsHash = config.ipfsHash

    if (!config.gateways || config.gateways.length === 0) {
      throw new Error('Atleast one IPFS Gateway is required')
    }
    this.#gateways = config.gateways

    this.snapshotContent = null
  }

  /**
   * Fetch snasphot from the hash
   * @returns - Promise to the content of file
   */
  async #fetchSnapshot () {
    let lastError: Error | null = null
    for (const gateway of this.#gateways) {
      try {
        const url = gateway + this.#ipfsHash
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to get snapshot status: ${response.status}`)
        }
        const buffer = await response.arrayBuffer()
        await verifyDagCborCID(new Uint8Array(buffer), this.#ipfsHash)
        return this.#decodeSnapshot(buffer)
      } catch (err) {
        lastError = err as Error
      }
    }
    const causeMessage = lastError ? `: ${lastError.message}` : ''
    throw new Error(`Failed to fetch snapshot${causeMessage}`, {
      cause: lastError
    })
  }

  /**
   * Validate the decoded snapshot is in expected format
   * @param snapshot - Input Snapshot instance
   */
  #validateSnapshot (snapshot: Snapshot) {
    if (!snapshot) {
      throw new Error('Invalid snapshot: not initalized properly')
    };

    if (typeof snapshot.chainID !== 'number') {
      throw new Error('Invalid snapshot: missing or invalid chainID')
    }

    if (typeof snapshot.startHeight !== 'bigint') {
      throw new Error('Invalid snapshot: missing or invalid startHeight')
    }
    if (typeof snapshot.endHeight !== 'bigint') {
      throw new Error('Invalid snapshot: missing or invalid endHeight')
    }

    if (snapshot.startHeight > snapshot.endHeight) {
      throw new Error('Invalid snapshot: startHeight cannot be greater than endHeight')
    }

    if (!snapshot.blocks || !Array.isArray(snapshot.blocks)) {
      throw new Error('Invalid snapshot: blocks must be an array')
    }
  }

  /**
   * Decompress and decode snapshot
   * @param rawContent - Raw content of the snapshot
   * @returns - Decompressed/decoded snapshot
   */
  async #decodeSnapshot (rawContent: ArrayBuffer) {
    // We can use pipeline stream later
    try {
      const decompressed = brotliDecompressSync(rawContent)
      const snapshot = normalizeSnapshotHeights(await decodeDagCbor<Snapshot>(decompressed))
      this.#validateSnapshot(snapshot)
      normalizeSnapshotBlockHeights(snapshot)
      snapshot.blocks = snapshot.blocks.map(canonicalizeSnapshotBlockMemos)
      return snapshot
    } catch (err) {
      throw new Error('Failed to decode snapshot', { cause: err })
    }
  }

  /**
   * Gets the latest height for which this provider can return data.
   * @returns The latest height for data that can be provided by this provider.
   */
  async head (): Promise<bigint> {
    if (!this.snapshotContent) {
      this.snapshotContent = await this.#fetchSnapshot()
    }

    if (this.snapshotContent) {
      return this.snapshotContent.endHeight
    } else {
      throw new Error('Failed to fetch head')
    }
  }

  /**
   * Create an async iterator from sync options
   * @param _options - Sync options
   * @returns AsyncGenerator that return RailgunEventData
   * @yields EVMBlock
   */
  async * from (_options: SyncOptions): AsyncGenerator<T> {
    if (_options.liveSync) {
      throw new Error("Snapshot doesn't support liveSync")
    }

    if (_options.endHeight && _options.endHeight < _options.startHeight) {
      throw new Error('EndHeight cannot be smaller than StartHeight')
    }

    if (!this.snapshotContent) {
      this.snapshotContent = await this.#fetchSnapshot()
    }

    if (!this.snapshotContent) {
      throw new Error('Failed to fetch snapshot')
    }

    const snapshotStartHeight = this.snapshotContent.startHeight
    const snapshotEndHeight = this.snapshotContent.endHeight

    if (_options.startHeight < snapshotStartHeight) {
      throw new Error(`Requested startHeight ${_options.startHeight} is less than snapshot start height ${snapshotStartHeight}. Some block range are missing in the snapshot`)
    }

    // If endHeight is given, we use it as endHeight or we use snapshot endHeight as an endHeight
    const endHeight = _options.endHeight ? minBigInt(_options.endHeight, snapshotEndHeight) : snapshotEndHeight
    const startHeight = _options.startHeight > snapshotStartHeight ? _options.startHeight : snapshotStartHeight

    const events = this.snapshotContent.blocks.filter(b => b.number >= startHeight && b.number <= endHeight)

    for (const event of events) {
      yield event as T
    }
  }

  /**
   * Destroy provider
   */
  destroy (): void {

  }
}
