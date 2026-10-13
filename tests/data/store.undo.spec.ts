// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssetRecord } from '../../src/client/data/types.ts'
import { injectTransactionFailures } from './idb.ts'
import { installCanvasStub, installImageBitmapStub, installNodeBlob, makeFile, resetStats } from './utils.ts'

/**
 * store 的壁纸与「移出素材库（可撤销）」规格。
 *
 * 撤销的关键语义：记录**留在 `assets` store 里不动**，只是从视图隐藏 + 写一条
 * `meta.pendingDelete`；窗口到期或显式 `purgePendingDelete()` 才真删。因此撤销不需要重写字节，
 * 而进程在窗口内重启也必须能把撤销机会交还给用户（跨实例用例）。
 */

type StoreModule = typeof import('../../src/client/data/store.ts')
type DbModule = typeof import('../../src/client/data/db.ts')

/** 用例内创建的实例（含模块单例），afterEach 统一 dispose，避免订阅与定时器跨用例泄漏。 */
const created: Array<{ dispose: () => void }> = []

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
  tags: [],
  favorite: false,
  rating: 0,
  status: 'ok',
  importedAt: 1_700_000_000_000,
  lastCheckedAt: 1_700_000_000_000,
})

/** 全新模块 + 全新库 + 关闭自动初始化的实例。 */
async function fresh(): Promise<{
  mod: StoreModule
  db: DbModule
  store: ReturnType<StoreModule['createStore']>
}> {
  vi.resetModules()
  globalThis.indexedDB = new (await import('fake-indexeddb')).IDBFactory()
  const db = await import('../../src/client/data/db.ts')
  const mod = await import('../../src/client/data/store.ts')
  const store = mod.createStore({ autoInit: false })
  created.push(store, mod.store)
  return { mod, db, store }
}

beforeEach(async () => {
  await installNodeBlob()
  resetStats()
  installCanvasStub()
  installImageBitmapStub(400, 300)
})

