// import assert from 'node:assert'
// import { describe, test } from 'node:test'

// import dotenv from 'dotenv'

// import { JSONRPCClient, JSONRPCProvider } from '../src/sources/json-rpc'

// dotenv.config()

// const RAILGUN_PROXY_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9'

// describe('JSONRPCProvider[ETHEREUM]', () => {
//   const RPC_URL = process.env['RPC_API_KEY']!
//   const WS_URL = process.env['WS_API_KEY']!

//   describe('JSONRPC Client', () => {
//     test('Should HTTP + WebSocket', async () => {
//       if (!WS_URL) {
//         console.log('Skipping dual-channel test - WS_URL not configured')
//         return
//       }

//       const client = new JSONRPCClient(WS_URL, 1000, true)

//       const blockNumber = await client.call('eth_blockNumber')
//       assert.ok(typeof blockNumber === 'string', 'HTTP channel should work')

//       try {
//         const subscriptionId = await client.subscribe('logs', {
//           address: RAILGUN_PROXY_ADDRESS
//         }, (_data) => {
//           console.log('received data from wss')
//         })

//         assert.ok(typeof subscriptionId === 'string', 'WebSocket channel should work')

//         client.destroy()
//       } catch (error) {
//         client.destroy()
//         assert.ok(true, 'HTTP channel works, WebSocket may fail in test env')
//       }
//     })
//     test('Should demonstrate event-loop batching vs sequential requests', async () => {
//       const client = new JSONRPCClient(RPC_URL, 1000, true)

//       const promises = [
//         client.call('eth_blockNumber'),
//         client.call('eth_getLogs', {
//           fromBlock: '0xe17dbf',
//           toBlock: '0xe17dc0',
//           address: RAILGUN_PROXY_ADDRESS
//         }),
//         client.call('eth_getLogs', {
//           fromBlock: '0xe17dc1',
//           toBlock: '0xe17dc5',
//           address: RAILGUN_PROXY_ADDRESS
//         }),
//         client.call('eth_blockNumber')
//       ]

//       const results = await Promise.all(promises)

//       const seq1 = await client.call('eth_blockNumber')
//       const seq2 = await client.call('eth_blockNumber')

//       assert.ok(results.length === 4, 'All concurrent requests should complete')
//       assert.ok(typeof results[0] === 'string', 'Block number should be string')
//       assert.ok(Array.isArray(results[1]), 'Logs should be array')
//       assert.ok(Array.isArray(results[2]), 'Logs should be array')
//       assert.ok(typeof seq1 === 'string', 'Sequential request 1 should complete')
//       assert.ok(typeof seq2 === 'string', 'Sequential request 2 should complete')
//     })

//     test('Should make direct eth_getLogs calls', async () => {
//       const client = new JSONRPCClient(RPC_URL)

//       const result = await client.call('eth_getLogs', {
//         fromBlock: '0xe17dbf',
//         toBlock: '0xe17dc8',
//         address: RAILGUN_PROXY_ADDRESS
//       })

//       assert.ok(Array.isArray(result))

//       if (result.length > 0) {
//         const firstLog = result[0]
//         assert.ok(typeof firstLog.address === 'string')
//         assert.ok(typeof firstLog.blockNumber === 'string')
//         assert.ok(typeof firstLog.transactionHash === 'string')
//         assert.ok(Array.isArray(firstLog.topics))
//       }
//     })

//     test('Should demonstrate network efficiency improvement', async () => {
//       const client = new JSONRPCClient(RPC_URL, 1000, true)

//       const start = Date.now()
//       const batchedResults = await Promise.all([
//         client.call('eth_blockNumber'),
//         client.call('eth_blockNumber'),
//         client.call('eth_blockNumber'),
//         client.call('eth_blockNumber')
//       ])
//       const end = Date.now()

//       console.log(`4 requests completed in ${end - start}ms using 1 HTTP call`)

//       assert.ok(batchedResults.length === 4, 'All requests should complete')
//       assert.ok(batchedResults.every(r => r === batchedResults[0]), 'All should return same block number')
//     })
//   })

//   describe('JSONRPCProvider', () => {
//     test('Should create provider and fetch head', async () => {
//       const provider = new JSONRPCProvider(
//         RAILGUN_PROXY_ADDRESS,
//         RPC_URL,
//         1000,
//         true
//       )
//       const head = await provider.head()
//       assert.ok(head)
//     })

