import type { SubsquidClient } from '@railgun-reloaded/subsquid-client'

/**
 * Create a graphql query to get blockData from the subsquid
 * @param fromBlock - Start block height to get data from
 * @param offset - Offset/Cursor to the data
 * @param toBlock - End block height to get data from
 * @param limit - The number of entries to return
 * @returns EvmBlockData query
 */
const getEvmBlockQuery = (fromBlock: bigint, offset: number, toBlock?: bigint, limit = 10_000n) => {
  const offsetQuery = offset > 0 ? ` after: "${offset}", ` : ''
  const endBlockQuery = toBlock ? `number_lte: "${toBlock}"` : ''
  return `query MyQuery {
  evmBlocksConnection(orderBy: number_ASC, first: ${limit} ${offsetQuery} where: {number_gte: "${fromBlock}" ${endBlockQuery}}) {
    edges {
      node {
        hash
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
 * @yields - Array of Subsquid result
 */
async function * autoPaginateBlockQuery<T> (client: SubsquidClient, startBlock: bigint, endBlock?: bigint) : AsyncGenerator<T[]> {
  let hasNextPage = true
  let offset = 0
  let retryCount = 0
  const maxRetryCount = 5

  while (hasNextPage && retryCount < maxRetryCount) {
    const query = getEvmBlockQuery(startBlock, offset, endBlock)
    try {
      // @TODO replace this with  client.query
      const data = await client.request({ query })
      // @ts-ignore - Types are not available for now
      const { pageInfo, edges } = data.evmBlocksConnection
      hasNextPage = pageInfo.hasNextPage
      offset = pageInfo.endCursor

      // Reset retry count after each successful attempt
      retryCount = 0
      // @ts-ignore - Types are not available for now
      const entries = edges.map(e => e.node) as T[]
      yield entries
    } catch (err) {
      retryCount += 1
      console.log(err)
      console.log('Failed to get response for query, Retrying:', retryCount)
    }
  }
}

export { autoPaginateBlockQuery }
