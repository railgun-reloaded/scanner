import type { EVMBlock } from '../models'

type SyncOptions = {
  startHeight: bigint;
  endHeight: bigint;
  liveSource?: boolean;
  chunkSize?: bigint;
}

/**
 * `Data` is yet to be defined as a standardised format,
 * however from the examples not all sources will be able to provide all fields,
 * eg txid, so here it’s set as `extends` to allow flexibility
 */
interface DataSource<T extends EVMBlock> {
  /**
   * The most recent block that this source can provide.
   * For a snapshot, this would be the last event saved
   * For subsquid this would be the last block observed
   * For a live RPC provider this would be the last block processed
   * or the tip of the chain
   */
  head: bigint;

  /**
   * Name of datasource
   */
  name: string;

  /**
   * Is the source still ingesting data, ie can you expect it to update?
   * For a snapshot this would always be false
   * For subsquid and RPC this would be true as long as it could reasonably
   * fetch new data.
   * For polling this would probably always be true as a new attempt to fetch
   * further data can be made
   * For socket based communication the field could signal whether it is
   * connected or a connection needs to be established
   */
  isLiveProvider: boolean;

  /**
   * Start iterating from a given height.
   * As an async iterator, it allows consumption both as `for await(const … of …)`
   * and higher-level primitives such as `ReadableStream`
   * The method itself is made `async` as a lowest-common-denominator if a source
   * needs to do any async initialisation logic.
   */
  from(options: SyncOptions) : AsyncGenerator<T>;
}

export type { DataSource, SyncOptions }
