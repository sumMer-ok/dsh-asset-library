import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { rawGet, rawPut } from './idb.ts'
import type { AssetRecord } from '../../src/client/data/types.ts'

/**
 * 数据库升级安全 + 壁纸存储 + 待删除批次的 meta 包装。
 *
 * 升级安全是本文件的重点：v2 只新增 `wallpaper` store，老库（v1：assets + meta）里的
 * 素材、索引与设置必须原地保留——用**手工建出来的 v1 库**验证，而不是"看代码应该没问题"。
 */

const DB_NAME = 'dsh-asset-library'

const makeAsset = (id: string): AssetRecord => ({
  id,
  path: `/tmp/${id}.png`,
  name: `${id}.png`,
  ext: 'png',
  kind: 'image',
  mediaType: 'image/png',
  size: 1024,
  hash: `hash-${id}`,
  cheap: `cheap-${id}`,
  thumb: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' }),
  thumbWidth: 512,
  thumbHeight: 384,
  dominantColor: '#3366ff',
  tags: ['png'],
  favorite: false,
  rating: 0,
  status: 'ok',
  importedAt: 1_700_000_000_000,
  lastCheckedAt: 1_700_000_000_000,
})

/** 手工建一个 v1 库（老版本只有 assets + meta 与六个索引），写入素材、schem 版本与一条设置。 */
async function seedVersion1Db(factory: IDBFactory): Promise<void> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = factory.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const conn = req.result
      const assets = conn.createObjectStore('assets', { keyPath: 'id' })
      for (const index of ['kind', 'importedAt', 'hash', 'cheap', 'favorite']) {
        assets.createIndex(index, index, { unique: false })
      }
      assets.createIndex('tags', 'tags', { unique: false, multiEntry: true })
      conn.createObjectStore('meta', { keyPath: 'key' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('建 v1 库失败'))
  })
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['assets', 'meta'], 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('写入 v1 数据失败'))
    tx.objectStore('assets').put(makeAsset('old1'))
    tx.objectStore('assets').put(makeAsset('old2'))
    tx.objectStore('meta').put({ key: 'schemaVersion', value: 1 })
    tx.objectStore('meta').put({ key: 'settings', value: { thumbMaxEdge: 256 } })
  })
  db.close()
}

/** 用给定工厂加载一份全新的 db.ts 模块。 */
async function loadDb(factory?: IDBFactory): Promise<typeof import('../../src/client/data/db.ts')> {
  vi.resetModules()
  globalThis.indexedDB = factory ?? new IDBFactory()
  return import('../../src/client/data/db.ts')
}

describe('db：v1 → v2 升级安全', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('老库升级后版本为 2、新增 wallpaper store，且素材/索引/设置原地保留', async () => {
    const factory = new IDBFactory()
    await seedVersion1Db(factory)
    const db = await loadDb(factory)

    const conn = await db.openDb()
    expect(conn.version).toBe(2)
    expect([...conn.objectStoreNames].sort()).toEqual(['assets', 'meta', 'wallpaper'])
    // 老索引仍在（去重与筛选不能因为升级而失效）
    const indexNames = [...conn.transaction('assets', 'readonly').objectStore('assets').indexNames].sort()
    expect(indexNames).toEqual(['cheap', 'favorite', 'hash', 'importedAt', 'kind', 'tags'])
    // 老数据原地保留
    expect((await db.getAllAssets()).map(a => a.id).sort()).toEqual(['old1', 'old2'])
    expect((await db.getAsset('old1'))?.thumb).toBeInstanceOf(Blob)
    // 老设置保留，新字段补默认
    const settings = await db.readSettings()
    expect(settings.thumbMaxEdge).toBe(256)
    expect(settings.wallpaperKey).toBeNull()
    expect(settings.wallpaperMask).toBe(35)
    expect(settings.curationOpen).toBe(false)
    // 升级后去重索引仍可用
    expect((await db.findByHash('hash-old1')).map(a => a.id)).toEqual(['old1'])
  })
})

describe('db：壁纸存储', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('putWallpaper / getWallpaper 往返，clearWallpaper 后读回 undefined', async () => {
    const db = await loadDb()
    const blob = new Blob([new Uint8Array([9, 8, 7, 6])], { type: 'image/webp' })

    expect(await db.getWallpaper()).toBeUndefined()

    await db.putWallpaper(blob, { name: 'wall.webp', type: 'image/webp', bytes: blob.size })
    const stored = await db.getWallpaper()
    expect(stored).toBeInstanceOf(Blob)
    expect(stored?.size).toBe(4)
    expect(stored?.type).toBe('image/webp')

    // 覆盖式写入：仍然只有一条
    await db.putWallpaper(new Blob([new Uint8Array([1])], { type: 'image/png' }), {
      name: 'second.png',
      type: 'image/png',
      bytes: 1,
    })
    expect((await db.getWallpaper())?.size).toBe(1)

    await db.clearWallpaper()
    expect(await db.getWallpaper()).toBeUndefined()
    // 再清一次也是成功（幂等）
    await expect(db.clearWallpaper()).resolves.toBeUndefined()
  })

  it('拒绝空 Blob', async () => {
    const db = await loadDb()
    await expect(
      db.putWallpaper(new Blob([], { type: 'image/webp' }), { name: 'empty.webp', type: 'image/webp', bytes: 0 }),
    ).rejects.toThrow(/内容为空/)
  })

  it('已存壁纸损坏时报中文原因，而不是静默当成"没有壁纸"', async () => {
    const db = await loadDb()
    const conn = await db.openDb()
    await rawPut(conn, 'wallpaper', { key: 'current', blob: 'not-a-blob' })
    await expect(db.getWallpaper()).rejects.toThrow(/壁纸已损坏/)
  })
})

describe('db：待删除批次（meta.pendingDelete）', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('写入/读回/清空往返，原样保留记录数组与到期时间', async () => {
    const db = await loadDb()
    expect(await db.readPendingDelete()).toBeUndefined()

    const payload = {
      ids: ['a1'],
      records: [{ ...makeAsset('a1'), thumb: new Blob([new Uint8Array([1, 2])], { type: 'image/webp' }) }],
      expiresAt: 1_700_000_008_000,
    }
    await db.writePendingDelete(payload)

    const read = await db.readPendingDelete<typeof payload>()
    expect(read?.ids).toEqual(['a1'])
    expect(read?.expiresAt).toBe(1_700_000_008_000)
    expect(read?.records[0]?.thumb).toBeInstanceOf(Blob)
    expect(read?.records[0]?.thumb.size).toBe(2)

    await db.clearPendingDelete()
    expect(await db.readPendingDelete()).toBeUndefined()
  })

  it('清空后 meta 里不再有这个键', async () => {
    const db = await loadDb()
    await db.writePendingDelete({ ids: [], records: [], expiresAt: 0 })
    const conn = await db.openDb()
    await db.clearPendingDelete()
    expect(await rawGet(conn, 'meta', 'pendingDelete')).toBeUndefined()
  })
})
