// import {
//   CommitmentOrderByInput,
//   // NullifierOrderByInput, TransactionOrderByInput, UnshieldOrderByInput
// } from '@railgun-reloaded/subsquid-client/src/generated/types'
import { solo as test } from 'brittle'

import {
  autoPaginateQuery, getCommitmentsQuery,
  // getNullifiersQuery, getTransactionsQuery, getUnshieldsQuery
} from '../../../../src/data-source/graph-provider/graph-queries'
import { NetworkName } from '../../../../src/globals'

test('Graph Queries', () => {
  // test('getUnshieldsQuery', () => {
  //   test('should return the correct query with default limit', (t) => {
  //     const fromBlock = 1000
  //     const query = getUnshieldsQuery(fromBlock)
  //     t.alike(query,
  //       {
  //         orderBy: [UnshieldOrderByInput.BlockNumberAsc, UnshieldOrderByInput.EventLogIndexAsc],
  //         where: { blockNumber_gte: '1000' },
  //         limit: 10000,
  //         fields: [
  //           'id',
  //           'blockNumber',
  //           'to',
  //           'transactionHash',
  //           'fee',
  //           'blockTimestamp',
  //           'amount',
  //           'eventLogIndex',
  //           {
  //             token: [
  //               'id',
  //               'tokenType',
  //               'tokenSubID',
  //               'tokenAddress'
  //             ]
  //           },
  //         ],
  //       })
  //   })

  //   test('should return the correct query with custom limit', (t) => {
  //     const fromBlock = 1000
  //     const limit = 500
  //     const query = getUnshieldsQuery(fromBlock, limit)

  //     t.is(query.limit, 500)
  //   })
  // })

  // test('getNullifiersQuery', () => {
  //   test('should return the correct query with default limit', (t) => {
  //     const fromBlock = 1000
  //     const query = getNullifiersQuery(fromBlock)

  //     t.alike(query,
  //       {
  //         orderBy: [NullifierOrderByInput.BlockNumberAsc, NullifierOrderByInput.NullifierDesc],
  //         where: { blockNumber_gte: '1000' },
  //         limit: 10000,
  //         fields: [
  //           'id',
  //           'blockNumber',
  //           'nullifier',
  //           'transactionHash',
  //           'blockTimestamp',
  //           'treeNumber',
  //         ]
  //       })
  //   })

  //   test('should return the correct query with custom limit', (t) => {
  //     const fromBlock = 1000
  //     const limit = 500
  //     const query = getNullifiersQuery(fromBlock, limit)

  //     t.is(query.limit, 500)
  //   })
  // })

  // test('getTransactionsQuery', () => {
  //   test('should return the correct query with default limit', (t) => {
  //     const fromBlock = 1000
  //     const query = getTransactionsQuery(fromBlock)

  //     t.alike(query,
  //       {
  //         orderBy: [TransactionOrderByInput.IdAsc],
  //         where: { blockNumber_gte: '1000' },
  //         limit: 10000,
  //         fields: [
  //           'id',
  //           'nullifiers',
  //           'commitments',
  //           'transactionHash',
  //           'boundParamsHash',
  //           'blockNumber',
  //           'utxoTreeIn',
  //           'utxoTreeOut',
  //           'utxoBatchStartPositionOut',
  //           'hasUnshield',
  //           {
  //             unshieldToken: [
  //               'tokenType',
  //               'tokenSubID',
  //               'tokenAddress',
  //             ]
  //           },
  //           'unshieldToAddress',
  //           'unshieldValue',
  //           'blockTimestamp',
  //           'verificationHash',
  //         ]
  //       })
  //   })

  //   test('should return the correct query with custom limit', (t) => {
  //     const fromBlock = 1000
  //     const limit = 500
  //     const query = getTransactionsQuery(fromBlock, limit)

  //     t.is(query.limit, 500)
  //   })
  // })

  // test('getCommitmentsQuery', () => {
  //   test('should return the correct query with default limit', (t) => {
  //     const fromBlock = 1000
  //     const query = getCommitmentsQuery(fromBlock)

  //     t.is(query.orderBy, [CommitmentOrderByInput.BlockNumberAsc, CommitmentOrderByInput.TreePositionAsc])
  //     t.is(query.where, { blockNumber_gte: '1000' })
  //     t.is(query.limit, 10000)
  //     t.is(query.fields.includes('id'), true)
  //     t.is(query.fields.includes('treeNumber'), true)
  //     t.is(query.fields.includes('hash'), true)
  //   })

  //   test('should return the correct query with custom limit', (t) => {
  //     const fromBlock = 1000
  //     const limit = 500
  //     const query = getCommitmentsQuery(fromBlock, limit)

  //     t.is(query.limit, 500)
  //   })

  //   test('should include fragment fields for different commitment types', (t) => {
  //     const fromBlock = 1000
  //     const query = getCommitmentsQuery(fromBlock)

  //     // Check for LegacyGeneratedCommitment fields
  //     const legacyGenFragment = query.fields.find(
  //       field => typeof field === 'object' && '... on LegacyGeneratedCommitment' in field
  //     )
  //     t.absent(legacyGenFragment)

  //     // Check for LegacyEncryptedCommitment fields
  //     const legacyEncFragment = query.fields.find(
  //       field => typeof field === 'object' && '... on LegacyEncryptedCommitment' in field
  //     )
  //     t.absent(legacyEncFragment)

  //     // Check for ShieldCommitment fields
  //     const shieldFragment = query.fields.find(
  //       field => typeof field === 'object' && '... on ShieldCommitment' in field
  //     )
  //     t.absent(shieldFragment)

  //     // Check for TransactCommitment fields
  //     const transactFragment = query.fields.find(
  //       field => typeof field === 'object' && '... on TransactCommitment' in field
  //     )
  //     t.absent(transactFragment)
  //   })
  // })

  test('AutoPaginate', async (t) => {
    const fromBlock = 1000
    const limit = 500
    const query = getCommitmentsQuery(fromBlock, limit)
    // t.alike(query,
    //   {
    //     orderBy: [CommitmentOrderByInput.BlockNumberAsc, CommitmentOrderByInput.TreePositionAsc],
    //     where: { blockNumber_gte: '1000' },
    //     limit: 500,
    //     fields: [
    //       'id',
    //       'treeNumber',
    //       'batchStartTreePosition',
    //       'treePosition',
    //       'blockNumber',
    //       'transactionHash',
    //       'blockTimestamp',
    //       'commitmentType',
    //       'hash',
    //     ]
    //   })

    const { allResults: paginatedResults } = await autoPaginateQuery(NetworkName.Ethereum, { commitments: query })
    // @ts-expect-error
    t.is(paginatedResults['commitments'].length, 500) // Assuming no results for the test case

    //
  })
})
