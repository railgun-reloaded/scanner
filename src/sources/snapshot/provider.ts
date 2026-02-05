import { brotliDecompressSync } from 'zlib'

import { decode } from 'cbor2'

import type { EVMBlock } from '../../models'
import type { DataSource, SyncOptions } from '../data-source'

type Snapshot = {
  version: number
  chainID: number
  startHeight: bigint
  endHeight: bigint
  entryCount: number
  blocks: EVMBlock[]
}

const DEFAULT_IPFS_GATEWAY = 'https://ipfs.io/ipfs/'

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
    try {
      const url = DEFAULT_IPFS_GATEWAY + this.#ipfsHash
      const response = await fetch(url)
      if (!response.ok) { throw new Error(`Failed to get snapshot status: ${response.status}`) }
      const buffer = await response.arrayBuffer()
      return this.#decodeSnapshot(buffer)
    } catch (err) {
      console.log('Failed to fetch snapshot file', err)
    }
    return null
  }

  /**
   * Decompress and decode snapshot
   * @param rawContent - Raw content of the snapshot
   * @returns - Decompressed/decoded snapshot
   */
  async #decodeSnapshot (rawContent: ArrayBuffer) {
    // We can use pipeline stream later
    const decompressed = brotliDecompressSync(rawContent)
    return decode(decompressed) as Snapshot
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
      throw new Error('Failed to get head')
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

    if (_options.startHeight < this.snapshotContent.startHeight) {
      throw new Error(`Requested startHeight ${_options.startHeight} is less than snapshot start height ${this.snapshotContent.startHeight}. Some block range are missing in the snapshot`)
    }

    // If endHeight is given, we use it as endHeight or we use snapshot endHeight as an endHeight
    const endHeight = _options.endHeight ? _options.endHeight : this.snapshotContent.endHeight
    const startHeight = _options.startHeight > this.snapshotContent.startHeight ? _options.startHeight : this.snapshotContent.startHeight

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
