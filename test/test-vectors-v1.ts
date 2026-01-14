import type { EVMBlock } from '../src/models'
import { ActionType } from '../src/models'

const TEST_VECTOR_GENERATED_COMMITMENT = {
  hash: '0x7f82a10418572922c3aa723cc6606ec3ce54b46d0df606881b2f4a34efe9c558',
  number: '14751290',
  timestamp: '1652223332000',
  transactions: [
    {
      from: '0xe251bafd15a1e011f23f9c68673aaf2fa00c1d03',
      hash: '0x41eff3fed803f7a43ca8818b20e822bf12366da34161f12ef22f3ad9db0708ab',
      index: 211,
      actions: [
        [
          {
            actionType: 'GeneratedCommitmentBatch',
            batchStartTreePosition: 0,
            commitment: {
              encryptedRandom: [
                '0xc40732ce34d7d976aaff48d12c7858cc25b94d471df745fd3295d6f35ca07a55',
                '0x5ad869e8789418c868c7d62e71b216e5'
              ],
              hash: '0x04300939ad6f444712784a719c6d0bbe1b49a0b4d16983a6324bbbac136a83c7',
              preimage: {
                npk: '0x12a1f22c8e1f7feb6923ac7118fc66aaa19ebbb1abbbba9b8a271d06b2277abd',
                token: {
                  id: '0x000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7',
                  tokenAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
                  tokenSubID: '0x00',
                  tokenType: 'ERC20'
                },
                value: '460377201'
              },
              treeNumber: 0,
              treePosition: 0
            }
          }
        ]
      ]
    }
  ]
}

const TEST_VECTOR_FORMATTED_GENERATED_COMMITMENT : EVMBlock = {
  hash: new Uint8Array([127, 130, 161, 4, 24, 87, 41, 34, 195, 170, 114, 60, 198, 96, 110, 195, 206, 84, 180, 109, 13, 246, 6, 136, 27, 47, 74, 52, 239, 233, 197, 88]),
  number: 14751290n,
  timestamp: 1652223332000n,
  transactions: [
    {
      from: new Uint8Array([226, 81, 186, 253, 21, 161, 224, 17, 242, 63, 156, 104, 103, 58, 175, 47, 160, 12, 29, 3]),
      hash: new Uint8Array([65, 239, 243, 254, 216, 3, 247, 164, 60, 168, 129, 139, 32, 232, 34, 191, 18, 54, 109, 163, 65, 97, 241, 46, 242, 47, 58, 217, 219, 7, 8, 171]),
      index: 211,
      actions: [
        [
          {
            actionType: ActionType.GeneratedCommitment,
            batchStartTreePosition: 0,
            commitment: {
              encryptedRandom: [
                new Uint8Array([196, 7, 50, 206, 52, 215, 217, 118, 170, 255, 72, 209, 44, 120, 88, 204, 37, 185, 77, 71, 29, 247, 69, 253, 50, 149, 214, 243, 92, 160, 122, 85]),
                new Uint8Array([90, 216, 105, 232, 120, 148, 24, 200, 104, 199, 214, 46, 113, 178, 22, 229])
              ],
              hash: new Uint8Array([4, 48, 9, 57, 173, 111, 68, 71, 18, 120, 74, 113, 156, 109, 11, 190, 27, 73, 160, 180, 209, 105, 131, 166, 50, 75, 187, 172, 19, 106, 131, 199]),
              preimage: {
                npk: new Uint8Array([18, 161, 242, 44, 142, 31, 127, 235, 105, 35, 172, 113, 24, 252, 102, 170, 161, 158, 187, 177, 171, 187, 186, 155, 138, 39, 29, 6, 178, 39, 122, 189]),
                token: {
                  id: new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 218, 193, 127, 149, 141, 46, 229, 35, 162, 32, 98, 6, 153, 69, 151, 193, 61, 131, 30, 199]),
                  tokenAddress: new Uint8Array([218, 193, 127, 149, 141, 46, 229, 35, 162, 32, 98, 6, 153, 69, 151, 193, 61, 131, 30, 199]),
                  tokenSubID: new Uint8Array([0]),
                  tokenType: 'ERC20'
                },
                value: 460377201n
              },
              treeNumber: 0,
              treePosition: 0
            }
          }
        ]
      ]
    }
  ]
}

