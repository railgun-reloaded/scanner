import assert from 'assert'
import { describe, test } from 'node:test'

import type { Transact } from '../src/models/index.js'
import { formatBlockData } from '../src/sources/formatters/subsquid/blockdata-formatter.js'

import { TEST_VECTOR_ENCRYPTED_COMMITMENT, TEST_VECTOR_FORMATTED_ENCRYPTED_COMMITMENT, TEST_VECTOR_FORMATTED_GENERATED_COMMITMENT, TEST_VECTOR_GENERATED_COMMITMENT } from './test-vectors-v1.js'
import { TEST_VECTOR_COMBINED_ACTION_DATA, TEST_VECTOR_FORMATTED_COMBINED_ACTION_DATA, TEST_VECTOR_FORMATTED_SHIELD, TEST_VECTOR_SHIELD } from './test-vectors-v2.js'

describe('Formatter Test', () => {
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
