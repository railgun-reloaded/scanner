import { brotliDecompressSync } from 'zlib'

import { decode } from 'cbor2'

import type { EVMBlock } from '../../models'
import type { DataSource, SyncOptions } from '../data-source'
import { minBigInt } from '../formatter/bigint'

type Snapshot = {
  version: number
  chainID: number
  // This is encoded as BigInt while exporting, but cbor encoder
  // converts it into the number
  startHeight: number
  endHeight: number
  entryCount: number
  blocks: EVMBlock[]
}

const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://ipfs.public.cat/ipfs/'
]

/**
 * SnapshotProvider fetches snapshot from IPFS and parses/decodes its contents.
 */
export class SnapshotProvider<T extends EVMBlock> implements DataSource<T> {
  /**
   * IPFS hash of the snapshot file
   */
  #ipfsHash: string

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
   * @param ipfsHash - IPFS hash of snapshot file
   */
  constructor (ipfsHash: string) {
    if (ipfsHash.length === 0) {
      throw new Error('IPFS hash is empty')
    }
    this.snapshotContent = null
    this.#ipfsHash = ipfsHash
  }

  /**
   * Fetch snasphot from the hash
   * @returns - Promise to the content of file
   */
  async #fetchSnapshot () {
    let lastError: Error | null = null
    for (const gateway of IPFS_GATEWAYS) {
      try {
        const url = gateway + this.#ipfsHash
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to get snapshot status: ${response.status}`)
        }
        const buffer = await response.arrayBuffer()
        return this.#decodeSnapshot(buffer)
      } catch (err) {
        lastError = err as Error
      }
    }
    throw new Error('Failed to fetch snapshot', { cause: lastError })
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

    if (typeof snapshot.startHeight !== 'number') {
      throw new Error('Invalid snapshot: missing or invalid startHeight')
    }
    if (typeof snapshot.endHeight !== 'number') {
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
      const snapshot = decode(decompressed) as Snapshot
      this.#validateSnapshot(snapshot)
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
      return BigInt(this.snapshotContent.endHeight)
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

    const snapshotStartHeight = BigInt(this.snapshotContent.startHeight)
    const snapshotEndHeight = BigInt(this.snapshotContent.endHeight)

    if (_options.startHeight < this.snapshotContent.startHeight) {
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
