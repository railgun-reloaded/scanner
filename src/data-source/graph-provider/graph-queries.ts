import { SubsquidClient } from '@railgun-reloaded/subsquid-client'
import { CommitmentOrderByInput, NullifierOrderByInput, TransactionOrderByInput, UnshieldOrderByInput } from '@railgun-reloaded/subsquid-client/src/generated/types'

import type { NetworkName } from '../../globals'
import { SubsquidNetworkName } from '../../globals'

/**
 * Get all unshields
 * @param fromBlock - The block number to start from
 * @param limit - The number of unshields to return
 * @returns - unshield graphQL query
 */
const getUnshieldsQuery = (fromBlock: number, limit = 10000) => {
  return {
    orderBy: [UnshieldOrderByInput.BlockNumberAsc, UnshieldOrderByInput.EventLogIndexAsc],
    where: { blockNumber_gte: fromBlock.toString() },
    limit,
    fields: [
      'id',
      'blockNumber',
      'to',
      'transactionHash',
      'fee',
      'blockTimestamp',
      'amount',
      'eventLogIndex',
      {
        token: [
          'id',
          'tokenType',
          'tokenSubID',
          'tokenAddress'
        ]
      },
    ],
  }
}

/**
 * Get all nullifiers
 * @param fromBlock - The block number to start from
 * @param limit - The number of nullifiers to return
 * @returns - nullifier graphQL query
 */
const getNullifiersQuery = (fromBlock: number, limit = 10000) => {
  return {
    orderBy: [NullifierOrderByInput.BlockNumberAsc, NullifierOrderByInput.NullifierDesc],
    where: { blockNumber_gte: fromBlock.toString() },
    limit,
    fields: [
      'id',
      'blockNumber',
      'nullifier',
      'transactionHash',
      'blockTimestamp',
      'treeNumber',
    ]

  }
}

/**
 * Get all transactions
 * @param fromBlock - The block number to start from
 * @param limit - The number of transactions to return
 * @returns - transaction graphQL query
 */
const getTransactionsQuery = (fromBlock: number, limit = 10000) => {
  return {
    orderBy: [TransactionOrderByInput.IdAsc],
    where: { blockNumber_gte: fromBlock.toString() },
    limit,
    fields: [
      'id',
      'nullifiers',
      'commitments',
      'transactionHash',
      'boundParamsHash',
      'blockNumber',
      'utxoTreeIn',
      'utxoTreeOut',
      'utxoBatchStartPositionOut',
      'hasUnshield',
      {
        unshieldToken: [
          'tokenType',
          'tokenSubID',
          'tokenAddress',
        ]
      },
      'unshieldToAddress',
      'unshieldValue',
      'blockTimestamp',
      'verificationHash',
    ]
  }
}

/**
 * Get all commitments
 * @param fromBlock - The block number to start from
 * @param limit - The number of transactions to return
 * @returns - transaction graphQL query
 */
