import assert from 'assert'
import { describe, test } from 'node:test'

import type { Transact } from '../src/models'
import { formatBlockData } from '../src/sources/formatter/blockdata-formatter'
import { hexToBytes } from '../src/sources/formatter/bytes'

import { TEST_VECTOR_ENCRYPTED_COMMITMENT, TEST_VECTOR_FORMATTED_ENCRYPTED_COMMITMENT, TEST_VECTOR_FORMATTED_GENERATED_COMMITMENT, TEST_VECTOR_GENERATED_COMMITMENT } from './test-vectors-v1'
import { TEST_VECTOR_COMBINED_ACTION_DATA, TEST_VECTOR_FORMATTED_COMBINED_ACTION_DATA, TEST_VECTOR_FORMATTED_SHIELD, TEST_VECTOR_SHIELD } from './test-vectors-v2'

describe('Formatter Test', () => {
  test('Should properly format hex string to bytes', () => {
    const testVectors = [
      {
        input: '0xacbbbb1231',
        output: new Uint8Array([172, 187, 187, 18, 49]),
      },
      {
        input: '0x4c47554',
        output: new Uint8Array([4, 196, 117, 84]),
      },
      {
        input: '0x414e4f4e594d495459',
        output: new Uint8Array([65, 78, 79, 78, 89, 77, 73, 84, 89]),
      },
    ]

    for (const { input, output: actualArray } of testVectors) {
      const expectedArray = hexToBytes(input)
      assert.deepStrictEqual(actualArray, expectedArray)
    }
  })

  test('Should properly format stripped hex string to bytes', () => {
    const testVectors = [
      {
        input: '0138bc',
        output: new Uint8Array([1, 56, 188]),
      },
      {
        input: '5241494c47554e',
        output: new Uint8Array([82, 65, 73, 76, 71, 85, 78]),
      },
      {
        input: '50524956414359202620414e4f4e594d495459',
        output: new Uint8Array([80, 82, 73, 86, 65, 67, 89, 32, 38, 32, 65, 78, 79, 78, 89, 77, 73, 84, 89]),
      },
    ]

    for (const { input, output: actualArray } of testVectors) {
      const expectedArray = hexToBytes(input)
      assert.deepStrictEqual(actualArray, expectedArray)
    }
  })

  test('[V1] Should properly format GeneratedCommitment', () => {
    const expectedArray = formatBlockData(TEST_VECTOR_GENERATED_COMMITMENT)
    assert.deepStrictEqual(TEST_VECTOR_FORMATTED_GENERATED_COMMITMENT, expectedArray)
  })

  test('[V1] Should properly format EncryptedCommitment', () => {
    const expectedArray = formatBlockData(TEST_VECTOR_ENCRYPTED_COMMITMENT)
    assert.deepStrictEqual(TEST_VECTOR_FORMATTED_ENCRYPTED_COMMITMENT, expectedArray)
  })

  test('[V1] Should properly format EncryptedCommitment for missing unshield', () => {
    const inputData = TEST_VECTOR_ENCRYPTED_COMMITMENT

    // Remove unshield data
    if (inputData.transactions[0]?.actions[0]?.[0]) {
      inputData.transactions[0].actions[0][0].hasUnshield = false
    }

    const expectedArray = formatBlockData(inputData)
    const actualArray = TEST_VECTOR_FORMATTED_ENCRYPTED_COMMITMENT

    const transact = actualArray.transactions[0]?.actions[0]?.[0] as unknown as Transact
    // Remove corresponding value in output as well
    transact.hasUnshield = false
    delete transact.unshieldCommitment
    delete transact.unshieldToAddress
    delete transact.unshieldToken
    delete transact.unshieldValue

    assert.deepStrictEqual(actualArray, expectedArray)
  })

  test('[V2] Should properly format ShieldCommitment', () => {
    const expectedArray = formatBlockData(TEST_VECTOR_SHIELD)
    assert.deepStrictEqual(TEST_VECTOR_FORMATTED_SHIELD, expectedArray)
  })

  test('[V2] Should properly format TransactCommitment', () => {
    const expectedArray = formatBlockData(TEST_VECTOR_COMBINED_ACTION_DATA)
    assert.deepStrictEqual(TEST_VECTOR_FORMATTED_COMBINED_ACTION_DATA, expectedArray)
  })

  test('[V2] Should properly format TransactCommitment for missing unshield', () => {
    const inputData = TEST_VECTOR_COMBINED_ACTION_DATA

    // Remove unshield data
    if (inputData.transactions[0]?.actions[1]?.[0]) {
      (inputData.transactions[0].actions[1][0] as unknown as Transact).hasUnshield = false
    }

    const expectedArray = formatBlockData(inputData)
    const actualArray = TEST_VECTOR_FORMATTED_COMBINED_ACTION_DATA

    const transact = actualArray.transactions[0]?.actions[1]?.[0] as unknown as Transact
    // Remove corresponding value in output as well
    transact.hasUnshield = false
    delete transact.unshieldCommitment
    delete transact.unshieldToAddress
    delete transact.unshieldToken
    delete transact.unshieldValue

    assert.deepStrictEqual(actualArray, expectedArray)
  })
})