const TEST_VECTOR_ENCRYPTED_COMMITMENT = {
  hash: '0x041818f2c0dca9af900ae5dca7ba50e3222fc234e7d532d4589b36878aebedec',
  number: '14756510',
  timestamp: '1652294619000',
  transactions: [
    {
      from: '0x423b61fb723df2c95f80b152b96e6a8c30cd82ab',
      hash: '0x0b3b7179df1377c0a13058508e7dff2dbe8f73c39d68f569bc90b1c8b277082e',
      index: 45,
      actions: [
        [
          {
            actionType: 'CommitmentBatch',
            boundParamsHash: '0x2321edb8c56504b5d7c95d0cb7b6a08040f1ec30ab56578da367d3125f0136af',
            commitments: [
              {
                ciphertext: {
                  data: [
                    '0xba077af0caa4159cc358f0cf880fb72c3038151c15c7e0580a11ef71c56fab89',
                    '0x15029f24d9bff994a4b72d1ad8008c7436545aba02d6c5d5633335e363db6a96',
                    '0xe6a67c5aaa676132c8a827bd5eab751a19ffa6217fc939d70796437f3fc75675'
                  ],
                  iv: '0xd81b85e7bb86aaaaa5708e758a5b2f60',
                  tag: '0x85db0981157af8287d1f77af33372d16'
                },
                ephemeralKeys: [
                  '0x54f7ab4c7af8e3de0e4fc95642b1a9a221983fc4b3c1219e033a13a56948347e',
                  '0x2bab93585f4fcd99c9a44839e1cb601087c5ae349272f46e93d8f08182c89e03'
                ],
                hash: '0x15d56dd6bc48afa7165dfce1994f0434796b264e2a3ab929d6f69a79a7f6ea08',
                memo: [],
                treeNumber: 0,
                treePosition: 5
              },
              {
                ciphertext: {
                  data: [
                    '0x29af56b5ee38c354f72cfab416f662f2d463fe35bfb01041060d8a571073d636',
                    '0x3c3e438704f3bccac150549782e40f4c9763a28c2843b767ce8fd727aba0b075',
                    '0x2ef5c661d216d77eba27b6432bfcc0e8a5bec1605fdfce386a3293b1ca26297d'
                  ],
                  iv: '0x6857564725865f8ea67157d67f4afba8',
                  tag: '0x6d0b126ab3ead9ca8358efcacbbe8d80'
                },
                ephemeralKeys: [
                  '0x5b071346ee1c7867f5327934fd756e67ffc3b274608aeceee8ad998290b8d159',
                  '0x5b071346ee1c7867f5327934fd756e67ffc3b274608aeceee8ad998290b8d159'
                ],
                hash: '0x063918984ae9bef2ea38fd13e9ebf81aa55f0f522aba4f41b6792dfd6ff39f61',
                memo: [],
                treeNumber: 0,
                treePosition: 6
              }
            ],
            hasUnshield: true,
            nullifiers: [
              '0x2b211115e12680ed8dd0f5169d199277a007d33299d4230923e9aa5cd2fa42a0'
            ],
            txID: '0x065bcb1a9d4cfa110f05b480f79f27fe2ad672868d3d1bdec05df2ddaec8333d',
            unshieldCommitment: '0x2e70433e4560264e866c69f0c5f6c908e613874aaa4563052a37a25bebf36e61',
            unshieldToAddress: '0xe251bafd15a1e011f23f9c68673aaf2fa00c1d03',
            unshieldToken: {
              id: '0x000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7',
              tokenAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
              tokenSubID: '0x00',
              tokenType: 'ERC20'
            },
            unshieldValue: '280000000',
            utxoBatchStartPositionOut: '5',
            utxoTreeIn: '0',
            utxoTreeOut: '0'
          }
        ]
      ]
    }
  ]
}