const getCommitmentsQuery = (fromBlock: number, limit = 10000) => {
  return {
    orderBy: [CommitmentOrderByInput.BlockNumberAsc, CommitmentOrderByInput.TreePositionAsc],
    where: { blockNumber_gte: fromBlock.toString() },
    limit,

    fields: [
      'id',
      'treeNumber',
      'batchStartTreePosition',
      'treePosition',
      'blockNumber',
      'transactionHash',
      'blockTimestamp',
      'commitmentType',
      'hash',
      // TODO: only use the legacy fields when blocknumber is < than their respective blocknumber upgrades.
      {
        '... on LegacyGeneratedCommitment': [
          // no need for duplicate fields, they're already being indexed by the 'filter' above?
          'encryptedRandom',
          {
            preimage: [
              'npk',
              'value',
              {
                token: [
                  'id', // THIS IS NOT THE SAME AS ID ABOVE
                  'tokenType',
                  'tokenSubID',
                  'tokenAddress'
                ]
              }
            ]
          },
        ]
      },
      {
        '... on LegacyEncryptedCommitment': [
          {
            ciphertext: [
              {
                ciphertext: [
                  'iv',
                  'tag',
                  'data'
                ]
              },
              'ephemeralKeys',
              'legacyMemo: memo'
            ]
          }
        ]
      },
      {
        '... on ShieldCommitment': [
          'shieldKey',
          'fee',
          'encryptedBundle',
          {
            preimage: [
              'npk',
              'value',
              {
                token: [
                  'id',
                  'tokenType',
                  'tokenSubID',
                  'tokenAddress',
                ]
              }
            ]
          }
        ]
      },
      {
        '... on TransactCommitment': [
          {
            ciphertext: [
              // 'id',
              {
                ciphertext: [
                  // 'id',
                  'iv',
                  'tag',
                  'data',
                ]
              },
              'blindedSenderViewingKey',
              'blindedReceiverViewingKey',
              'annotationData',
              'memo'
            ]
          }
        ]
      },
      {
        '... on ShieldCommitment': [
          'shieldKey',
          'fee',
          'encryptedBundle',
          {
            preimage: [
              'npk',
              'value',
              {
                token: [
                  'id',
                  'tokenType',
                  'tokenSubID',
                  'tokenAddress',
                ]
              }
            ]
          }
        ]
      },
      {
        '... on TransactCommitment': [
          {
            ciphertext: [
              {
                ciphertext: [
                  'iv',
                  'tag',
                  'data',
                ]
              },
              'blindedSenderViewingKey',
              'blindedReceiverViewingKey',
              'annotationData',
              'memo'

            ]
          }
        ]
      }
    ],
  }
}

/**
 * Get the client for the network
 * @param network - The network name
 * @returns - The client for the network
 */
const getClientForNetwork = (network: NetworkName) => {
  const formattedName = SubsquidNetworkName[network]
  const client = new SubsquidClient({ network: formattedName })
  return client
}

/**
 * Auto paginate a GraphQL query
 * @param queryName - The name of the query
 * @param netowrk - The network name
 * @param query - The query to execute
 * @param fromBlock - The block number to start from
 * @param limit - The number of results to return
 * @returns - The results of the query
 */
const autoPaginateQuery = async (queryName: string, netowrk: NetworkName, query: any, fromBlock: number, limit = 10_000) => {
  let allResults: any[] = []
  let currentPage = 0
  let currentPageBlock = fromBlock
  let hasNextPage = true
  console.log('queryName', queryName, 'fromBlock', fromBlock, 'limit', limit)
  let lastResult = null
  while (hasNextPage) {
    const paginatedQuery = {
      [`${queryName}`]: {
        ...query,
        where: { ...query.where, blockNumber_gte: (currentPageBlock).toString() },
        limit,
      }
    }

    // Fetch the results for the current page
    const { events: results } = await fetchGraphQL(netowrk, paginatedQuery)
    // Add the results to the allResults array
    // @ts-ignore
    allResults = [...allResults, ...results[`${queryName}`]]
    // @ts-ignore
    // console.log('lastResult', lastResult)
    lastResult = results[`${queryName}`][results[`${queryName}`].length - 1]
    // Check if there are more pages
    // @ts-ignore
    hasNextPage = results.length === limit
    currentPageBlock = allResults[allResults.length - 1].blockNumber
    console.log('currentPage', currentPage, 'hasNextPage', hasNextPage, 'currentPageBlock', currentPageBlock)
    currentPage++
  }

  return { allResults, lastEventBlock: BigInt(lastResult.blockNumber) }
}

/**
 * Fetch GraphQL data
 * @param network - The network name
 * @param paginatedQuery - The paginated query to execute
 * @returns - The results of the query
 */
const fetchGraphQL = async (network: NetworkName, paginatedQuery: any) => {
  const client = getClientForNetwork(network)
  const result = await client.query(paginatedQuery)
  return { events: result }
}

export { getClientForNetwork, getUnshieldsQuery, getNullifiersQuery, getTransactionsQuery, getCommitmentsQuery, autoPaginateQuery }
