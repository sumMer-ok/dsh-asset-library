import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { injectTransactionFailures } from './idb.ts'
import type { AssetRecord } from '../../src/client/data/types.ts'

/**
 * db.ts 的行为规格：建库/索引、单事务 ≤10 条、整批重放 3 次后退避失败、
 * 读失败校验、设置默认值与合并、错误带中文原因。
 *
 * 写失败注入：db.ts 内部引用的是模块内的 `openDb` 绑定，spy 导出的函数拦不住，
 * 因此用 `injectTransactionFailures` 直接打在 `IDBDatabase.prototype.transaction` 上。
 */

const makeAsset = (id: string, overrides: Partial<AssetRecord> = {}): AssetRecord => ({
  id,
  path: `/tmp/${id}.png`,
  name: `${id}.png`,
  ext: 'png',
  kind: 'image',
  mediaType: 'image/png',
  size: 1024,
  width: 800,
  height: 600,
  hash: `hash-${id}`,
  cheap: `cheap-${id}`,
  thumb: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' }),
  thumbWidth: 512,
  thumbHeight: 384,
  dominantColor: '#3366ff',
  tags: ['png', 'image'],
  favorite: false,
  rating: 0,
  status: 'ok',
  importedAt: 1_700_000_000_000,
  lastCheckedAt: 1_700_000_000_000,
  ...overrides,
})

/** 每个用例重建模块，拿到全新的连接缓存与库。 */
async function loadDb(): Promise<typeof import('../../src/client/data/db.ts')> {
  vi.resetModules()
  globalThis.indexedDB = new (await import('fake-indexeddb')).IDBFactory()
  return import('../../src/client/data/db.ts')
}

describe('db：建库与索引', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('创建 dsh-asset-library v2 的三个 store 与全部索引', async () => {
    const db = await loadDb()
    const conn = await db.openDb()
    expect(conn.name).toBe('dsh-asset-library')
    expect(conn.version).toBe(2)
    expect([...conn.objectStoreNames].sort()).toEqual(['assets', 'meta', 'wallpaper'])
    const tx = conn.transaction('assets', 'readonly')
    expect([...tx.objectStore('assets').indexNames].sort()).toEqual([
      'cheap',
      'favorite',
      'hash',
      'importedAt',
      'kind',
      'tags',
    ])
    expect(tx.objectStore('assets').index('tags').multiEntry).toBe(true)
    expect(conn.transaction('meta', 'readonly').objectStore('meta').keyPath).toBe('key')
    expect(conn.transaction('wallpaper', 'readonly').objectStore('wallpaper').keyPath).toBe('key')
  })

  it('putAsset / getAsset 往返保留 thumb Blob 与元数据', async () => {
    const db = await loadDb()
    await db.putAsset(makeAsset('a1'))
    const got = await db.getAsset('a1')
    expect(got?.name).toBe('a1.png')
    expect(got?.thumb).toBeInstanceOf(Blob)
    expect(got?.thumb.size).toBe(3)
    expect(got?.thumb.type).toBe('image/webp')
  })

  it('findByHash 命中同哈希，deleteAssets 后消失', async () => {
    const db = await loadDb()
    await db.putAssets([makeAsset('a1', { hash: 'same' }), makeAsset('a2', { hash: 'same' }), makeAsset('a3', { hash: 'other' })])
    expect((await db.findByHash('same')).map(a => a.id).sort()).toEqual(['a1', 'a2'])
    await db.deleteAssets(['a1', 'a2'])
    expect(await db.getAllAssets()).toHaveLength(1)
  })

  it('patchAsset 只覆盖给出的字段', async () => {
    const db = await loadDb()
    await db.putAsset(makeAsset('a1'))
    await db.patchAsset('a1', { favorite: true, tags: ['x'] })
    const got = await db.getAsset('a1')
    expect(got?.favorite).toBe(true)
    expect(got?.tags).toEqual(['x'])
    expect(got?.name).toBe('a1.png')
  })

  it('patchAsset 对不存在的 id 抛中文原因', async () => {
    const db = await loadDb()
    await expect(db.patchAsset('nope', { favorite: true })).rejects.toThrow(/不存在/)
  })

  it('putAsset 写入前校验缩略图非法（空 Blob）并抛中文原因', async () => {
    const db = await loadDb()
    await expect(db.putAsset(makeAsset('z1', { thumb: new Blob([], { type: 'image/webp' }) }))).rejects.toThrow(
      /缩略图已损坏/,
    )
    expect(await db.getAsset('z1')).toBeUndefined()
  })
})