const TEST_VECTOR_FORMATTED_ENCRYPTED_COMMITMENT : EVMBlock = {
  hash: new Uint8Array([
    4, 24, 24, 242, 192, 220, 169, 175, 144, 10, 229, 220, 167, 186, 80, 227, 34, 47, 194, 52, 231, 213, 50, 212, 88, 155, 54, 135, 138, 235, 237, 236]),
  number: 14756510n,
  timestamp: 1652294619000n,
  transactions: [
    {
      from: new Uint8Array([66, 59, 97, 251, 114, 61, 242, 201, 95, 128, 177, 82, 185, 110, 106, 140, 48, 205, 130, 171]),
      hash: new Uint8Array([11, 59, 113, 121, 223, 19, 119, 192, 161, 48, 88, 80, 142, 125, 255, 45, 190, 143, 115, 195, 157, 104, 245, 105, 188, 144, 177, 200, 178, 119, 8, 46]),
      index: 45,
      actions: [
        [
          {
            actionType: ActionType.EncryptedCommitment,
            boundParamsHash: new Uint8Array([35, 33, 237, 184, 197, 101, 4, 181, 215, 201, 93, 12, 183, 182, 160, 128, 64, 241, 236, 48, 171, 86, 87, 141, 163, 103, 211, 18, 95, 1, 54, 175]),
            commitments: [
              {
                ciphertext: {
                  data: [
                    new Uint8Array([186, 7, 122, 240, 202, 164, 21, 156, 195, 88, 240, 207, 136, 15, 183, 44, 48, 56, 21, 28, 21, 199, 224, 88, 10, 17, 239, 113, 197, 111, 171, 137]),
                    new Uint8Array([21, 2, 159, 36, 217, 191, 249, 148, 164, 183, 45, 26, 216, 0, 140, 116, 54, 84, 90, 186, 2, 214, 197, 213, 99, 51, 53, 227, 99, 219, 106, 150]),
                    new Uint8Array([230, 166, 124, 90, 170, 103, 97, 50, 200, 168, 39, 189, 94, 171, 117, 26, 25, 255, 166, 33, 127, 201, 57, 215, 7, 150, 67, 127, 63, 199, 86, 117])
                  ],
                  iv: new Uint8Array([216, 27, 133, 231, 187, 134, 170, 170, 165, 112, 142, 117, 138, 91, 47, 96]),
                  tag: new Uint8Array([133, 219, 9, 129, 21, 122, 248, 40, 125, 31, 119, 175, 51, 55, 45, 22])
                },
                ephemeralKeys: [
                  new Uint8Array([84, 247, 171, 76, 122, 248, 227, 222, 14, 79, 201, 86, 66, 177, 169, 162, 33, 152, 63, 196, 179, 193, 33, 158, 3, 58, 19, 165, 105, 72, 52, 126]),
                  new Uint8Array([43, 171, 147, 88, 95, 79, 205, 153, 201, 164, 72, 57, 225, 203, 96, 16, 135, 197, 174, 52, 146, 114, 244, 110, 147, 216, 240, 129, 130, 200, 158, 3])
                ],
                hash: new Uint8Array([21, 213, 109, 214, 188, 72, 175, 167, 22, 93, 252, 225, 153, 79, 4, 52, 121, 107, 38, 78, 42, 58, 185, 41, 214, 246, 154, 121, 167, 246, 234, 8
                ]),
                memo: [],
                treeNumber: 0,
                treePosition: 5
              },
              {
                ciphertext: {
                  data: [
                    new Uint8Array([
                      41, 175, 86, 181, 238, 56, 195, 84, 247, 44, 250, 180, 22, 246, 98, 242, 212, 99, 254, 53, 191, 176, 16, 65, 6, 13, 138, 87, 16, 115, 214, 54]),
                    new Uint8Array([60, 62, 67, 135, 4, 243, 188, 202, 193, 80, 84, 151, 130, 228, 15, 76, 151, 99, 162, 140, 40, 67, 183, 103, 206, 143, 215, 39, 171, 160, 176, 117]),
                    new Uint8Array([46, 245, 198, 97, 210, 22, 215, 126, 186, 39, 182, 67, 43, 252, 192, 232, 165, 190, 193, 96, 95, 223, 206, 56, 106, 50, 147, 177, 202, 38, 41, 125]),
                  ],
                  iv: new Uint8Array([104, 87, 86, 71, 37, 134, 95, 142, 166, 113, 87, 214, 127, 74, 251, 168]),
                  tag: new Uint8Array([109, 11, 18, 106, 179, 234, 217, 202, 131, 88, 239, 202, 203, 190, 141, 128])
                },
                ephemeralKeys: [
                  new Uint8Array([91, 7, 19, 70, 238, 28, 120, 103, 245, 50, 121, 52, 253, 117, 110, 103, 255, 195, 178, 116, 96, 138, 236, 238, 232, 173, 153, 130, 144, 184, 209, 89]),
                  new Uint8Array([91, 7, 19, 70, 238, 28, 120, 103, 245, 50, 121, 52, 253, 117, 110, 103, 255, 195, 178, 116, 96, 138, 236, 238, 232, 173, 153, 130, 144, 184, 209, 89])
                ],
                hash: new Uint8Array([6, 57, 24, 152, 74, 233, 190, 242, 234, 56, 253, 19, 233, 235, 248, 26, 165, 95, 15, 82, 42, 186, 79, 65, 182, 121, 45, 253, 111, 243, 159, 97]),
                memo: [],
                treeNumber: 0,
                treePosition: 6
              }
            ],
            hasUnshield: true,
            nullifiers: [
              new Uint8Array([43, 33, 17, 21, 225, 38, 128, 237, 141, 208, 245, 22, 157, 25, 146, 119, 160, 7, 211, 50, 153, 212, 35, 9, 35, 233, 170, 92, 210, 250, 66, 160])
            ],
            txID: new Uint8Array([6, 91, 203, 26, 157, 76, 250, 17, 15, 5, 180, 128, 247, 159, 39, 254, 42, 214, 114, 134, 141, 61, 27, 222, 192, 93, 242, 221, 174, 200, 51, 61
            ]),
            unshieldCommitment: new Uint8Array([46, 112, 67, 62, 69, 96, 38, 78, 134, 108, 105, 240, 197, 246, 201, 8, 230, 19, 135, 74, 170, 69, 99, 5, 42, 55, 162, 91, 235, 243, 110, 97
            ]),
            unshieldToAddress: new Uint8Array([226, 81, 186, 253, 21, 161, 224, 17, 242, 63, 156, 104, 103, 58, 175, 47, 160, 12, 29, 3
            ]),
            unshieldToken: {
              id: new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 218, 193, 127, 149, 141, 46, 229, 35, 162, 32, 98, 6, 153, 69, 151, 193, 61, 131, 30, 199
              ]),
              tokenAddress: new Uint8Array([218, 193, 127, 149, 141, 46, 229, 35, 162, 32, 98, 6, 153, 69, 151, 193, 61, 131, 30, 199]),
              tokenSubID: new Uint8Array([0]),
              tokenType: 'ERC20'
            },
            unshieldValue: 280000000n,
            utxoBatchStartPositionOut: 5,
            utxoTreeIn: 0,
            utxoTreeOut: 0
          }
        ]
      ]
    }
  ]
}

export {
  TEST_VECTOR_GENERATED_COMMITMENT, TEST_VECTOR_FORMATTED_GENERATED_COMMITMENT,
  TEST_VECTOR_ENCRYPTED_COMMITMENT, TEST_VECTOR_FORMATTED_ENCRYPTED_COMMITMENT
}
