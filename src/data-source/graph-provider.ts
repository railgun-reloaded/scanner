// import type { DataSource } from './datasource'
// import type { SubsquidProvider } from './graph-provider/subsquid'
// import type { Event, RPCData } from './types'
// // TODO: move this to datasource?
// import { DataSourceType } from './types'

// /**
//  * The GraphProvider class is a data source provider that interacts with the Subsquid API.
//  * It provides methods to fetch data from the Subsquid API and process it for use in the application.
//  */
// class GraphProvider implements DataSource<RPCData> {
//   /**
//    * The most recent blockHeight that this source can provide.
//    */
//   blockHeight: bigint = BigInt(0)
//   /**
//    * The most recent events that this source can provide.
//    */
//   syncing: boolean = false
//   /**
//    * The most recent events that this source can provide.
//    */
//   provider: SubsquidProvider<RPCData>

//   /**
//    * The current most complete chronological order of events seen by this data source.
//    */
//   sourceType: DataSourceType = DataSourceType.Historical

//   /**
//    * The GraphProvider constructor initializes the provider.
//    * @param provider - The provider to use for connecting to the Subsquid API.
//    */
//   constructor (provider: SubsquidProvider) {
//     this.provider = provider
//     this.initialize()
//   }

//   /**
//    * - The GraphProvider constructor initializes the provider.
//    */
//   async initialize () {
//     // Initialize the provider
//     this.syncing = true
//   }

//   /**
//    * The most recent blockHeight that this source can provide.
//    * @returns The block height.
//    */
//   get head (): bigint {
//     return this.blockHeight
//   }

//   /**
//    * The most recent events that this source can provide.
//    * @param height - The block height to start reading from.
//    * @returns An async generator that yields data from all sources.
//    * @throws Error if the source is not a ReadableStream or an AsyncIterable
//    * @yields T - The data read from the source
//    */
//   async * read (height: bigint): AsyncGenerator<Event | undefined> {
//     while (true) {
//       if (!this.syncing) { break }
//       // console.log('syncing is false')
//       // this function is basically useless from is whats needed with this type of provider.
//       // as it does not 'auto update' it must be refreshed by the user.
//       for await (const event of this.from({ startBlock: height, endBlock: this.blockHeight })) {
//         // console.log('FoundEvent', event)
//         if (!this.syncing) { break }

//         if (event) {
//           // console.log('FoundEvent', event)
//           const { blockHeight } = event
//           // console.log('FoundEvent', event)
//           // @ts-expect-error
//           yield { blockHeight, event }
//         }
//       }
//     }
//   }

//   /**
//    * Destroys the source and cleans up resources.
//    * @param error - An optional error to throw from all active iterators.
//    */
//   async destroy (error?: Error): Promise<void> {
//     this.syncing = false
//     await this.provider.destroy()
//     // @ts-ignore -- no need to require optional. // TODO: fix this typeshit
//     delete this.provider
//     if (error) {
//       throw error
//     }
//   }

//   /**
//    * Start iterating from a given height.
//    * @param options  - Options for the iterator
//    * @param options.startBlock - The block number to start from
//    * @param options.endBlock - The block number to end at
//    * @yields - An async generator that yields events
//    */
//   async * from (options: { startBlock: bigint, endBlock: bigint | 'latest' }): AsyncGenerator<RPCData | undefined> {
//     const { startBlock, endBlock } = options
//     this.syncing = true
//     // TODO:  latest blockcalculation
//     const endBlockNumber = endBlock === 'latest' ? this.blockHeight : endBlock
//     for await (const event of this.provider.from({ startBlock, endBlock: endBlockNumber })) {
//       const target = event[event.length - 1]
//       if (typeof target !== 'undefined') {
//         if ('blockNumber' in target) {
//           // console.log('setting blockheight', target.blockNumber)
//           const nextBlockHeight = BigInt(target.blockNumber)
//           if (nextBlockHeight > this.blockHeight) {
//             this.blockHeight = BigInt(target.blockNumber)
//           }
//         }
//       }
//       // Use the resolved endBlockNumber instead of endBlock which could be 'latest'
//       // const blockHeight = endBlockNumber
//       //
//       for (const e of event) {
//         const nextBlockHeight = BigInt(e.blockNumber)
//         if (nextBlockHeight > this.blockHeight) {
//           this.blockHeight = BigInt(e.blockNumber)
//         }
//         // console.log('event')
//         // @ts-ignore TODO: Fix this
//         yield { blockHeight: this.blockHeight, event: e }
//       }
//     }
//     // this will effectively kill the read iterator above
//     // this.syncing = false
//   }
// }

// export { GraphProvider }