describe('db：单事务 ≤10 条', () => {
  it('putAssets(23) 切分为 3 个事务', async () => {
    const db = await loadDb()
    const conn = await db.openDb()
    const spy = vi.spyOn(conn, 'transaction')
    const list = Array.from({ length: 23 }, (_, i) => makeAsset(`m${i}`))
    await db.putAssets(list)
    const writeTx = spy.mock.calls.filter(call => call[1] === 'readwrite')
    expect(writeTx).toHaveLength(3)
    expect(await db.getAllAssets()).toHaveLength(23)
  })

  it('putAssets(20) 正好 2 个事务（每批不超过 10）', async () => {
    const db = await loadDb()
    const conn = await db.openDb()
    const spy = vi.spyOn(conn, 'transaction')
    await db.putAssets(Array.from({ length: 20 }, (_, i) => makeAsset(`n${i}`)))
    expect(spy.mock.calls.filter(call => call[1] === 'readwrite')).toHaveLength(2)
  })
})

describe('db：写失败整批重放', () => {
  let fault: ReturnType<typeof injectTransactionFailures> | undefined
  afterEach(() => {
    fault?.restore()
    fault = undefined
  })

  it('一批失败后整批重放：≤10 条的一批会在第 4 次尝试成功，重放 3 次', async () => {
    const db = await loadDb()
    await db.openDb()
    fault = injectTransactionFailures(3)
    const delays: number[] = []
    const realSetTimeout = globalThis.setTimeout
    const spy = vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: () => void, ms?: number) => {
      delays.push(ms ?? 0)
      return realSetTimeout(fn, 0)
    }) as unknown as typeof setTimeout)
    await db.putAssets([makeAsset('r1'), makeAsset('r2')])
    spy.mockRestore()
    // 事务调用共 4 次：3 次失败 + 第 4 次真实提交
    expect(fault.failures()).toBe(3)
    expect(fault.calls()).toBe(4)
    expect(delays).toEqual([100, 300, 900])
    expect((await db.getAllAssets()).map(a => a.id).sort()).toEqual(['r1', 'r2'])
  })

  it('重放 3 次仍失败 → 抛错并列出未入库条目（12 条切 10+2，两批都失败）', async () => {
    const db = await loadDb()
    await db.openDb()
    fault = injectTransactionFailures(99)
    await expect(db.putAssets(Array.from({ length: 12 }, (_, i) => makeAsset(`x${i}`)))).rejects.toThrow(
      /写入失败（已重放 3 次）：12\/12 条未入库/,
    )
    // 两批各 4 次尝试（3 次重放）全部失败
    expect(fault.failures()).toBe(8)
    expect(fault.calls()).toBe(8)
    const failed = fault
    failed.restore()
    fault = undefined
    // 失败批不留部分写入：0 条入库
    expect(await db.getAllAssets()).toHaveLength(0)
  })

  it('永不成功的写事务：重放 3 次后抛错且不静默', async () => {
    const db = await loadDb()
    await db.openDb()
    fault = injectTransactionFailures(99)
    await expect(db.putAsset(makeAsset('f1'))).rejects.toThrow(/已重放 3 次/)
    // 3 次重放（共 4 次尝试）后放弃
    const calls = fault.calls()
    const failures = fault.failures()
    fault.restore()
    fault = undefined
    expect(failures).toBe(4)
    expect(calls).toBe(4)
    expect(await db.getAsset('f1')).toBeUndefined()
  })

  it('批量中某批失败时抛错，但不产生部分写入', async () => {
    const db = await loadDb()
    await db.openDb()
    fault = injectTransactionFailures(99)
    await expect(db.putAssets(Array.from({ length: 12 }, (_, i) => makeAsset(`b${i}`)))).rejects.toThrow(/重放/)
    expect(fault.failures()).toBe(8)
    const failed = fault
    failed.restore()
    fault = undefined
    expect(await db.getAllAssets()).toHaveLength(0)
  })
})

