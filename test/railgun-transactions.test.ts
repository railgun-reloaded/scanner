import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { EVMBlock, Transact } from '../src/models/index.js'
import {
  RailgunTxidVersion,
  extractRailgunTransactions
} from '../src/railgun-transactions.js'

import { TEST_VECTOR_ALL_ACTIONS, TEST_VECTOR_TRANSACT } from './railgun-transactions-vectors.js'

/**
 * Compare two byte arrays by byte content only.
 * @param a - First byte array.
 * @param b - Second byte array.
 * @returns True when byte content matches.
 */
function bytesEqual (a: Uint8Array, b: Uint8Array): boolean {
  return Buffer.from(a).equals(Buffer.from(b))
}

test('extractRailgunTransactions formats a complete Transact fixture', () => {
  const [row] = extractRailgunTransactions(TEST_VECTOR_TRANSACT)
  const tx = TEST_VECTOR_TRANSACT.transactions[0]!
  const transact = tx.actions[0]![0] as Transact

  assert.ok(row)
  assert.equal(row!.txidVersion, RailgunTxidVersion.V2)
  assert.ok(bytesEqual(row!.railgunTxid, transact.txID))
  assert.ok(bytesEqual(row!.chainTxid, tx.hash))
  assert.equal(row!.blockNumber, TEST_VECTOR_TRANSACT.number)
  assert.equal(row!.timestamp, TEST_VECTOR_TRANSACT.timestamp)
  assert.deepEqual(row!.nullifiers, transact.nullifiers)
  assert.deepEqual(
    row!.commitments,
    transact.commitments.map(c => c.hash)
  )
  assert.ok(bytesEqual(row!.boundParamsHash, transact.boundParamsHash))
  assert.equal(row!.hasUnshield, false)
  assert.equal(row!.unshield, null)
  assert.equal(row!.utxoTreeIn, transact.utxoTreeIn)
  assert.equal(row!.utxoTreeOut, transact.utxoTreeOut)
  assert.equal(row!.utxoBatchStartPositionOut, transact.utxoBatchStartPositionOut)
})

test('extractRailgunTransactions includes unshield metadata', () => {
  const [row] = extractRailgunTransactions(TEST_VECTOR_ALL_ACTIONS)
  const transact = TEST_VECTOR_ALL_ACTIONS.transactions[0]!.actions[1]![0] as Transact

  assert.ok(row)
  assert.equal(row!.hasUnshield, true)
  assert.deepEqual(row!.commitments, [])
  assert.deepEqual(row!.unshield, {
    to: transact.unshieldToAddress,
    token: transact.unshieldToken,
    value: transact.unshieldValue,
  })
})

test('extractRailgunTransactions skips incomplete RPC-style Transact data', () => {
  const tx = TEST_VECTOR_TRANSACT.transactions[0]!
  const transact = tx.actions[0]![0] as Transact
  const incompleteBlock: EVMBlock = {
    ...TEST_VECTOR_TRANSACT,
    transactions: [{
      ...tx,
      actions: [[{
        ...transact,
        boundParamsHash: new Uint8Array([0]),
      }]],
    }],
  }

  assert.deepEqual(extractRailgunTransactions(incompleteBlock), [])
})
