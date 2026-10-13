// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssetRecord, ImportEvent } from '../../src/client/data/types.ts'
import { injectTransactionFailures, rawPut } from './idb.ts'
import { installCanvasStub, installImageBitmapStub, installNodeBlob, makeFile, resetStats } from './utils.ts'

/**
 * store.ts 的行为规格：逐文件状态机、重复处理、写失败整批重放后标 failed、
 * 读失败校验、recheck、以及快照不可变与订阅。
 */

type StoreModule = typeof import('../../src/client/data/store.ts')

/** 本用例创建过的实例，afterEach 统一 dispose（避免订阅跨用例累加）。 */
const created: Array<ReturnType<StoreModule['createStore']>> = []

/** 每个用例全新的模块 + 全新的 IndexedDB。 */
async function freshStore(autoInit = false): Promise<{
  mod: StoreModule
  store: ReturnType<StoreModule['createStore']>
}> {
  vi.resetModules()
  globalThis.indexedDB = new (await import('fake-indexeddb')).IDBFactory()
  const mod = await import('../../src/client/data/store.ts')
  const store = mod.createStore({ autoInit })
  // 模块级 `store` 单例也会注册订阅；一并交由 afterEach dispose，避免跨用例累加。
  created.push(store, mod.store)
  return { mod, store }
}

/** 记录每次快照变化时的导入事件，用于断言状态机推进。 */
function trackImports(store: { getSnapshot: () => { imports: ImportEvent[] }; subscribe: (l: () => void) => () => void }): {
  phases: string[][]
  stop: () => void
} {
  const phases: string[][] = []
  const record = (): void => {
    phases.push(store.getSnapshot().imports.map(e => e.phase))
  }
  // `importFiles` 会先写入 queued 快照；订阅前先记录一次当前快照会漏掉它，
  // 因此记录函数同时被调用方在导入前手动调一次。
  const off = store.subscribe(record)
  return { phases, stop: off }
}

beforeEach(async () => {
  await installNodeBlob()
  resetStats()
  installCanvasStub()
  installImageBitmapStub(400, 300)
})

