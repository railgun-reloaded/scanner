import fs from 'fs/promises'

import { test } from 'brittle'

import { SnapshotDB } from '../../../src/data-store/database'

const SNAP = './test.snap.gz'

test('set and get string values', async t => {
  const db = new SnapshotDB()
  await db.set('wallet/1/name', 'Bob')
  t.is(await db.get('wallet/1/name'), 'Bob')
})

test('delete works', async t => {
  const db = new SnapshotDB()
  await db.set('delete/me', 'bye')
  await db.del('delete/me')
  t.is(await db.get('delete/me'), null)
})

test('snapshot and restore', async t => {
  const db1 = new SnapshotDB()
  await db1.set('wallet/2/name', 'Alice')
  await db1.snapshotGzip(SNAP)

  const db2 = new SnapshotDB()
  await db2.restoreGzip(SNAP)
  t.is(await db2.get('wallet/2/name'), 'Alice')

  await fs.unlink(SNAP)
})

test('set and get object values', async t => {
  const db = new SnapshotDB()
  const userObject = { name: 'Bob', age: 30, roles: ['admin', 'user'] }
  await db.set('wallet/3/profile', userObject)
  const result = await db.get('wallet/3/profile')
  t.alike(result, userObject)
})

test('update object values', async t => {
  const db = new SnapshotDB()
  const initialObject = { count: 1, items: ['apple'] }
  await db.set('inventory', initialObject)

  const updatedObject = { count: 2, items: ['apple', 'orange'] }
  await db.set('inventory', updatedObject)

  const result = await db.get('inventory')
  t.alike(result, updatedObject)
  t.unlike(result, initialObject)
})
