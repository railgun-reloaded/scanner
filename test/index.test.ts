// import fs from 'fs'

import { solo } from 'brittle'
import dotenv from 'dotenv'

import { NetworkName, SourceAggregator } from '../src'
import { ABIRailgunSmartWallet } from '../src/abi'
import { EVMProvider, GraphProvider } from '../src/data-source'
import { EthersProvider } from '../src/data-source/evm-provider/providers/ethers'
import { SubsquidProvider } from '../src/data-source/graph-provider/subsquid'
import type { RPCData } from '../src/data-source/types'

const TEST_CONTRACT_ADDRESS = '0xFA7093CDD9EE6932B4eb2c9e1cde7CE00B1FA4b9'
dotenv.config()
const TEST_RPC_URL = process.env['TEST_RPC_URL_HTTPS']
const TEST_RPC_CHUNK_SIZE = process.env['TEST_RPC_CHUNK_SIZE'] ?? '500'
/*
test('Iterate over EVM aggregated source', async (t) => {
  t.timeout(100_000_000)
  const provider = new EthersProvider(
    NetworkName.Ethereum,
    TEST_RPC_URL!,
    TEST_CONTRACT_ADDRESS,
    ABIRailgunSmartWallet,
    { chainId: 1, ws: false, chunkSize: BigInt(TEST_RPC_CHUNK_SIZE) }
  )

  const evmDataSource = new EVMProvider(provider)
  const aggregatedSource = new SourceAggregator([evmDataSource])
  await aggregatedSource.initialize()
  const eventIterator = await aggregatedSource.read(RAILGUN_SCAN_START_BLOCK_V2)
  const data = new Array<RPCData>()
  for await (const event of eventIterator) {
    if (data.length > 200) break
    data.push(event)
  }

  fs.writeFileSync('evm-events.json', JSON.stringify(data, (_, v) => typeof v === 'bigint' ? v.toString() : v))

  t.pass()

  await aggregatedSource.destroy()
})
*/
solo('Iterate over subsquid aggregated source', async (t) => {
  t.timeout(100_000_000)

  const provider = new SubsquidProvider(
    NetworkName.Ethereum
  )

  const graphProvider = new GraphProvider(provider)

  const evmProvider = new EVMProvider(new EthersProvider(NetworkName.Ethereum,
    TEST_RPC_URL!, TEST_CONTRACT_ADDRESS, ABIRailgunSmartWallet,
    {
      chainId: 1,
      ws: false,
      chunkSize: BigInt(TEST_RPC_CHUNK_SIZE)
    }))

  const aggregatedSource = new SourceAggregator([graphProvider, evmProvider])
  await aggregatedSource.initialize()

  const eventIterator = await aggregatedSource.read(0n)
  const data = new Array<RPCData>()

  for await (const event of eventIterator) {
    data.push(event)
    // fs.writeFileSync('latest-events.json', JSON.stringify(data, (_, v) => typeof v === 'bigint' ? v.toString() : v))
  }

  t.pass()

  await aggregatedSource.destroy()
})
/*
solo('Validate the events', async (t) => {
  t.timeout(100_000)

  const events = EVENT_JSON as Array<RPCEvent>
  let totalLegacyGeneratedCommitments = 0
  let totalLegacyEncryptedCommitments = 0
  let totalShieldCommitments = 0
  let totalUnshieldCommitments = 0
  // const totalNullified = 0
  let totalTransact = 0

  let lastBlockNumber = 0
  const nullifierSet = new Map<string, RPCEvent>()
  for (const event of events) {
    if (event.blockNumber >= lastBlockNumber) {
      lastBlockNumber = event.blockNumber
    } else {
      throw new Error('Not sorted in chronological order')
    }
    switch (event.name) {
      case 'GeneratedCommitmentBatch':
        totalLegacyGeneratedCommitments += event.args['commitments'].length
        break
      case 'CommitmentBatch':
        totalLegacyEncryptedCommitments += event.args['ciphertext'].length
        break
      case 'Nullified':
      case 'Nullifiers':
        {
        // totalNullified += event.args['nullifier'].length
          const nullifiers = event.args['nullifier']
          for (const nullifier of nullifiers) {
            if (nullifierSet.has(nullifier)) {
              const eventId = `${event.blockNumber}-${event.transactionIndex}-${event.transactionHash}-${event.logIndex}`
              const indexed = nullifierSet.get(nullifier)
              const eventId2 = `${indexed!.blockNumber}-${indexed!.transactionIndex}-${indexed!.transactionHash}-${indexed!.logIndex}`
              console.log(eventId, eventId2, eventId === eventId2, nullifiers.length, indexed!.args['nullifier'].length)
            } else nullifierSet.set(nullifier, event)
          }
        }
        break
      case 'Shield':
        totalShieldCommitments += event.args['commitments'].length
        break
      case 'Unshield':
        totalUnshieldCommitments += 1
        break
      case 'Transact':
        totalTransact += event.args['ciphertext'].length
        break
      default:
        console.log(event.name)
    }
  }
  console.log('GeneratedCommitment: ', totalLegacyGeneratedCommitments)
  console.log('CommitmentBatch: ', totalLegacyEncryptedCommitments)
  console.log('Nullified: ', nullifierSet.size)
  console.log('Shield: ', totalShieldCommitments)
  console.log('Unshield: ', totalUnshieldCommitments)
  console.log('Transact: ', totalTransact)
  const total = events.length
  console.log('Total: ', total)
})
*/
