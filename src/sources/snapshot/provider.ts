import type { EVMBlock } from '../../models'
import type { DataSource, SyncOptions } from '../data-source'
import type {
  SnapshotContent,
  SnapshotData
} from '../formatters/snapshot/blockdata-formatter'
import { formatSnapshot } from '../formatters/snapshot/blockdata-formatter'
import { minBigInt } from '../formatters/subsquid/bigint'

/**
 * Decode and verify snapshot artifact bytes.
 * @param bytes - Compressed snapshot artifact bytes.
 * @param expectedCid - CID the bytes must content-address to.
 * @returns Snapshot-owned decoded data.
 */
type SnapshotDecoder = (
  bytes: Uint8Array,
  expectedCid: string
) => Promise<SnapshotData>

/**
 * Configuration for SnapshotProvider
 */
type SnapshotProviderConfig = {
  /** IPFS hash of the snapshot file */
  ipfsHash: string
  /** IPFS gateway URLs (must end with /ipfs/) */
  gateways: string[]
  /** Snapshot-owned decoder that verifies and decodes artifact bytes. */
  decodeArtifact: SnapshotDecoder
}

/**
 * Fetch snapshot artifacts and adapt their decoded blocks to `EVMBlock`.
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
   * Snapshot-owned artifact decoder.
   */
  #decodeArtifact: SnapshotDecoder

  /**
   * Flag to indicate if this provider can provide live data
   */
  isLiveProvider = false

  /**
   * Decoded content of the snapshot.
   * The snapshot is lazily fetched and populated
   */
  snapshotContent: SnapshotContent | null

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

    if (typeof config.decodeArtifact !== 'function') {
      throw new Error('A snapshot decodeArtifact function is required')
    }
    this.#decodeArtifact = config.decodeArtifact

    this.snapshotContent = null
  }

  /**
   * Fetch and decode the snapshot artifact.
   * @returns - Decoded snapshot adapted for the scanner
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
        const bytes = new Uint8Array(buffer)
        const snapshot = await this.#decodeArtifact(bytes, this.#ipfsHash)
        return formatSnapshot(snapshot)
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

export type { SnapshotDecoder, SnapshotProviderConfig }