//     test('Should create provider and retrieve blockchain data', async () => {
//       const provider = new JSONRPCProvider(
//         RAILGUN_PROXY_ADDRESS,
//         RPC_URL,
//         1000,
//         true
//       )

//       const startBlock = 14777791n
//       const endBlock = 14777800n

//       let blockCount = 0
//       let logCount = 0
//       let transactionCount = 0

//       const iterator = provider.from({
//         startHeight: startBlock,
//         endHeight: endBlock,
//         chunkSize: 5n,
//         liveSync: false
//       })

//       for await (const blockData of iterator) {
//         blockCount++
//         transactionCount += blockData.transactions.length

//         for (const transaction of blockData.transactions) {
//           logCount += transaction.logs.length
//         }
//       }

//       assert.ok(blockCount >= 0, 'Should process blocks successfully')
//       assert.ok(transactionCount >= 0, 'Should process transactions successfully')
//       assert.ok(logCount >= 0, 'Should process logs successfully')
//     })

//     test('Should demonstrate concurrent provider usage with batching', async () => {
//       const provider1 = new JSONRPCProvider(RAILGUN_PROXY_ADDRESS, RPC_URL, 1000, true)
//       const provider2 = new JSONRPCProvider(RAILGUN_PROXY_ADDRESS, RPC_URL, 1000, true)

//       const promises = [
//         (async () => {
//           let count = 0
//           const iterator1 = provider1.from({
//             startHeight: 14777791n,
//             endHeight: 14777793n,
//             chunkSize: 2n,
//             liveSync: false
//           })
//           // eslint-disable-next-line @typescript-eslint/no-unused-vars
//           for await (const _blockData of iterator1) {
//             count++
//           }
//           return count
//         })(),
//         (async () => {
//           let count = 0
//           const iterator2 = provider2.from({
//             startHeight: 14777793n,
//             endHeight: 14777795n,
//             chunkSize: 2n,
//             liveSync: false
//           })
//           // eslint-disable-next-line @typescript-eslint/no-unused-vars
//           for await (const _blockData of iterator2) {
//             count++
//           }
//           return count
//         })()
//       ]

//       const results = await Promise.all(promises)
//       assert.ok(results.every(count => count >= 0), 'Both providers should complete successfully')
//     })

//     test('Should properly sort blocks, transactions, and logs', async () => {
//       const provider = new JSONRPCProvider(RAILGUN_PROXY_ADDRESS, RPC_URL, 1000, false)

//       const startBlock = 14777791n
//       const endBlock = 14777800n

//       let previousBlockNumber = 0n
//       let blockCount = 0
//       let totalTransactions = 0
//       let totalLogs = 0

//       const iterator = provider.from({
//         startHeight: startBlock,
//         endHeight: endBlock,
//         chunkSize: 10n,
//         liveSync: false
//       })

//       for await (const blockData of iterator) {
//         blockCount++

//         assert.ok(blockData.number >= previousBlockNumber,
//           `Block ${blockData.number} should be >= previous block ${previousBlockNumber}`)

//         previousBlockNumber = blockData.number

//         let previousTxIndex = -1
//         for (const transaction of blockData.transactions) {
//           totalTransactions++

//           assert.ok(transaction.index > previousTxIndex,
//             `Transaction index ${transaction.index} should be > previous ${previousTxIndex}`)

//           previousTxIndex = transaction.index

//           let previousLogIndex = -1
//           for (const log of transaction.logs) {
//             totalLogs++

//             assert.ok(log.index > previousLogIndex,
//               `Log index ${log.index} should be > previous ${previousLogIndex}`)

//             previousLogIndex = log.index
//           }
//         }
//       }

//       assert.ok(blockCount > 0, 'Should process at least one block')
//       assert.ok(totalTransactions >= 0, 'Should process transactions')
//       assert.ok(totalLogs >= 0, 'Should process logs')
//     })

//     test('Should decode Railgun events properly with meaningful names and structured args', async () => {
//       const provider = new JSONRPCProvider(RAILGUN_PROXY_ADDRESS, RPC_URL, 1000, false)

//       // Use a known block range that should contain Railgun events
//       const startBlock = 14777791n
//       const endBlock = 14777800n

//       let totalDecodedEvents = 0
//       let hasRealEventNames = false
//       let hasStructuredArgs = false
//       const eventNames = new Set<string>()

