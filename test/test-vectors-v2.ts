import type { EVMBlock } from '../src/models'
import { ActionType } from '../src/models'

const TEST_VECTOR_COMBINED_ACTION_DATA = {
  hash: '0x72934086331d253986cb496a8e54256c3dd1af8f6e5e97b7afd3e4f8840b68c9',
  number: '23035977',
  timestamp: '1753927271000',
  transactions: [
    {
      from: '0x56f879e6586bfacafd5219207a33cae1dace7c58',
      hash: '0x1493f0dada41e6848989e6e48a9b08dc7a50defd98ace3d81795c94f59bc137c',
      index: 36,
      actions: [
        [
          {
            actionType: 'Unshield',
            amount: '399000000000000000',
            eventLogIndex: 213,
            fee: '1000000000000000',
            token: {
              id: '0x000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
              tokenAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
              tokenSubID: '0x00',
              tokenType: 'ERC20'
            },
            to: '0x4025ee6512dbbda97049bcf5aa5d38c54af6be8a'
          }
        ],
        [
          {
            actionType: 'Transact',
            boundParamsHash: '0x2e6312f98f50c8f241d8e51c11d5089ea545111434f14a6cea5177e04aad9aa9',
            commitments: [
              {
                annotationData: '0xa1104850ff4d1ecbea368f96a0c0d6d2fba2fbd883c7fed9c1be569f4f601baab180f3c26f3a0b3d3d50b414b543d24103e03b59361647ed2ee041ba2d8f',
                blindedReceiverViewingKey: '0x8d03b0e5a83fa002dcef01ddfc335aaa4b243f6a77759c5bd9fb2085ff8e25a7',
                blindedSenderViewingKey: '0xdb07cb7f4710c11e8da89c1f0b7dd39574be3b6db39d635f0de1fea29b36f7e6',
                ciphertext: {
                  data: [
                    '0xba729ed653f0209fe637f8eb051095a6de7e17d45b3610b3131e7b86db488fd9',
                    '0x7684263165aa7434532dbcb88fc74f56bd26fd968c6c7038eebe40e6d63a9f68',
                    '0x0053719c12bbfb7ec7b28f097870356d6354e29e97174d764ea318fd3638490b'
                  ],
                  iv: '0x563c5b6e29976d3a9b390ddb17a838a5',
                  tag: '0x4c619ac5267ee7c0c49ddf0eb2b9c02c'
                },
                hash: '0x0ed2662f649fc5dd8bf886e68dc3a76b1074040afacbc75ad1a75183e529d1a8',
                memo: [
                  '0x'
                ],
                treeNumber: 1,
                treePosition: 46210
              },
              {
                annotationData: '0x5f37a5a5ff61902710da255c5f1b38a8cfe500c7f1b3b6a219ea7e25e19694f9e0b0713feeebec40aaf608773bbc2952b902882cce97e73ad234ca44440c',
                blindedReceiverViewingKey: '0xfe02f4a42ebd3147599cecadee610ca81ad31c7319d1735650bde06a00525858',
                blindedSenderViewingKey: '0xfe02f4a42ebd3147599cecadee610ca81ad31c7319d1735650bde06a00525858',
                ciphertext: {
                  data: [
                    '0x33726eab17fce93ef501f1f70f2ab9b10d63b264fe8dad0af1da687fd670c8b9',
                    '0x2144b7cd4e5e89ca91ff6de890bf1bb402281379e82b17a2d7a0bf990fa53642',
                    '0x1e607fa61f09d3e128ab78f29dddaa741b3de3c4f53629ed241d62ff2b63f562'
                  ],
                  iv: '0xa7cf8d48efd28b2a5bd2d1fa84dcbef6',
                  tag: '0xe12143652648ffc6749ca14c4528cdad'
                },
                hash: '0x16aade234bc7f263f400c0a753a103efa079dd80dbfb2f3329cc815a0457dcbc',
                memo: [
                  '0x'
                ],
                treeNumber: 1,
                treePosition: 46211
              }
            ],
            hasUnshield: true,
            nullifiers: [
              '0x2056444c82e9a18e1c239bc6c3b88dfd7c66e927f1005799bda413d8fae1f2eb'
            ],
            txID: '0x0d52c069bf9809ddb49d66dc8d92ce8ebe5c2ba1c551201b41a9177e5f0b95fa',
            unshieldCommitment: '0x155b2e9fd68c102b120c3a331f0a9c7a490f4cf32c938f6e9ec0a45f896aea03',
            unshieldToAddress: '0x0000000000000000000000004025ee6512dbbda97049bcf5aa5d38c54af6be8a',
            unshieldToken: {
              id: '0x000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
              tokenAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
              tokenSubID: '0x00',
              tokenType: 'ERC20'
            },
            unshieldValue: '400000000000000000',
            utxoBatchStartPositionOut: '46210',
            utxoTreeIn: '1',
            utxoTreeOut: '1'
          }
        ]
      ]
    }
  ]
}

