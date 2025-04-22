import * as fs from 'fs'
import * as zlib from 'zlib'

import { decode, encode } from '@msgpack/msgpack'
import { MemoryLevel } from 'memory-level'

type Serializable = string | number | boolean | object | null

/**
 * SnapshotDB class
 */
export class SnapshotDB {
  /**
   * Database
   */
  private db = new MemoryLevel<string, Buffer>({ valueEncoding: 'buffer' })

  /**
   *  set key value
   * @param key - The key to set
   * @param value - The value to set
   */
  async set (key: string, value: Serializable) {
    const buf = Buffer.from(JSON.stringify(value))
    await this.db.put(key, buf)
  }

  /**
   * - Get value by key
   * @param key - The key to get
   * @returns - The value or null if not found
   */
  async get<T = Serializable>(key: string): Promise<T | null> {
    try {
      const buf = await this.db.get(key, { valueEncoding: 'json' })
      return buf as T ?? null
    } catch (err: any) {
      if (err.code === 'LEVEL_NOT_FOUND') return null
      throw err
    }
  }

  /**
   *  Delete key
   * @param key - The key to delete
   */
  async del (key: string) {
    await this.db.del(key)
  }

  /**
   * - Get all keys
   * @param filePath - The file path to save the snapshot
   */
  async snapshotGzip (filePath = 'snapshot.gz') {
    const out = fs.createWriteStream(filePath)
    const zip = zlib.createGzip()
    zip.pipe(out)

    for await (const [key, val] of this.db.iterator()) {
      const value = JSON.parse(val.toString())
      const entry = encode([key, value])

      const len = Buffer.alloc(4)
      len.writeUInt32BE(entry.length)
      zip.write(len)
      zip.write(entry)
    }

    zip.end()
  }

  /**
   * - Restore from snapshot
   * @param filePath - The file path to restore from
   */
  async restoreGzip (filePath = 'snapshot.gz') {
    const stream = fs.createReadStream(filePath).pipe(zlib.createGunzip())
    let buffer = Buffer.alloc(0)

    return new Promise<void>((resolve, reject) => {
      stream.on('data', async chunk => {
        buffer = Buffer.concat([buffer, chunk])

        while (buffer.length >= 4) {
          const len = buffer.readUInt32BE(0)
          if (buffer.length < 4 + len) break

          const payload = buffer.slice(4, 4 + len)
          const [key, value] = decode(payload) as [string, Serializable]

          await this.set(key, value)
          buffer = buffer.slice(4 + len)
        }
      })

      stream.on('end', () => resolve())
      stream.on('error', reject)
    })
  }
}