afterEach(() => {
  for (const instance of created.splice(0)) instance.dispose()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('store：自定义壁纸', () => {
  it('设置后快照与设置键都更新，恢复默认后清空', async () => {
    const { db, store } = await fresh()
    await store.init()

    const file = makeFile('wall.webp', new Uint8Array([1, 2, 3, 4]), 'image/webp')
    await store.setWallpaper(file)

    expect(store.getSnapshot().wallpaper).toBeInstanceOf(Blob)
    expect(store.getSnapshot().wallpaper?.size).toBe(4)
    expect(store.getSnapshot().settings.wallpaperKey).toBe('current')
    expect(await db.getWallpaper()).toBeInstanceOf(Blob)

    await store.clearWallpaper()
    expect(store.getSnapshot().wallpaper).toBeUndefined()
    expect(store.getSnapshot().settings.wallpaperKey).toBeNull()
    expect(await db.getWallpaper()).toBeUndefined()
  })

  it('超过 20 MB 拒绝：可见报错并抛出', async () => {
    const { db, store } = await fresh()
    await store.init()
    const big = makeFile('huge.png', new Uint8Array([1]), 'image/png')
    Object.defineProperty(big, 'size', { configurable: true, value: 21 * 1024 * 1024 })

    await expect(store.setWallpaper(big)).rejects.toThrow(/上限 20\.0 MB/)
    expect(store.getSnapshot().error).toMatch(/壁纸图片过大/)
    expect(await db.getWallpaper()).toBeUndefined()
    expect(store.getSnapshot().settings.wallpaperKey).toBeNull()
  })

  it('非图片类型拒绝：可见报错并抛出', async () => {
    const { db, store } = await fresh()
    await store.init()
    const pdf = makeFile('doc.pdf', new Uint8Array([1]), 'application/pdf')

    await expect(store.setWallpaper(pdf)).rejects.toThrow(/必须是图片文件/)
    expect(store.getSnapshot().error).toMatch(/壁纸必须是图片文件/)
    expect(await db.getWallpaper()).toBeUndefined()
  })
})

describe('store：移出素材库与撤销', () => {
  it('移出后条目离开视图、写入待删除批次，撤销窗口约 8 秒', async () => {
    const { db, store } = await fresh()
    await db.putAsset(makeAsset('a1'))
    await db.putAsset(makeAsset('a2'))
    await store.init()

    const before = Date.now()
    await store.removeWithUndo(['a1'])

    expect(store.getSnapshot().assets.map(a => a.id)).toEqual(['a2'])
    const pending = store.getSnapshot().pendingUndo
    expect(pending?.ids).toEqual(['a1'])
    // 窗口按「调用时刻 + 8 秒」计算：以调用前的时间戳为基准，允许 100ms 的调度余量。
    const windowMs = (pending?.expiresAt ?? 0) - before
    expect(windowMs).toBeGreaterThanOrEqual(8000)
    expect(windowMs).toBeLessThanOrEqual(8100)

    // 记录仍在库里（真删被推迟），meta 里记着完整记录
    expect(await db.getAsset('a1')).toBeDefined()
    const stored = await db.readPendingDelete<{ ids: string[]; records: AssetRecord[] }>()
    expect(stored?.ids).toEqual(['a1'])
    expect(stored?.records[0]?.thumb).toBeInstanceOf(Blob)
  })

  it('窗口内撤销：条目回到视图、待删除批次清空、记录仍在库里', async () => {
    const { db, store } = await fresh()
    await db.putAsset(makeAsset('a1'))
    await store.init()

    await store.removeWithUndo(['a1'])
    expect(store.getSnapshot().assets).toHaveLength(0)

    await store.undoRemove()
    expect(store.getSnapshot().assets.map(a => a.id)).toEqual(['a1'])
    expect(store.getSnapshot().pendingUndo).toBeNull()
    expect(store.getSnapshot().error).toBeNull()
    expect(await db.readPendingDelete()).toBeUndefined()
    expect(await db.getAsset('a1')).toBeDefined()
  })

  it('显式 purge：真删并清空待删除批次', async () => {
    const { db, store } = await fresh()
    await db.putAsset(makeAsset('a1'))
    await store.init()

    await store.removeWithUndo(['a1'])
    await store.purgePendingDelete()

    expect(store.getSnapshot().pendingUndo).toBeNull()
    expect(await db.getAsset('a1')).toBeUndefined()
    expect(await db.readPendingDelete()).toBeUndefined()
  })

  it('连续两次移出合并成一个批次（第二批不覆盖第一批，避免幽灵条目永不删除）', async () => {
    const { db, store } = await fresh()
    await db.putAsset(makeAsset('a1'))
    await db.putAsset(makeAsset('a2'))
    await db.putAsset(makeAsset('a3'))
    await store.init()

    await store.removeWithUndo(['a1'])
    await store.removeWithUndo(['a2'])

    expect(store.getSnapshot().assets.map(a => a.id)).toEqual(['a3'])
    // 快照里的数组是冻结的：排序要先复制，不能原地 sort（那会抛只读属性错误）。
    expect([...(store.getSnapshot().pendingUndo?.ids ?? [])].sort()).toEqual(['a1', 'a2'])
    const stored = await db.readPendingDelete<{ ids: string[] }>()
    expect([...(stored?.ids ?? [])].sort()).toEqual(['a1', 'a2'])

    await store.undoRemove()
    expect(store.getSnapshot().assets.map(a => a.id).sort()).toEqual(['a1', 'a2', 'a3'])
  })

  it('为空的 ids 或全部不存在的 id 不产生批次', async () => {
    const { db, store } = await fresh()
    await store.init()
    await store.removeWithUndo([])
    await store.removeWithUndo(['missing'])
    expect(store.getSnapshot().pendingUndo).toBeNull()
    expect(await db.readPendingDelete()).toBeUndefined()
  })

  it('到期定时器回调触发真删（窗口结束后条目消失）', async () => {
    const realSetTimeout = globalThis.setTimeout
    const scheduled: Array<{ fn: () => void; ms: number }> = []
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((
      fn: () => void,
      ms?: number,
    ) => {
      if (ms === 8000) {
        scheduled.push({ fn, ms })
        return 0 as unknown as ReturnType<typeof setTimeout>
      }
      return realSetTimeout(fn, Math.min(ms ?? 0, 1))
    }) as unknown as typeof setTimeout)

    const { db, store } = await fresh()
    await db.putAsset(makeAsset('a1'))
    await store.init()
    await store.removeWithUndo(['a1'])

    expect(scheduled).toHaveLength(1)
    scheduled[0]?.fn()
    await new Promise(resolve => realSetTimeout(resolve, 30))

    expect(await db.getAsset('a1')).toBeUndefined()
    expect(await db.readPendingDelete()).toBeUndefined()
    expect(store.getSnapshot().pendingUndo).toBeNull()
  })

  it('真删失败时保留待删除清单并可见报错（不静默丢记录）', async () => {
    const { db, store } = await fresh()
    await db.putAsset(makeAsset('a1'))
    await store.init()
    await store.removeWithUndo(['a1'])

    const fault = injectTransactionFailures(99)
    try {
      await store.purgePendingDelete()
      expect(store.getSnapshot().error).toMatch(/移出素材库失败/)
      // 清单仍在：下一次 init / purge 会重试
      expect(await db.readPendingDelete()).toBeDefined()
      expect(await db.getAsset('a1')).toBeDefined()
    } finally {
      fault.restore()
    }
  })
})

/** 再建一个实例，模拟刷新/重启后的重新装配（同一进程、同一个库）。 */
async function reviveStore(autoInit = false): Promise<ReturnType<StoreModule['createStore']>> {
  const mod = await import('../../src/client/data/store.ts')
  const instance = mod.createStore({ autoInit })
  created.push(instance)
  return instance
}

describe('store：撤销窗口跨实例（刷新/重启）', () => {
  it('窗口未过：新实例隐藏条目但给出撤销机会，记录仍在库里', async () => {
    const { db, store } = await fresh()
    await db.putAsset(makeAsset('a1'))
    await store.init()
    await store.removeWithUndo(['a1'])

    const revived = await reviveStore()
    await revived.init()

    expect(revived.getSnapshot().assets).toHaveLength(0)
    const pending = revived.getSnapshot().pendingUndo
    expect(pending?.ids).toEqual(['a1'])
    expect(pending?.expiresAt ?? 0).toBeGreaterThan(Date.now())
    // 记录仍在库里 → 撤销是可行的
    expect(await db.getAsset('a1')).toBeDefined()

    await revived.undoRemove()
    expect(revived.getSnapshot().assets.map(a => a.id)).toEqual(['a1'])
    expect(await db.readPendingDelete()).toBeUndefined()
  })

  it('窗口已过：init 直接真删，不再给出撤销机会', async () => {
    const { db, store } = await fresh()
    await store.init()
    await db.putAsset(makeAsset('a1'))
    await db.writePendingDelete({
      ids: ['a1'],
      records: [makeAsset('a1')],
      expiresAt: Date.now() - 1,
    })

    const revived = await reviveStore()
    await revived.init()

    expect(revived.getSnapshot().assets).toHaveLength(0)
    expect(revived.getSnapshot().pendingUndo).toBeNull()
    expect(await db.getAsset('a1')).toBeUndefined()
    expect(await db.readPendingDelete()).toBeUndefined()
  })

  it('结构损坏的待删除记录不会卡住初始化（按"没有批次"处理）', async () => {
    const { db, store } = await fresh()
    await store.init()
    await db.putAsset(makeAsset('a1'))
    await db.writeMeta('pendingDelete', { ids: 'not-an-array' })

    const revived = await reviveStore()
    await revived.init()

    expect(revived.getSnapshot().loading).toBe(false)
    expect(revived.getSnapshot().assets.map(a => a.id)).toEqual(['a1'])
    expect(revived.getSnapshot().pendingUndo).toBeNull()
  })
})