afterEach(() => {
  // 模块级 store 单例与用例内实例都释放订阅；否则同一模块注册表里的
  // thumb-error 订阅会跨用例累加，让同一损坏记录被重复上报。
  for (const store of created.splice(0)) store.dispose()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('store：导入正常路径', () => {
  it('单个图片文件走完 queued→hashing→thumb→writing→done 并入库', async () => {
    const { store } = await freshStore()
    await store.init()
    const onDuplicate = vi.fn(async () => 'skip' as const)
    const tracker = trackImports(store)
    const importing = store.importFiles([makeFile('photo.png', new Uint8Array([1, 2, 3]), 'image/png')], onDuplicate)
    // queued 快照在 importFiles 同步前缀里写入，订阅回调由 microtask 投递；
    // 让出一轮 microtask 后才能观察到它。
    await Promise.resolve()
    await importing
    tracker.stop()

    expect(onDuplicate).not.toHaveBeenCalled()
    const state = store.getSnapshot()
    expect(state.importRunning).toBe(false)
    expect(state.assets).toHaveLength(1)
    const asset = state.assets[0] as AssetRecord
    expect(asset.name).toBe('photo.png')
    expect(asset.ext).toBe('png')
    expect(asset.kind).toBe('image')
    expect(asset.thumb).toBeInstanceOf(Blob)
    expect(asset.thumb.type).toBe('image/webp')
    expect(asset.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(asset.cheap.startsWith('3-')).toBe(true)
    expect(asset.status).toBe('ok')

    const seen = new Set(tracker.phases.flat())
    expect(seen.has('queued')).toBe(true)
    expect(seen.has('hashing')).toBe(true)
    expect(seen.has('thumb')).toBe(true)
    expect(seen.has('writing')).toBe(true)
    expect(seen.has('done')).toBe(true)
    // 最终事件阶段是 done
    expect(state.imports[state.imports.length - 1]?.phase).toBe('done')
  })

  it('文档类型走封面卡路径并在 filter 里按 kind 命中', async () => {
    const { store } = await freshStore()
    await store.init()
    await store.importFiles([makeFile('报告.pdf', new Uint8Array([9, 9]), 'application/pdf')], async () => 'skip')
    const asset = store.getSnapshot().assets[0] as AssetRecord
    expect(asset.kind).toBe('document')
    expect(asset.mediaType).toBe('application/pdf')
    expect(asset.tags).toEqual([]) // store 不做自动打标，交给 UI 决定
    store.setQuery({ kinds: ['document'] })
    expect(store.getSnapshot().filtered.map(a => a.id)).toEqual([asset.id])
  })

  it('混合批次：单个文件失败不中断整批', async () => {
    const { store } = await freshStore()
    await store.init()
    Object.defineProperty(globalThis, 'createImageBitmap', {
      configurable: true,
      writable: true,
      value: vi.fn(async (blob: Blob) => {
        if (blob.type === 'image/png') throw new Error('坏图')
        return { width: 10, height: 10, close: vi.fn() } as unknown as ImageBitmap
      }),
    })
    const files = [
      makeFile('a.png', new Uint8Array([1]), 'image/png'),
      makeFile('b.txt', new Uint8Array([2]), 'text/plain'),
      makeFile('c.png', new Uint8Array([3]), 'image/png'),
    ]
    await store.importFiles(files, async () => 'skip')
    const state = store.getSnapshot()
    // 图片解码失败走封面卡兜底，因此三条都成功入库
    expect(state.assets).toHaveLength(3)
    expect(state.imports.every(e => e.phase === 'done' || e.error !== undefined)).toBe(true)
  })

  it('空数组直接返回且不进入 importRunning', async () => {
    const { store } = await freshStore()
    await store.init()
    await store.importFiles([], async () => 'skip')
    expect(store.getSnapshot().importRunning).toBe(false)
    expect(store.getSnapshot().imports).toEqual([])
  })
})

describe('store：路径解析器', () => {
  it('注入解析器后 asset.path 使用宿主真实路径', async () => {
    const { mod, store } = await freshStore()
    await store.init()
    mod.setPathResolver(() => '/Users/me/Pictures/photo.png')
    await store.importFiles([makeFile('photo.png', new Uint8Array([1]), 'image/png')], async () => 'skip')
    expect((store.getSnapshot().assets[0] as AssetRecord).path).toBe('/Users/me/Pictures/photo.png')
  })

  it('取不到路径时给出可见告警（不静默降级）', async () => {
    const { mod, store } = await freshStore()
    await store.init()
    mod.setPathResolver(() => undefined)
    await store.importFiles([makeFile('noPath.png', new Uint8Array([1]), 'image/png')], async () => 'skip')
    const warnings = store.getSnapshot().imports.filter(e => e.error?.includes('取不到磁盘真实路径'))
    expect(warnings.length).toBeGreaterThanOrEqual(1)
  })

  it('未注入解析器时以文件名兜底', async () => {
    const { store } = await freshStore()
    await store.init()
    await store.importFiles([makeFile('bare.png', new Uint8Array([1]), 'image/png')], async () => 'skip')
    expect((store.getSnapshot().assets[0] as AssetRecord).path).toBe('bare.png')
  })
})

describe('store：重复识别', () => {
  it('重复时阶段到 duplicate，用户选 skip 不入库', async () => {
    const { store } = await freshStore()
    await store.init()
    const bytes = new Uint8Array([7, 7, 7])
    await store.importFiles([makeFile('dup.png', bytes, 'image/png')], async () => 'skip')
    const onDuplicate = vi.fn(async () => 'skip' as const)
    const tracker = trackImports(store)
    await store.importFiles([makeFile('dup.png', bytes, 'image/png')], onDuplicate)
    tracker.stop()
    expect(onDuplicate).toHaveBeenCalledTimes(1)
    const duplicateArgs = onDuplicate.mock.calls[0] as unknown as [AssetRecord, File]
    expect(duplicateArgs[0]).toMatchObject({ name: 'dup.png' })
    expect(tracker.phases.flat()).toContain('duplicate')
    const state = store.getSnapshot()
    expect(state.assets).toHaveLength(1)
    expect(state.imports[state.imports.length - 1]?.phase).toBe('done')
  })

  it('用户选 keep → 保留两份（id 不同、hash 相同）', async () => {
    const { store } = await freshStore()
    await store.init()
    const bytes = new Uint8Array([8, 8, 8])
    await store.importFiles([makeFile('dup.png', bytes, 'image/png')], async () => 'skip')
    await store.importFiles([makeFile('dup.png', bytes, 'image/png')], async () => 'keep')
    const state = store.getSnapshot()
    expect(state.assets).toHaveLength(2)
    const [a, b] = state.assets
    expect(a?.id).not.toBe(b?.id)
    expect(a?.hash).toBe(b?.hash)
  })

  it('用户选 replace → 旧记录被删除，只留新的', async () => {
    const { store } = await freshStore()
    await store.init()
    const bytes = new Uint8Array([6, 6, 6])
    await store.importFiles([makeFile('dup.png', bytes, 'image/png')], async () => 'skip')
    const oldId = (store.getSnapshot().assets[0] as AssetRecord).id
    await store.importFiles([makeFile('dup.png', bytes, 'image/png')], async () => 'replace')
    const state = store.getSnapshot()
    expect(state.assets).toHaveLength(1)
    expect((state.assets[0] as AssetRecord).id).not.toBe(oldId)
  })

  it('内容不同的同名文件不算重复', async () => {
    const { store } = await freshStore()
    await store.init()
    const onDuplicate = vi.fn(async () => 'skip' as const)
    await store.importFiles([makeFile('same.png', new Uint8Array([1]), 'image/png')], onDuplicate)
    await store.importFiles([makeFile('same.png', new Uint8Array([2]), 'image/png')], onDuplicate)
    expect(onDuplicate).not.toHaveBeenCalled()
    expect(store.getSnapshot().assets).toHaveLength(2)
  })
})

describe('store：写失败整批重放 → failed', () => {
  let fault: ReturnType<typeof injectTransactionFailures> | undefined
  afterEach(() => {
    fault?.restore()
    fault = undefined
  })

  it('写事务连续失败时该文件标 failed 且带中文原因', async () => {
    const { store } = await freshStore()
    await store.init()
    // 单文件只需 1 个事务：3 次重放（共 4 次尝试）全部失败才会标 failed
    fault = injectTransactionFailures(4)
    await store.importFiles([makeFile('fail.png', new Uint8Array([5]), 'image/png')], async () => 'skip')
    const state = store.getSnapshot()
    expect(state.assets).toHaveLength(0)
    const last = state.imports[state.imports.length - 1] as ImportEvent
    expect(last.phase).toBe('failed')
    expect(last.error).toMatch(/已重放 3 次|写入失败/)
    expect(state.importRunning).toBe(false)
  })

  it('一批内 8 次写失败：两个文件各自落 failed，批处理照常收尾（不中断）', async () => {
    const { store } = await freshStore()
    await store.init()
    // 并发上限 2 共享注入计数器，各文件抢占重放次数，因此不假设「恰好一个失败」。
    // 8 次注入足以让两个文件的整批重放都耗尽（每个文件最多 4 次尝试），
    // 用来验证：单文件失败不会中断整批，且批处理一定收尾、不抛。
    fault = injectTransactionFailures(8)
    await store.importFiles(
      [makeFile('x1.png', new Uint8Array([11]), 'image/png'), makeFile('x2.png', new Uint8Array([12]), 'image/png')],
      async () => 'skip',
    )
    const state = store.getSnapshot()
    const done = state.imports.filter(e => e.phase === 'done').map(e => e.name)
    const failed = state.imports.filter(e => e.phase === 'failed').map(e => e.name)
    // 两个文件都到达终态、都标 failed、都带中文原因
    expect(failed.sort()).toEqual(['x1.png', 'x2.png'])
    expect(done).toEqual([])
    const reasons = state.imports.filter(e => e.phase === 'failed').map(e => e.error ?? '')
    for (const reason of reasons) expect(reason).toMatch(/已重放 3 次|写入失败/)
    // 失败文件不入库；批处理收尾；没有逃逸的批次级错误
    expect(state.assets).toHaveLength(0)
    expect(state.importRunning).toBe(false)
    expect(state.imports.some(e => e.name === '导入批处理')).toBe(false)
  })
})

describe('store：读失败校验（缩略图损坏）', () => {
  it('init 时损坏条目被剔除并在进度区可见报错', async () => {
    const { store } = await freshStore()
    const db = await import('../../src/client/data/db.ts')
    const conn = await db.openDb()
    await db.putAsset({
      id: 'ok1',
      path: '/tmp/ok1.png',
      name: 'ok1.png',
      ext: 'png',
      kind: 'image',
      mediaType: 'image/png',
      size: 1,
      hash: 'h1',
      cheap: 'c1',
      thumb: new Blob([new Uint8Array([1])], { type: 'image/webp' }),
      thumbWidth: 1,
      thumbHeight: 1,
      dominantColor: '#000000',
      tags: [],
      favorite: false,
      rating: 0,
      status: 'ok',
      importedAt: 1,
      lastCheckedAt: 1,
    } satisfies AssetRecord)
    await rawPut(conn, 'assets', {
      id: 'bad1',
      path: '/tmp/bad1.png',
      name: 'bad1.png',
      ext: 'png',
      kind: 'image',
      mediaType: 'image/png',
      size: 1,
      hash: 'h2',
      cheap: 'c2',
      thumb: 'not-a-blob',
      thumbWidth: 1,
      thumbHeight: 1,
      dominantColor: '#000000',
      tags: [],
      favorite: false,
      rating: 0,
      status: 'ok',
      importedAt: 2,
      lastCheckedAt: 2,
    })
    await store.init()
    const state = store.getSnapshot()
    expect(state.assets.map(a => a.id)).toEqual(['ok1'])
    const broken = state.imports.filter(e => e.error?.includes('缩略图损坏'))
    // 该损坏记录必须被可见上报（条数取决于同模块注册表内还活着的实例，故断言非空）
    expect(broken.length).toBeGreaterThanOrEqual(1)
    expect(new Set(broken.map(e => e.name))).toEqual(new Set(['bad1.png']))
    for (const event of broken) expect(event.phase).toBe('failed')
  })
})

describe('store：recheck', () => {
  it('200/206 → ok，404/403 → missing，写回 lastCheckedAt', async () => {
    const { store } = await freshStore()
    await store.init()
    await store.importFiles(
      [
        makeFile('a.png', new Uint8Array([1]), 'image/png'),
        makeFile('b.png', new Uint8Array([2]), 'image/png'),
      ],
      async () => 'skip',
    )
    const [a, b] = store.getSnapshot().assets as [AssetRecord, AssetRecord]
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      void init
      const target = decodeURIComponent(url)
      if (target.includes(a.path)) return new Response(null, { status: 200 })
      return new Response(null, { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)
    const before = a.lastCheckedAt
    await new Promise(r => setTimeout(r, 2))
    await store.recheck([a.id, b.id])

    const after = store.getSnapshot().assets as [AssetRecord, AssetRecord]
    expect(after.find(x => x.id === a.id)?.status).toBe('ok')
    expect(after.find(x => x.id === b.id)?.status).toBe('missing')
    expect(after.find(x => x.id === a.id)?.lastCheckedAt).toBeGreaterThanOrEqual(before)
    // HEAD 且 URL 带编码后的路径
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('HEAD')
    expect(url.startsWith('/api/plugins/dsh-asset-library/file?path=')).toBe(true)
    expect(url).toContain(encodeURIComponent(a.path))

    // 写回持久层
    const db = await import('../../src/client/data/db.ts')
    expect((await db.getAsset(b.id))?.status).toBe('missing')
  })

  it('网络异常按 missing 处理（不抛）', async () => {
    const { store } = await freshStore()
    await store.init()
    await store.importFiles([makeFile('c.png', new Uint8Array([3]), 'image/png')], async () => 'skip')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      }),
    )
    await expect(store.recheck([])).resolves.toBeUndefined()
    expect(store.getSnapshot().assets[0]?.status).toBe('missing')
  })

  it('413/500 不误判为 missing', async () => {
    const { store } = await freshStore()
    await store.init()
    await store.importFiles([makeFile('d.png', new Uint8Array([4]), 'image/png')], async () => 'skip')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 413 })))
    await store.recheck([])
    expect(store.getSnapshot().assets[0]?.status).toBe('ok')
  })
})