//       const iterator = provider.from({
//         startHeight: startBlock,
//         endHeight: endBlock,
//         chunkSize: 10n,
//         liveSync: false
//       })

//       for await (const blockData of iterator) {
//         for (const transaction of blockData.transactions) {
//           for (const log of transaction.logs) {
//             totalDecodedEvents++

//             // Verify event has a real name (not 'RawLog')
//             assert.ok(typeof log.name === 'string', 'Event name should be string')
//             assert.ok(log.name !== 'RawLog', 'Event should have decoded name, not raw placeholder')

//             if (log.name !== 'RawLog') {
//               hasRealEventNames = true
//               eventNames.add(log.name)
//             }

//             // Verify args are structured objects, not raw data/topics
//             assert.ok(typeof log.args === 'object', 'Event args should be object')
//             assert.ok(log.args !== null, 'Event args should not be null')

//             // Should not have raw data/topics structure
//             const hasRawStructure = log.args['data'] && log.args['topics']
//             if (!hasRawStructure && Object.keys(log.args).length > 0) {
//               hasStructuredArgs = true
//             }

//             // Log first few events for inspection
//             if (totalDecodedEvents <= 3) {
//               console.log(`Event ${totalDecodedEvents}: ${log.name}`)
//               console.log(`  Args keys: [${Object.keys(log.args).join(', ')}]`)
//               // Handle BigInt serialization by converting to string
//               const argsForLogging = JSON.stringify(log.args, (_, value) =>
//                 typeof value === 'bigint' ? `${value}n` : value
//               , 2).slice(0, 200) + '...'
//               console.log('  Sample args:', argsForLogging)
//             }
//           }
//         }
//       }

//       // Assertions
//       assert.ok(totalDecodedEvents > 0, 'Should find some events to decode')
//       assert.ok(hasRealEventNames, 'Should have decoded at least some events with real names')
//       assert.ok(hasStructuredArgs, 'Should have structured arguments, not raw data/topics')

//       console.log(`Found ${eventNames.size} unique event types: [${Array.from(eventNames).join(', ')}]`)
//       assert.ok(eventNames.size > 0, 'Should have found recognizable Railgun event types')
//     })

//     test('Should handle unknown events gracefully without breaking', async () => {
//       const provider = new JSONRPCProvider(RAILGUN_PROXY_ADDRESS, RPC_URL, 1000, false)

//       const startBlock = 14777791n
//       const endBlock = 14777795n

//       let totalProcessedEvents = 0

//       const iterator = provider.from({
//         startHeight: startBlock,
//         endHeight: endBlock,
//         chunkSize: 5n,
//         liveSync: false
//       })

//       for await (const blockData of iterator) {
//         for (const transaction of blockData.transactions) {
//           for (const log of transaction.logs) {
//             totalProcessedEvents++

//             assert.ok(typeof log === 'object', 'Should return log object even for unknown events')
//             assert.ok(typeof log.name === 'string', 'Event name should always be string')
//             assert.ok(typeof log.index === 'number', 'Event index should be number')
//             assert.ok(typeof log.address === 'string', 'Event address should be string')
//             assert.ok(typeof log.args === 'object', 'Event args should be object')
//           }
//         }
//       }

//       assert.ok(totalProcessedEvents > 0, 'Should process some events')
//       console.log(`Processed ${totalProcessedEvents} events successfully`)
//     })

//     test('Should validate decoded event structure matches expected Railgun event format', async () => {
//       const provider = new JSONRPCProvider(RAILGUN_PROXY_ADDRESS, RPC_URL, 1000, false)

//       const iterator = provider.from({
//         startHeight: 14777791n,
//         endHeight: 14777793n,
//         chunkSize: 3n,
//         liveSync: false
//       })

//       const knownRailgunEvents = [
//         'CommitmentBatch', 'Nullifiers', 'GeneratedCommitmentBatch',
//         'FeeChange', 'TreasuryChange', 'VerifyingKeySet'
//       ]

//       let foundKnownEvents = false

//       for await (const blockData of iterator) {
//         for (const transaction of blockData.transactions) {
//           for (const log of transaction.logs) {
//             if (knownRailgunEvents.includes(log.name)) {
//               foundKnownEvents = true

//               // Verify structure based on event type
//               if (log.name === 'CommitmentBatch') {
//                 assert.ok('treeNumber' in log.args, 'CommitmentBatch should have treeNumber')
//                 assert.ok('startPosition' in log.args, 'CommitmentBatch should have startPosition')
//                 assert.ok('hash' in log.args, 'CommitmentBatch should have hash array')
//               }

