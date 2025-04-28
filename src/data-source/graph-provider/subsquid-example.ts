import { SubsquidClient } from '@railgun-reloaded/subsquid-client'
import { CommitmentOrderByInput, UnshieldOrderByInput } from '@railgun-reloaded/subsquid-client/src/generated/types'
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
        where: { blockNumber_gte: '0' },
        limit: 5,
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
          {
            '... on LegacyGeneratedCommitment': [
              // no need for duplicate fields, they're already being indexed by the 'filter' above?
              'encryptedRandom',
              {
                preimage: [
                  // 'id',
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
                  // 'id', // also duplicate of 'initial query'
                  // could be used for continuity of data?
                  {
                    ciphertext: [
                      // 'id', // duplicate same aas above, no need? /
                      'iv',
                      'tag',
                      'data'
                    ]
                  },
                  'ephemeralKeys',
                  'memo'
                ]
              }
            ]
          }
        ],

      },
    }
  )

  const { unshields } = await client.query({
    unshields: {
      orderBy: [UnshieldOrderByInput.BlockNumberAsc, UnshieldOrderByInput.EventLogIndexAsc],
      where: { blockNumber_gte: '0' },
      limit: 5,
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
            'foobar',
            'id',
            'tokenType',
            'tokenSubID',
            'tokenAddress'
          ]
        }
      ]
    }
  })
  console.log('unshields', unshields)
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
  e.shields.forEach((shield: any) => {
    console.log('shield', shield)
    console.log('preimage', shield.preimage)
    console.log('encryptedRandom', shield.encryptedRandom)
  })
  // console.log(e)
}).catch(e => {
  console.error(e)
  process.exit(1)
})
