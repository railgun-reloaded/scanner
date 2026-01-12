import type { SubsquidClient } from '@railgun-reloaded/subsquid-client'

/**
 * Create a graphql query to get blockData from the subsquid
 * @param fromBlock - Start block height to get data from
 * @param offset - Offset/Cursor to the data
 * @param endBlock - End block height to get data from
 * @param limit - The number of entries to return
 * @returns EvmBlockData query
 */
const getEvmBlockQuery = (fromBlock: bigint, offset: number, endBlock?: bigint, limit = 10_000n) => {
  const offsetQuery = offset > 0 ? ` after: "${offset}", ` : ''
  const endBlockQuery = endBlock ? `number_lte: "${endBlock}"` : ''
  return `query MyQuery {
  evmBlocksConnection(orderBy: number_ASC, first: ${limit} ${offsetQuery} where: {number_gte: "${fromBlock}" ${endBlockQuery}}) {
    edges {
      node {
        hash
        id
        number
        timestamp
        transactions {
          from
          hash
          index
          actions {
            ... on RailgunTransaction {
              actionType
              unshieldCommitment
              boundParamsHash
              commitments {
                ... on RailgunTransactCommitment {
                  annotationData
                  blindedReceiverViewingKey
                  blindedSenderViewingKey
                  ciphertext {
                    data
                    iv
                    tag
                  }
                  hash
                  memo
                  treeNumber
                  treePosition
                }
                ... on RailgunEncryptedCommitment {
                  ciphertext {
                    data
                    iv
                    tag
                  }
                  ephemeralKeys
                  hash
                  memo
                  treeNumber
                  treePosition
                }
              }
              hasUnshield
              nullifiers
              txID
              unshieldToAddress
              unshieldToken {
                id
                tokenAddress
                tokenSubID
                tokenType
              }
              unshieldValue
              utxoBatchStartPositionOut
              utxoTreeIn
              utxoTreeOut
            }
            ... on RailgunShield {
              actionType
              batchStartTreePosition
              commitment {
                ... on RailgunGeneratedCommitment {
                  encryptedRandom
                  hash
                  preimage {
                    npk
                    token {
                      id
                      tokenAddress
                      tokenSubID
                      tokenType
                    }
                    value
                  }
                  treeNumber
                  treePosition
                }
                ... on RailgunShieldCommitment {
                  fee
                  encryptedBundle
                  hash
                  preimage {
                    npk
                    token {
                      id
                      tokenAddress
                      tokenSubID
                      tokenType
                    }
                    value
                  }
                  shieldKey
                  treeNumber
                  treePosition
                }
              }
            }
            ... on RailgunUnshield {
              actionType
              amount
              eventLogIndex
              fee
              to
              token {
                id
                tokenAddress
                tokenSubID
                tokenType
              }
            }
          }
        }
      }
    }
    pageInfo {
      endCursor
      hasNextPage
    }
  }
}`
}

/**
 * Auto paginate a GraphQL query
 * @param client - Subsquid client instance
 * @param startBlock - Starting height
 * @param endBlock - End height
 * @returns - The results of the query
 */
/*
const autoPaginateBlockQuery = async<T>(client: SubsquidClient, startBlock: bigint, endBlock?: bigint) : Promise<T[]> => {
  const results = new Array<T>()
  let hasNextPage = true
  let offset = 0

  const resultLimits = 10_000n
  let limit = resultLimits
  if (endBlock) {
    const blockRange = endBlock - startBlock
    limit = blockRange < resultLimits ? blockRange : resultLimits
  }
  while (hasNextPage) {
    const query = getEvmBlockQuery(startBlock, offset, limit)
    // @TODO replace this with  client.query
    const data = await client.request({ query })
    // @ts-ignore - Types are not available for now
    const { pageInfo, edges } = data.evmBlocksConnection
    hasNextPage = pageInfo.hasNextPage
    offset = pageInfo.endCursor

    // @ts-ignore - Types are not available for now
    const entries = edges.map(e => e.node) as T[]
    if (endBlock) {
      const lastEntry = entries.length - 1
      const lastFetchedBlock = BigInt(edges[lastEntry].node.number)
      const blockRange = endBlock - lastFetchedBlock
      limit = blockRange < resultLimits ? blockRange : resultLimits
      results.push(...entries)
    } else {
      results.push(...entries)
    }
  }
  // @TODO Format and return
  return results
}
*/

/**
 * Auto paginate a GraphQL query
 * @param client - Subsquid client instance
 * @param startBlock - Starting height
 * @param endBlock - End height
 * @returns - The results of the query
 * @yields - Array of Subsquid result
 */
async function * autoPaginateBlockQuery<T> (client: SubsquidClient, startBlock: bigint, endBlock?: bigint) : AsyncGenerator<T[]> {
  let hasNextPage = true
  let offset = 0
  while (hasNextPage) {
    const query = getEvmBlockQuery(startBlock, offset, endBlock)
    // @TODO replace this with  client.query
    const data = await client.request({ query })
    // @ts-ignore - Types are not available for now
    const { pageInfo, edges } = data.evmBlocksConnection
    hasNextPage = pageInfo.hasNextPage
    offset = pageInfo.endCursor

    // @ts-ignore - Types are not available for now
    const entries = edges.map(e => e.node) as T[]
    yield entries
  }
}

export { autoPaginateBlockQuery }
