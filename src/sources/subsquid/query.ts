import type { SubsquidClient } from '@railgun-reloaded/subsquid-client'

/**
 * Create a graphql query to get blockData from the subsquid
 * @param fromBlock - Block height to get data from
 * @param offset - Offset/Cursor to the data
 * @param limit - The number of entries to return
 * @returns EvmBlockData query
 */
const getEvmBlockQuery = (fromBlock: bigint, offset: number, limit = 10_000) => {
  const offsetQuery = offset > 0 ? ` after: "${offset}", ` : ''
  return `
        query MyQuery {
          evmBlocksConnection(orderBy: number_ASC, first: ${limit}, ${offsetQuery} where: {number_gte: "${fromBlock}"}) {
            edges {
              node {
                hash: id
                number
                timestamp
                transactions {
                  from
                  hash
                  index
                  logs {
                    address
                    args
                    id
                    index
                    name
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
const autoPaginateBlockQuery = async<T>(client: SubsquidClient, startBlock: bigint, endBlock?: bigint) : Promise<T[]> => {
  const results = new Array<T>()
  let hasNextPage = true
  let offset = 0
  while (hasNextPage) {
    const query = getEvmBlockQuery(startBlock, offset)
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
      if (edges[lastEntry]!.number > endBlock) {
        // Only push data upto last block number
        results.push(...entries.filter((n: any) => n.number < endBlock) as T[])
      } else {
        results.push(...entries)
      }
    } else {
      results.push(...entries)
    }
  }
  // @TODO Format and return
  return results
}

export { autoPaginateBlockQuery }