describe('db：读失败校验（缩略图损坏）', () => {
  it('getAllAssets 排除损坏条目并触发 onThumbError', async () => {
    const db = await loadDb()
    const conn = await db.openDb()
    const { rawPut } = await import('./idb.ts')
    await db.putAsset(makeAsset('good'))
    await rawPut(conn, 'assets', { ...makeAsset('bad'), thumb: 'not-a-blob' })
    const seen: string[] = []
    const off = db.onThumbError((record, message) => {
      seen.push(`${record.id}:${message}`)
    })
    const all = await db.getAllAssets()
    off()
    expect(all.map(a => a.id)).toEqual(['good'])
    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatch(/^bad:.*缩略图已损坏/)
  })

  it('getAsset 对损坏缩略图抛中文原因', async () => {
    const db = await loadDb()
    const conn = await db.openDb()
    const { rawPut } = await import('./idb.ts')
    await rawPut(conn, 'assets', { ...makeAsset('bad2'), thumb: new Blob([], { type: 'image/webp' }) })
    await expect(db.getAsset('bad2')).rejects.toThrow(/缩略图已损坏/)
  })
})

describe('db：设置', () => {
  it('readSettings 无记录时返回全部默认值', async () => {
    const db = await loadDb()
    expect(await db.readSettings()).toEqual({
      thumbMaxEdge: 512,
      thumbQuality: 0.85,
      maxImportBytes: 2 * 1024 * 1024 * 1024,
      routeMaxBytes: 64 * 1024 * 1024,
      videoSeekRatio: 0.1,
      videoTimeoutMs: 4000,
      wallpaperKey: null,
      wallpaperMask: 35,
      curationOpen: false,
    })
  })

  it('writeSettings 与 meta.settings 合并且只改给出项', async () => {
    const db = await loadDb()
    await db.writeMeta('settings', { thumbMaxEdge: 256, videoTimeoutMs: 8000 })
    const merged = await db.readSettings()
    expect(merged.thumbMaxEdge).toBe(256)
    expect(merged.videoTimeoutMs).toBe(8000)
    expect(merged.thumbQuality).toBe(0.85)
    expect(merged.routeMaxBytes).toBe(64 * 1024 * 1024)
    const after = await db.writeSettings({ thumbQuality: 0.5 })
    expect(after.thumbQuality).toBe(0.5)
    expect(after.thumbMaxEdge).toBe(256)
    expect(await db.readMeta<{ thumbQuality: number }>('settings')).toMatchObject({ thumbQuality: 0.5 })
  })

  it('非法设置值回退默认（类型不对不写入）', async () => {
    const db = await loadDb()
    await db.writeMeta('settings', { thumbMaxEdge: 'big', videoSeekRatio: Number.NaN })
    const merged = await db.readSettings()
    expect(merged.thumbMaxEdge).toBe(512)
    expect(merged.videoSeekRatio).toBe(0.1)
  })

  it('readMeta 读不存在的键返回 undefined', async () => {
    const db = await loadDb()
    expect(await db.readMeta('nope')).toBeUndefined()
  })
})

describe('db：连接缓存', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('openDb 复用同一连接，closeDb 后可重开', async () => {
    const db = await loadDb()
    const a = await db.openDb()
    const b = await db.openDb()
    expect(a).toBe(b)
    db.closeDb()
    // 新建库后重开不应复用旧连接
    const c = await db.openDb()
    expect(c).toBeDefined()
  })
})