describe('store：快照与订阅', () => {
  it('快照不可变，订阅在变更时被通知', async () => {
    const { store } = await freshStore()
    await store.init()
    const listener = vi.fn()
    const off = store.subscribe(listener)
    const before = store.getSnapshot()
    store.setQuery({ text: 'abc' })
    expect(store.getSnapshot()).not.toBe(before)
    expect(Object.isFrozen(store.getSnapshot())).toBe(true)
    expect(Object.isFrozen(store.getSnapshot().query)).toBe(true)
    await Promise.resolve()
    expect(listener).toHaveBeenCalled()
    off()
    const count = listener.mock.calls.length
    store.setQuery({ text: 'def' })
    await Promise.resolve()
    expect(listener.mock.calls.length).toBe(count)
  })

  it('setQuery 立即更新 filtered', async () => {
    const { store } = await freshStore()
    await store.init()
    await store.importFiles(
      [
        makeFile('sunset.png', new Uint8Array([1]), 'image/png'),
        makeFile('report.pdf', new Uint8Array([2]), 'application/pdf'),
      ],
      async () => 'skip',
    )
    expect(store.getSnapshot().filtered).toHaveLength(2)
    store.setQuery({ text: 'sunset' })
    expect(store.getSnapshot().filtered.map(a => a.name)).toEqual(['sunset.png'])
    store.setQuery({ text: '', kinds: ['document'] })
    expect(store.getSnapshot().filtered.map(a => a.name)).toEqual(['report.pdf'])
  })

  it('select 更新选中集合且不受 assets 变化引用污染', async () => {
    const { store } = await freshStore()
    await store.init()
    await store.importFiles([makeFile('s.png', new Uint8Array([1]), 'image/png')], async () => 'skip')
    const id = (store.getSnapshot().assets[0] as AssetRecord).id
    store.select([id])
    expect(store.getSnapshot().selected).toEqual([id])
    expect(Object.isFrozen(store.getSnapshot().selected)).toBe(true)
  })
})