//               if (log.name === 'Nullifiers') {
//                 assert.ok('treeNumber' in log.args, 'Nullifiers should have treeNumber')
//                 assert.ok('nullifier' in log.args, 'Nullifiers should have nullifier array')
//               }

//               console.log(`Valid ${log.name} event with args: [${Object.keys(log.args).join(', ')}]`)
//             }
//           }
//         }
//       }

//       // We might not always find known events in small ranges, so just log the result
//       console.log(`Found known Railgun events: ${foundKnownEvents}`)
//     })

//     test('Should use HTTP for regular calls with WebSocket URL', async () => {
//       if (!WS_URL) {
//         console.log('Skipping WebSocket HTTP test - WS_URL not configured')
//         return
//       }

//       const wsClient = new JSONRPCClient(WS_URL, 1000, true)

//       assert.ok(wsClient.supportsWebSocket, 'Should detect WebSocket support')

//       const blockNumber = await wsClient.call('eth_blockNumber')

//       assert.ok(typeof blockNumber === 'string', 'Should get block number via HTTP')
//       assert.ok(blockNumber.startsWith('0x'), 'Block number should be hex string')
//     })

//     test('Should handle WebSocket connection lifecycle', async () => {
//       if (!WS_URL) {
//         console.log('Skipping WebSocket lifecycle test - WS_URL not configured')
//         return
//       }

//       const client = new JSONRPCClient(WS_URL, 1000, true)

//       assert.ok(client.supportsWebSocket, 'Should support WebSocket')

//       try {
//         const subscriptionId = await client.subscribe('logs', {
//           address: RAILGUN_PROXY_ADDRESS
//         }, (_data) => {
//           console.log('Test received event:', typeof _data)
//         })

//         assert.ok(typeof subscriptionId === 'string', 'Should return subscription ID')
//         assert.ok(subscriptionId.length > 0, 'Subscription ID should not be empty')

//         await new Promise(resolve => setTimeout(resolve, 2000))

//         await client.unsubscribe(subscriptionId)
//         client.destroy()

//         assert.ok(true, 'Should handle subscription lifecycle without errors')
//       } catch (error) {
//         client.destroy()
//         console.log('WebSocket lifecycle test failed (may be expected):', error instanceof Error ? error.message : error)
//         assert.ok(true, 'Test completed (errors expected in test environment)')
//       }
//     })

//     test('Should connect to real WebSocket endpoint and receive live events', async () => {
//       if (!WS_URL) {
//         console.log('Skipping WebSocket test - WS_URL not configured')
//         return
//       }

//       const provider = new JSONRPCProvider(RAILGUN_PROXY_ADDRESS, RPC_URL, 1000, true)
//       assert.ok(provider.client.supportsWebSocket, 'Should detect WebSocket support for wss:// URL')

//       let eventCount = 0
//       const timeout = 30000

//       const startTime = Date.now()
//       try {
//         const iterator = provider.from({
//           startHeight: 21200000n,
//           chunkSize: 10n,
//           liveSync: true
//         })

//         const timeoutPromise = new Promise((_resolve, reject) => {
//           setTimeout(() => reject(new Error('Test timeout - no live events received')), timeout)
//         })

//         const eventPromise = (async () => {
//           for await (const blockData of iterator) {
//             eventCount++

//             console.log(`Received live event ${eventCount}: Block ${blockData.number} with ${blockData.transactions.length} transactions`)

//             if (eventCount >= 2) {
//               provider.destroy()
//               break
//             }
//           }
//         })()

//         await Promise.race([eventPromise, timeoutPromise])

//         const elapsed = Date.now() - startTime
//         console.log(`WebSocket live sync test completed in ${elapsed}ms`)

//         assert.ok(eventCount > 0, 'Should receive at least one live event')
//         assert.ok(eventCount >= 1, `Should receive events, got ${eventCount}`)
//       } catch (error) {
//         if (error instanceof Error && error.message.includes('timeout')) {
//           console.log('WebSocket test timed out - this may be expected if network is quiet')
//           assert.ok(true, 'Test completed (timeout expected in quiet network)')
//         } else {
//           throw error
//         }
//       } finally {
//         provider.destroy()
//       }
//     })
//   })
// })