const TEST_VECTOR_SHIELD = {
  hash: '0xcdd36295620719457a85505c1f5ad3b8e4eed0cdda4240f4ce7aa0fc4c6f0426',
  number: '23035798',
  timestamp: '1753925111000',
  transactions: [
    {
      from: '0xe82a5f807d391f28916edca4332461d81de7a14d',
      hash: '0xa2c386abb2277d19c7b713c1261c013b7ada64c6923681c2bf0b5f231fc854bf',
      index: 180,
      actions: [
        [
          {
            actionType: 'Shield',
            batchStartTreePosition: 46206,
            commitment: {
              encryptedBundle: [
                '0x6e1d9cc84998994a6e737f5bbff1bce53c700611d9723855e583de768dc5439d',
                '0x283e98510d78fcf0a3040ed0b5d124290af1a5146b1500cafa0063a3ab752142',
                '0xa2993b0691afcef873660a3c1d382b4903daea77c3da76c0797f85bc8151da63'
              ],
              fee: null,
              hash: '0x220720da239f83fac8f8987b5b239227759eaad2bdf9beed69d240e17406a767',
              preimage: {
                npk: '0x197934451e6684fd57ae7bba43e806008c2953674664f5de9825e7b4f87b07e3',
                token: {
                  id: '0x000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                  tokenAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                  tokenSubID: '0x00',
                  tokenType: 'ERC20'
                },
                value: '6443025638206018'
              },
              shieldKey: '0x389c361aeff04d3889f18ce12ead669b38c5cd506d464a57b6ca23a094dfe30e',
              treeNumber: 1,
              treePosition: 46206
            }
          }
        ]
      ]
    }
  ]
}

