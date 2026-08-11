import assert from 'node:assert/strict'
import { test } from 'node:test'

import { flattenMemo } from '../src/sources/formatters/memo.js'

test('flattenMemo treats the 32-byte-zero sentinel as empty', () => {
  const sentinelHex = '0x' + '00'.repeat(32)
  const out = flattenMemo([sentinelHex])
  assert.equal(out.length, 0)
})

test('flattenMemo concatenates real memo entries verbatim', () => {
  const out = flattenMemo(['0x7a'])
  assert.equal(out.length, 1)
  assert.equal(out[0], 0x7a)
})

test('flattenMemo handles multiple real entries by concatenation', () => {
  const out = flattenMemo(['0xab', '0xcd'])
  assert.equal(out.length, 2)
  assert.equal(out[0], 0xab)
  assert.equal(out[1], 0xcd)
})

test('flattenMemo returns empty for an empty input array', () => {
  const out = flattenMemo([])
  assert.equal(out.length, 0)
})

test('flattenMemo does NOT treat two-entry [zeros, zeros] as a sentinel', () => {
  const zeros = '0x' + '00'.repeat(32)
  const out = flattenMemo([zeros, zeros])
  assert.equal(out.length, 64)
})