describe('store：单条动作', () => {
  /** 导入一条并返回。 */
  async function seed(store: ReturnType<StoreModule['createStore']>): Promise<AssetRecord> {
    await store.init()
    await store.importFiles([makeFile('p.png', new Uint8Array([1, 2]), 'image/png')], async () => 'skip')
    return store.getSnapshot().assets[0] as AssetRecord
  }

  it('toggleFavorite 翻转并持久化', async () => {
    const { store } = await freshStore()
    const a = await seed(store)
    store.toggleFavorite(a.id)
    expect(store.getSnapshot().assets[0]?.favorite).toBe(true)
    await new Promise(r => setTimeout(r, 5))
    const db = await import('../../src/client/data/db.ts')
    expect((await db.getAsset(a.id))?.favorite).toBe(true)
    store.toggleFavorite(a.id)
    expect(store.getSnapshot().assets[0]?.favorite).toBe(false)
  })

  it('setRating 持久化', async () => {
    const { store } = await freshStore()
    const a = await seed(store)
    store.setRating(a.id, 4)
    await new Promise(r => setTimeout(r, 5))
    const db = await import('../../src/client/data/db.ts')
    expect((await db.getAsset(a.id))?.rating).toBe(4)
  })

  it('toggleTag 加标签与去标签都持久化，并支持多选批量', async () => {
    const { store } = await freshStore()
    await store.init()
    await store.importFiles(
      [
        makeFile('t1.png', new Uint8Array([1]), 'image/png'),
        makeFile('t2.png', new Uint8Array([2]), 'image/png'),
      ],
      async () => 'skip',
    )
    const ids = store.getSnapshot().assets.map(a => a.id)
    await store.toggleTag(ids, '风景')
    expect(store.getSnapshot().assets.every(a => a.tags.includes('风景'))).toBe(true)
    const db = await import('../../src/client/data/db.ts')
    expect((await db.getAsset(ids[0] as string))?.tags).toEqual(['风景'])
    await store.toggleTag(ids, '风景')
    expect(store.getSnapshot().assets.every(a => a.tags.length === 0)).toBe(true)
  })

  it('patch 更新名称并持久化', async () => {
    const { store } = await freshStore()
    const a = await seed(store)
    await store.patch(a.id, { name: '新名字.png' })
    expect(store.getSnapshot().assets[0]?.name).toBe('新名字.png')
    const db = await import('../../src/client/data/db.ts')
    expect((await db.getAsset(a.id))?.name).toBe('新名字.png')
  })

  it('remove 删除并清理选中集合', async () => {
    const { store } = await freshStore()
    const a = await seed(store)
    store.select([a.id])
    await store.remove([a.id])
    expect(store.getSnapshot().assets).toEqual([])
    expect(store.getSnapshot().selected).toEqual([])
    const db = await import('../../src/client/data/db.ts')
    expect(await db.getAsset(a.id)).toBeUndefined()
  })

  it('relocate 写入新路径并置 ok', async () => {
    const { store } = await freshStore()
    const a = await seed(store)
    await store.relocate(a.id, '/new/place/p.png')
    const after = store.getSnapshot().assets[0] as AssetRecord
    expect(after.path).toBe('/new/place/p.png')
    expect(after.status).toBe('ok')
    const db = await import('../../src/client/data/db.ts')
    expect((await db.getAsset(a.id))?.path).toBe('/new/place/p.png')
  })

  it('relocate 空路径抛中文原因', async () => {
    const { store } = await freshStore()
    const a = await seed(store)
    await expect(store.relocate(a.id, '')).rejects.toThrow(/新路径为空/)
  })

  it('remove 空数组是 no-op', async () => {
    const { store } = await freshStore()
    const a = await seed(store)
    await store.remove([])
    expect(store.getSnapshot().assets).toHaveLength(1)
    expect(a.id).toBeDefined()
  })
})

describe('store：并发上限', () => {
  it('缩略图解码并发不超过 2（任务池上限）', async () => {
    const { store } = await freshStore()
    await store.init()
    // 用带延迟的 createImageBitmap 观测真实并发：6 个文件、上限 2。
    let active = 0
    let maxActive = 0
    Object.defineProperty(globalThis, 'createImageBitmap', {
      configurable: true,
      writable: true,
      value: vi.fn(async () => {
        active += 1
        maxActive = Math.max(maxActive, active)
        await new Promise(r => setTimeout(r, 15))
        active -= 1
        return { width: 400, height: 300, close: vi.fn() } as unknown as ImageBitmap
      }),
    })
    const files = Array.from({ length: 6 }, (_, i) =>
      makeFile(`c${i}.png`, new Uint8Array([i + 1]), 'image/png'),
    )
    await store.importFiles(files, async () => 'skip')
    expect(store.getSnapshot().assets).toHaveLength(6)
    expect(maxActive).toBeLessThanOrEqual(2)
    expect(maxActive).toBeGreaterThanOrEqual(1)
    expect(store.getSnapshot().importRunning).toBe(false)
  })
})
