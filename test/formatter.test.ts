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

  test('[V2] Should properly format ShieldCommitment', () => {
    const expectedArray = formatBlockData(TEST_VECTOR_SHIELD)
    assert.deepStrictEqual(TEST_VECTOR_FORMATTED_SHIELD, expectedArray)
  })

  test('[V2] Should properly format TransactCommitment', () => {
    const expectedArray = formatBlockData(TEST_VECTOR_COMBINED_ACTION_DATA)
    assert.deepStrictEqual(TEST_VECTOR_FORMATTED_COMBINED_ACTION_DATA, expectedArray)
  })

  test('[V2] Should properly format TransactCommitment for missing unshield', () => {
    const inputData = structuredClone(TEST_VECTOR_COMBINED_ACTION_DATA)

    if (inputData.transactions[0]?.actions[1]?.[0]) {
      (inputData.transactions[0].actions[1][0] as unknown as Transact).hasUnshield = false
    }

    const output = formatBlockData(inputData)
    const transact = output.transactions[0]?.actions[1]?.[0] as Transact

    assert.equal(transact.hasUnshield, false)
    assert.equal('unshieldCommitment' in transact, false)
    assert.equal('unshieldToAddress' in transact, false)
    assert.equal('unshieldToken' in transact, false)
    assert.equal('unshieldValue' in transact, false)
  })
})