const TEST_VECTOR_FORMATTED_COMBINED_ACTION_DATA : EVMBlock = {
  hash: new Uint8Array([114, 147, 64, 134, 51, 29, 37, 57, 134, 203, 73, 106, 142, 84, 37, 108, 61, 209, 175, 143, 110, 94, 151, 183, 175, 211, 228, 248, 132, 11, 104, 201]),
  number: 23035977n,
  timestamp: 1753927271000n,
  transactions: [
    {
      from: new Uint8Array([86, 248, 121, 230, 88, 107, 250, 202, 253, 82, 25, 32, 122, 51, 202, 225, 218, 206, 124, 88]),
      hash: new Uint8Array([20, 147, 240, 218, 218, 65, 230, 132, 137, 137, 230, 228, 138, 155, 8, 220, 122, 80, 222, 253, 152, 172, 227, 216, 23, 149, 201, 79, 89, 188, 19, 124]),
      index: 36,
      actions: [
        [
          {
            actionType: ActionType.Unshield,
            amount: 399000000000000000n,
            eventLogIndex: 213,
            fee: 1000000000000000n,
            token: {
              id: new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 192, 42, 170, 57, 178, 35, 254, 141, 10, 14, 92, 79, 39, 234, 217, 8, 60, 117, 108, 194]),
              tokenAddress: new Uint8Array([192, 42, 170, 57, 178, 35, 254, 141, 10, 14, 92, 79, 39, 234, 217, 8, 60, 117, 108, 194]),
              tokenSubID: new Uint8Array([0]),
              tokenType: 'ERC20'
            },
            to: new Uint8Array([64, 37, 238, 101, 18, 219, 189, 169, 112, 73, 188, 245, 170, 93, 56, 197, 74, 246, 190, 138])
          }
        ],
        [
          {
            actionType: ActionType.TransactCommitment,
            boundParamsHash: new Uint8Array([46, 99, 18, 249, 143, 80, 200, 242, 65, 216, 229, 28, 17, 213, 8, 158, 165, 69, 17, 20, 52, 241, 74, 108, 234, 81, 119, 224, 74, 173, 154, 169]),
            commitments: [
              {
                annotationData: new Uint8Array([161, 16, 72, 80, 255, 77, 30, 203, 234, 54, 143, 150, 160, 192, 214, 210, 251, 162, 251, 216, 131, 199, 254, 217, 193, 190, 86, 159, 79, 96, 27, 170, 177, 128, 243, 194, 111, 58, 11, 61, 61, 80, 180, 20, 181, 67, 210, 65, 3, 224, 59, 89, 54, 22, 71, 237, 46, 224, 65, 186, 45, 143]),
                blindedReceiverViewingKey: new Uint8Array([141, 3, 176, 229, 168, 63, 160, 2, 220, 239, 1, 221, 252, 51, 90, 170, 75, 36, 63, 106, 119, 117, 156, 91, 217, 251, 32, 133, 255, 142, 37, 167]),
                blindedSenderViewingKey: new Uint8Array([219, 7, 203, 127, 71, 16, 193, 30, 141, 168, 156, 31, 11, 125, 211, 149, 116, 190, 59, 109, 179, 157, 99, 95, 13, 225, 254, 162, 155, 54, 247, 230]),
                ciphertext: {
                  data: [
                    new Uint8Array([186, 114, 158, 214, 83, 240, 32, 159, 230, 55, 248, 235, 5, 16, 149, 166, 222, 126, 23, 212, 91, 54, 16, 179, 19, 30, 123, 134, 219, 72, 143, 217]),
                    new Uint8Array([118, 132, 38, 49, 101, 170, 116, 52, 83, 45, 188, 184, 143, 199, 79, 86, 189, 38, 253, 150, 140, 108, 112, 56, 238, 190, 64, 230, 214, 58, 159, 104]),
                    new Uint8Array([0, 83, 113, 156, 18, 187, 251, 126, 199, 178, 143, 9, 120, 112, 53, 109, 99, 84, 226, 158, 151, 23, 77, 118, 78, 163, 24, 253, 54, 56, 73, 11])
                  ],
                  iv: new Uint8Array([86, 60, 91, 110, 41, 151, 109, 58, 155, 57, 13, 219, 23, 168, 56, 165]),
                  tag: new Uint8Array([76, 97, 154, 197, 38, 126, 231, 192, 196, 157, 223, 14, 178, 185, 192, 44])
                },
                hash: new Uint8Array([14, 210, 102, 47, 100, 159, 197, 221, 139, 248, 134, 230, 141, 195, 167, 107, 16, 116, 4, 10, 250, 203, 199, 90, 209, 167, 81, 131, 229, 41, 209, 168]),
                memo: [new Uint8Array()],
                treeNumber: 1,
                treePosition: 46210
              },
              {
                annotationData: new Uint8Array([95, 55, 165, 165, 255, 97, 144, 39, 16, 218, 37, 92, 95, 27, 56, 168, 207, 229, 0, 199, 241, 179, 182, 162, 25, 234, 126, 37, 225, 150, 148, 249, 224, 176, 113, 63, 238, 235, 236, 64, 170, 246, 8, 119, 59, 188, 41, 82, 185, 2, 136, 44, 206, 151, 231, 58, 210, 52, 202, 68, 68, 12]),
                blindedReceiverViewingKey: new Uint8Array([254, 2, 244, 164, 46, 189, 49, 71, 89, 156, 236, 173, 238, 97, 12, 168, 26, 211, 28, 115, 25, 209, 115, 86, 80, 189, 224, 106, 0, 82, 88, 88]),
                blindedSenderViewingKey: new Uint8Array([254, 2, 244, 164, 46, 189, 49, 71, 89, 156, 236, 173, 238, 97, 12, 168, 26, 211, 28, 115, 25, 209, 115, 86, 80, 189, 224, 106, 0, 82, 88, 88]),
                ciphertext: {
                  data: [
                    new Uint8Array([51, 114, 110, 171, 23, 252, 233, 62, 245, 1, 241, 247, 15, 42, 185, 177, 13, 99, 178, 100, 254, 141, 173, 10, 241, 218, 104, 127, 214, 112, 200, 185]),
                    new Uint8Array([33, 68, 183, 205, 78, 94, 137, 202, 145, 255, 109, 232, 144, 191, 27, 180, 2, 40, 19, 121, 232, 43, 23, 162, 215, 160, 191, 153, 15, 165, 54, 66]),
                    new Uint8Array([30, 96, 127, 166, 31, 9, 211, 225, 40, 171, 120, 242, 157, 221, 170, 116, 27, 61, 227, 196, 245, 54, 41, 237, 36, 29, 98, 255, 43, 99, 245, 98]),
                  ],
                  iv: new Uint8Array([167, 207, 141, 72, 239, 210, 139, 42, 91, 210, 209, 250, 132, 220, 190, 246]),
                  tag: new Uint8Array([225, 33, 67, 101, 38, 72, 255, 198, 116, 156, 161, 76, 69, 40, 205, 173])
                },
                hash: new Uint8Array([22, 170, 222, 35, 75, 199, 242, 99, 244, 0, 192, 167, 83, 161, 3, 239, 160, 121, 221, 128, 219, 251, 47, 51, 41, 204, 129, 90, 4, 87, 220, 188]),
                memo: [new Uint8Array()],
                treeNumber: 1,
                treePosition: 46211
              }
            ],
            hasUnshield: true,
            nullifiers: [
              new Uint8Array([32, 86, 68, 76, 130, 233, 161, 142, 28, 35, 155, 198, 195, 184, 141, 253, 124, 102, 233, 39, 241, 0, 87, 153, 189, 164, 19, 216, 250, 225, 242, 235])
            ],
            txID: new Uint8Array([13, 82, 192, 105, 191, 152, 9, 221, 180, 157, 102, 220, 141, 146, 206, 142, 190, 92, 43, 161, 197, 81, 32, 27, 65, 169, 23, 126, 95, 11, 149, 250]),
            unshieldCommitment: new Uint8Array([21, 91, 46, 159, 214, 140, 16, 43, 18, 12, 58, 51, 31, 10, 156, 122, 73, 15, 76, 243, 44, 147, 143, 110, 158, 192, 164, 95, 137, 106, 234, 3]),
            unshieldToAddress: new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 64, 37, 238, 101, 18, 219, 189, 169, 112, 73, 188, 245, 170, 93, 56, 197, 74, 246, 190, 138]),
            unshieldToken: {
              id: new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 192, 42, 170, 57, 178, 35, 254, 141, 10, 14, 92, 79, 39, 234, 217, 8, 60, 117, 108, 194]),
              tokenAddress: new Uint8Array([192, 42, 170, 57, 178, 35, 254, 141, 10, 14, 92, 79, 39, 234, 217, 8, 60, 117, 108, 194]),
              tokenSubID: new Uint8Array([0]),
              tokenType: 'ERC20'
            },
            unshieldValue: 400000000000000000n,
            utxoBatchStartPositionOut: 46210,
            utxoTreeIn: 1,
            utxoTreeOut: 1
          }
        ]
      ]
    }
  ]
}

