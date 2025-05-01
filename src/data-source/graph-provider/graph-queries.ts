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
 * Get all queries for full sync
 * @param fromBlock - The block number to start from
 * @param limit - The number of transactions to return
 * @returns - transaction graphQL query
 */
const getFullSyncQuery = (fromBlock: number, limit = 10000) => {
  const commitmentsQuery = getCommitmentsQuery(fromBlock, limit)
  const nullifiersQuery = getNullifiersQuery(fromBlock, limit)
  const transactionsQuery = getTransactionsQuery(fromBlock, limit)
  const unshieldsQuery = getUnshieldsQuery(fromBlock, limit)
  return {
    commitments: commitmentsQuery,
    nullifiers: nullifiersQuery,
    transactions: transactionsQuery,
    unshields: unshieldsQuery,
  }
}

/**
 * - Auto paginate a GraphQL query
 * @param query - The query to execute
 * @param lastResults - The last results of the query
 * @returns - The paginated query
 */
const paginateQuery = async (
  query: any,
  lastResults: any
) => {
  // takes the last result for that 'key' & determines the next query.
  if (!lastResults) {
    return query
  }
  const queries = Object.keys(query)
  console.log('queries', queries)
  for (const key of queries) {
    const latest = lastResults[key]
    // @ts-ignore
    const lastResult = latest[latest.length - 1]
    const blockNumber = lastResult.blockNumber
    // print out the goods
    console.log('blockNumber', blockNumber, 'key', key, 'latest', latest.length)
    // check if the limit has been reached.
    if (latest.length !== query[key].limit) {
      // @ts-ignore
      delete query[key]
    } else {
      // @ts-ignore
      query[key].where.blockNumber_gte = (blockNumber).toString()
    }
  }

  return query
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
 * @param netowrk - The network name
 * @param query - The query to execute
 * @returns - The results of the query
 */
const autoPaginateQuery = async (netowrk: NetworkName, query: any) => {
  const allResults: Record<string, any[]> = {}
  let currentPage = 0
  // let currentPageBlock = fromBlock
  let hasNextPage = true
  let lastResults = null
  // console.log('queryName', queryName, 'fromBlock', fromBlock, 'limit', limit)
  // const lastResult = null
  while (hasNextPage) {
    // const paginatedQuery = {
    //   [`${queryName}`]: {
    //     ...query,
    //     where: { ...query.where, blockNumber_gte: (currentPageBlock).toString() },
    //     limit,
    //   }
    // }

    const paginatedQueryWithLastResults = await paginateQuery(query, lastResults)
    // console.log('paginatedQueryWithLastResults', paginatedQueryWithLastResults)
    const remainingKeys = Object.keys(paginatedQueryWithLastResults)
    // @ts-ignore
    hasNextPage = remainingKeys.length > 0
    console.log('hasNextPage', hasNextPage, 'remainingKeys', remainingKeys)
    if (!hasNextPage) {
      break
    }
    // Fetch the results for the current page
    // @ts-ignore
    const { events: results } = await fetchGraphQL(netowrk, paginatedQueryWithLastResults).catch((e) => {
      console.log('Error fetching GraphQL data', e)
    })
    // Add the results to the allResults array
    // @ts-ignore
    // allResults = [...allResults, ...results[`${queryName}`]]
    // consolidate the results for all the keys in the query.
    for (const key in results) {
      // if (key !== queryName) {
      if (!allResults[key]) {
        allResults[key] = []
      }
      // @ts-ignore
      if (!results[key]) {
        continue
      }
      // @ts-ignore
      allResults[key] = [...allResults[key], ...results[key]]
      // }
    }
    // @ts-ignore
    // console.log('lastResult', lastResult)
    // lastResult = results[`${queryName}`][results[`${queryName}`].length - 1]
    lastResults = results
    // Check if there are more pages

    // currentPageBlock = allResults[allResults.length - 1].blockNumber
    console.log('currentPage', currentPage, 'hasNextPage', hasNextPage)
    currentPage++
  }

  return { allResults }
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

export {
  getFullSyncQuery,
  getClientForNetwork,
  getUnshieldsQuery,
  getNullifiersQuery,
  getTransactionsQuery,
  getCommitmentsQuery,
  autoPaginateQuery,
  paginateQuery
}
