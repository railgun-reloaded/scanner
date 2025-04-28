import { SubsquidClient } from '@railgun-reloaded/subsquid-client'
import { SUPPORTED_NETWORKS } from '@railgun-reloaded/subsquid-client/src/networks'
// example output: ['ethereum', 'ethereumSepolia', 'bsc', '

console.log(SUPPORTED_NETWORKS)

// Initialize the client with a predefined network

/**
 *  Example usage of the SubsquidClient
 * @returns -{ tokens: any[] }
 */
const test = async () => {
// Or initialize with a custom Subsquid URL
  // const customClient = new SubsquidClient({ customSubsquidUrl: 'https://my-subsquid-api.example.com/graphql' })
  const client = new SubsquidClient({ network: 'ethereum' })

  // Simple query for tokens with type-safety
  const { tokens } = await client.query({
    tokens: {
      fields: ['id', 'tokenType', 'tokenAddress', 'tokenSubID'],
      limit: 5
    }
  })
  return tokens
}
test().then(e => {
  console.log(e)
}).catch(e => {
  console.error(e)
  process.exit(1)
})