const TEST_VECTOR_FORMATTED_SHIELD = {
  hash: new Uint8Array([205, 211, 98, 149, 98, 7, 25, 69, 122, 133, 80, 92, 31, 90, 211, 184, 228, 238, 208, 205, 218, 66, 64, 244, 206, 122, 160, 252, 76, 111, 4, 38]),
  number: 23035798n,
  timestamp: 1753925111000n,
  transactions: [
    {
      from: new Uint8Array([232, 42, 95, 128, 125, 57, 31, 40, 145, 110, 220, 164, 51, 36, 97, 216, 29, 231, 161, 77]),
      hash: new Uint8Array([162, 195, 134, 171, 178, 39, 125, 25, 199, 183, 19, 193, 38, 28, 1, 59, 122, 218, 100, 198, 146, 54, 129, 194, 191, 11, 95, 35, 31, 200, 84, 191]),
      index: 180,
      actions: [
        [
          {
            actionType: ActionType.ShieldCommitment,
            batchStartTreePosition: 46206,
            commitment: {
              encryptedBundle: [
                new Uint8Array([110, 29, 156, 200, 73, 152, 153, 74, 110, 115, 127, 91, 191, 241, 188, 229, 60, 112, 6, 17, 217, 114, 56, 85, 229, 131, 222, 118, 141, 197, 67, 157]),
                new Uint8Array([40, 62, 152, 81, 13, 120, 252, 240, 163, 4, 14, 208, 181, 209, 36, 41, 10, 241, 165, 20, 107, 21, 0, 202, 250, 0, 99, 163, 171, 117, 33, 66]),
                new Uint8Array([162, 153, 59, 6, 145, 175, 206, 248, 115, 102, 10, 60, 29, 56, 43, 73, 3, 218, 234, 119, 195, 218, 118, 192, 121, 127, 133, 188, 129, 81, 218, 99])
              ],
              hash: new Uint8Array([34, 7, 32, 218, 35, 159, 131, 250, 200, 248, 152, 123, 91, 35, 146, 39, 117, 158, 170, 210, 189, 249, 190, 237, 105, 210, 64, 225, 116, 6, 167, 103]),
              preimage: {
                npk: new Uint8Array([25, 121, 52, 69, 30, 102, 132, 253, 87, 174, 123, 186, 67, 232, 6, 0, 140, 41, 83, 103, 70, 100, 245, 222, 152, 37, 231, 180, 248, 123, 7, 227]),
                token: {
                  id: new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 192, 42, 170, 57, 178, 35, 254, 141, 10, 14, 92, 79, 39, 234, 217, 8, 60, 117, 108, 194]),
                  tokenAddress: new Uint8Array([192, 42, 170, 57, 178, 35, 254, 141, 10, 14, 92, 79, 39, 234, 217, 8, 60, 117, 108, 194]),
                  tokenSubID: new Uint8Array([0]),
                  tokenType: 'ERC20'
                },
                value: 6443025638206018n
              },
              shieldKey: new Uint8Array([56, 156, 54, 26, 239, 240, 77, 56, 137, 241, 140, 225, 46, 173, 102, 155, 56, 197, 205, 80, 109, 70, 74, 87, 182, 202, 35, 160, 148, 223, 227, 14]),
              treeNumber: 1,
              treePosition: 46206
            }
          }
        ]
      ]
    }
  ]
}

export {
  TEST_VECTOR_SHIELD, TEST_VECTOR_FORMATTED_SHIELD,
  TEST_VECTOR_COMBINED_ACTION_DATA, TEST_VECTOR_FORMATTED_COMBINED_ACTION_DATA
}
