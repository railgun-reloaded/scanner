import { SubsquidClient } from '@railgun-reloaded/subsquid-client'
import { CommitmentOrderByInput } from '@railgun-reloaded/subsquid-client/src/generated/types'
import { SUPPORTED_NETWORKS } from '@railgun-reloaded/subsquid-client/src/networks'
// example output: ['ethereum', 'ethereumSepolia', 'bsc', '

console.log(SUPPORTED_NETWORKS)

// Initialize the client with a predefined network
/**
 * Get all shields
 * @returns -{ tokens: any[] }
 */
const getAllShields = async () => {
  const client = new SubsquidClient({ network: 'ethereum' })

  const { commitments } = await client.query(
    {
      commitments: {
        orderBy: [CommitmentOrderByInput.BlockNumberAsc, CommitmentOrderByInput.TreePositionAsc],
        where: { blockNumber_gte: '$blockNumber' },
        limit: 10000,
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
        ],
        on: {
          // LegacyGeneratedCommitment: [
          //   'id',
          //   'treeNumber',
          //   'batchStartTreePosition',
          //   'treePosition',
          //   'blockNumber',
          //   'transactionHash',
          //   'blockTimestamp',
          //   'commitmentType',
          //   'hash',
          //   'encryptedRandom',
          //   `preimage {
          //     id
          //     npk
          //     value
          //     token {
          //       id
          //       tokenType
          //       tokenSubID
          //       tokenAddress
          //     }
          //   }`,
          // ],
          LegacyEncryptedCommitment: [
            'id',
            'blockNumber',
            'blockTimestamp',
            'transactionHash',
            'treeNumber',
            'batchStartTreePosition',
            'treePosition',
            'commitmentType',
            'hash',
            // here’s the alias + nested object exactly as you wrote it:
            'legacyCiphertext: ciphertext {',
            '  id',
            '  ciphertext {',
            '    id',
            '    iv',
            '    tag',
            '    data',
            '  }',
            '  ephemeralKeys',
            '  memo',
            '}',
          ],
        },
      },
    },
    {
      operationName: 'Commitments',
      variables: [{ name: 'blockNumber', type: 'BigInt', default: 0 }],
    }
  )
  return commitments
}
/**
 *  Example usage of the SubsquidClient
 * @returns -{ tokens: any[] }
 */
const test = async () => {
// Or initialize with a custom Subsquid URL
  // const customClient = new SubsquidClient({ customSubsquidUrl: 'https://my-subsquid-api.example.com/graphql' })

  // Simple query for tokens with type-safety
  // const { tokens } = await client.query({
  //   tokens: {
  //     fields: ['id', 'tokenType', 'tokenAddress', 'tokenSubID'],
  //     limit: 5
  //   }
  // })
  const shields = await getAllShields()

  return { shields }
}
test().then(e => {
  console.log(e)
}).catch(e => {
  console.error(e)
  process.exit(1)
})
