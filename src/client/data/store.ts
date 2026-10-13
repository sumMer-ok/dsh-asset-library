import {
  clearPendingDelete,
  clearWallpaper as clearStoredWallpaper,
  deleteAssets,
  ensureSchemaVersion,
  findByHash,
  getAllAssets,
  getWallpaper,
  onThumbError,
  openDb,
  patchAsset,
  putAsset,
  putWallpaper,
  readPendingDelete,
  readSettings,
  WALLPAPER_KEY,
  writePendingDelete,
  writeSettings,
} from './db.ts'
import { applyQuery, extOf, kindForName, mediaTypeFor } from './filters.ts'
import { identify } from './hash.ts'
import { fileUrl } from './route.ts'
import { DEFAULT_SETTINGS } from './settings.ts'
import { fallbackCover, thumbnailFor } from './thumb.ts'
import type { AssetKind, AssetRecord, ImportEvent, PluginSettings, Query, ThumbResult } from './types.ts'

/**
 * 素材库客户端状态容器（单例 observable，闭包实现）。
 * 快照不可变：每次变更整体替换对象，React `useSyncExternalStore` 可直接比较引用。
 */

/** UI 订阅的状态快照；`assets`/`filtered`/`imports`/`selected` 均为冻结数组。 */
export interface LibraryState {
  loading: boolean
  error: string | null
  assets: AssetRecord[]
  filtered: AssetRecord[]
  query: Query
  settings: PluginSettings
  imports: ImportEvent[]
  importRunning: boolean
  selected: string[]
  /**
   * 撤销窗口内的待删除批次（`null`＝没有）。UI 只读这个字段显示撤销条，
   * 待删除记录本体存在 IndexedDB 的 `meta.pendingDelete`，UI 不自己开库。
   */
  pendingUndo: { ids: string[]; expiresAt: number } | null
  /** 当前自定义壁纸字节；`undefined`＝使用默认墙面。 */
  wallpaper: Blob | undefined
}

/** 契约动作集；与计划 §4 的 `LibraryStore` 一一对应。 */
export interface LibraryStore {
  getSnapshot(): LibraryState
  subscribe(listener: () => void): () => void
  init(): Promise<void>
  setQuery(patch: Partial<Query>): void
  importFiles(files: File[], onDuplicate: (a: AssetRecord, f: File) => Promise<'skip' | 'keep' | 'replace'>): Promise<void>
  remove(ids: string[]): Promise<void>
  patch(id: string, patch: Partial<AssetRecord>): Promise<void>
  toggleFavorite(id: string): void
  setRating(id: string, rating: AssetRecord['rating']): void
  toggleTag(ids: string[], tag: string): Promise<void>
  relocate(id: string, nextPath: string): Promise<void>
  recheck(ids: string[]): Promise<void>
  select(ids: string[]): void
  /**
   * 写入设置：先乐观更新界面，持久化失败则回滚并把原因挂到 `state.error`（不静默）。
   * @param patch - 要改的设置项。
   */
  setSettings(patch: Partial<PluginSettings>): Promise<void>
  /**
   * 设置自定义壁纸（只接受 `image/*` 且 ≤ 20 MB）。失败时**先写 `state.error` 再抛出**。
   * @param file - 用户从本机选择的图片文件。
   */
  setWallpaper(file: File): Promise<void>
  /** 恢复默认墙面：删除已保存的壁纸并清空设置里的键。 */
  clearWallpaper(): Promise<void>
  /**
   * 移出素材库（可撤销）：记录进 `meta.pendingDelete`、从视图移除，**8 秒后**才真删。
   * 磁盘原文件始终不动。
   * @param ids - 要移出的素材 id。
   */
  removeWithUndo(ids: string[]): Promise<void>
  /** 撤销上一次移出（窗口内有效）：把记录放回视图并清空待删除批次。 */
  undoRemove(): Promise<void>
  /** 立即执行待删除批次的真删（到期时自动调用；也可由 UI 显式调用）。 */
  purgePendingDelete(): Promise<void>
  /** 释放该实例的全局订阅（缩略图错误上报）。UI 卸载或测试销毁实例时调用。 */
  dispose(): void
}

/** 默认查询：无筛选、按导入时间倒序。 */
export const DEFAULT_QUERY: Query = {
  text: '',
  kinds: [],
  tags: [],
  favoriteOnly: false,
  minRating: 0,
  from: null,
  to: null,
  sort: 'importedAt',
  desc: true,
}

/** 哈希与缩略图的并发上限（计划 §9）。 */
const IMPORT_CONCURRENCY = 2
/** HEAD 探测的超时上限。 */
const RECHECK_TIMEOUT_MS = 5000
/** 移出素材库后的撤销窗口（Q9/Q15/Q20）。 */
const UNDO_WINDOW_MS = 8000
/** 自定义壁纸的单张上限（Q16）。 */
const WALLPAPER_MAX_BYTES = 20 * 1024 * 1024

/**
 * 待删除批次（写入 `meta.pendingDelete` 的结构）。
 * 记录本体留在 `assets` store 里不动，删除推迟到窗口结束——撤销因此不需要重新写回字节。
 */
interface PendingDelete {
  /** 待删除的素材 id。 */
  ids: string[]
  /** 完整记录（含缩略图 Blob），撤销时直接放回视图，不必再读库。 */
  records: AssetRecord[]
  /** 撤销截止时刻（epoch ms）。 */
  expiresAt: number
}

/** 校验从库里读回的结构（旧版本或损坏数据一律视为没有待删除批次，不抛错卡住初始化）。 */
function isPendingDelete(value: unknown): value is PendingDelete {
  if (value === null || typeof value !== 'object') return false
  const candidate = value as Partial<PendingDelete>
  return (
    Array.isArray(candidate.ids) &&
    candidate.ids.every(id => typeof id === 'string') &&
    Array.isArray(candidate.records) &&
    typeof candidate.expiresAt === 'number' &&
    Number.isFinite(candidate.expiresAt)
  )
}

/** 把字节数折成 MB 文案（错误提示用；数据层不依赖 UI 的格式化模块）。 */
function megabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/**
 * 磁盘路径解析器：由宿主装配层（`src/client/index.tsx`）注入
 * `window.__DSH_HOST_PATHS__.pathFor`，因为 `importFiles` 的签名由冻结契约固定为两个参数。
 */
export type PathResolver = (file: File) => string | undefined

let pathResolver: PathResolver | undefined

/**
 * 注入宿主路径解析器。
 * @param resolver 返回文件绝对路径；返回 undefined 表示取不到。
 */
export function setPathResolver(resolver: PathResolver | undefined): void {
  pathResolver = resolver
}

/** 记录「取不到真实路径」的差文件，导入时给出可见告警而不是静默使用文件名。 */
const unresolvedPaths = new WeakSet<File>()

/** 把异常折成可读中文。 */
function describe(e: unknown): string {
  if (e instanceof AggregateError) return e.message
  if (e instanceof Error) return e.message
  return String(e)
}

/** 生成素材 id；优先 crypto.randomUUID，缺失时用随机回退。 */
function newId(): string {
  const c: Crypto | undefined = globalThis.crypto
  if (c?.randomUUID) return c.randomUUID()
  return `${Date.now().toString(16)}-${Math.floor(Math.random() * 0xffffffff).toString(16)}`
}

/** 冻结快照的各层容器，避免 UI 侧意外改动。 */
function freezeState(s: LibraryState): LibraryState {
  Object.freeze(s.assets)
  Object.freeze(s.filtered)
  Object.freeze(s.query.kinds)
  Object.freeze(s.query.tags)
  Object.freeze(s.query)
  Object.freeze(s.settings)
  Object.freeze(s.imports)
  Object.freeze(s.selected)
  if (s.pendingUndo) {
    Object.freeze(s.pendingUndo.ids)
    Object.freeze(s.pendingUndo)
  }
  return Object.freeze(s)
}

/** 并发上限固定的任务池；支持等待整批结束。 */
class TaskPool {
  private readonly limit: number
  private readonly queue: Array<() => Promise<void>> = []
  private active = 0
  private total = 0
  private settled = 0
  private waiters: Array<() => void> = []

  /**
   * @param limit 同时运行的任务数上限。
   */
  constructor(limit: number) {
    this.limit = Math.max(1, limit)
  }

  /**
   * 入队一个任务。
   * @param task 任务体；reject 由 `onError` 交付，不产生未处理拒绝。
   * @param onError 失败回调。
   */
  add(task: () => Promise<void>, onError: (e: unknown) => void): void {
    this.total += 1
    this.queue.push(async () => {
      try {
        await task()
      } catch (e) {
        onError(e)
      }
    })
    this.pump()
  }

  /** 等待当前已入队的全部任务结束（在途 `add` 不计入）。 */
  wait(): Promise<void> {
    if (this.settled >= this.total) return Promise.resolve()
    return new Promise<void>(resolve => {
      this.waiters.push(resolve)
    })
  }

  private settle(): void {
    this.settled += 1
    if (this.settled >= this.total) {
      const waiters = this.waiters
      this.waiters = []
      for (const resolve of waiters) resolve()
    }
  }

  private pump(): void {
    while (this.active < this.limit) {
      const next = this.queue.shift()
      if (!next) return
      this.active += 1
      void next().finally(() => {
        this.active -= 1
        this.settle()
        this.pump()
      })
    }
  }
}

/**
 * 创建独立的 store 实例。
 * @param options.autoInit 是否在创建时立即 `init()`（默认 true，UI 直接可用；测试可关掉）。
 */
export function createStore(options: { autoInit?: boolean } = {}): LibraryStore {
  let state: LibraryState = {
    loading: true,
    error: null,
    assets: [],
    filtered: [],
    query: { ...DEFAULT_QUERY, kinds: [], tags: [] },
    settings: { ...DEFAULT_SETTINGS },
    imports: [],
    importRunning: false,
    selected: [],
    pendingUndo: null,
    wallpaper: undefined,
  }
  const listeners = new Set<() => void>()
  let initPromise: Promise<void> | undefined
  /** 撤销窗口到期定时器（每个实例一个）。 */
  let undoTimer: ReturnType<typeof setTimeout> | undefined

  /** 取消当前的撤销到期定时器。 */
  const clearUndoTimer = (): void => {
    if (undoTimer === undefined) return
    clearTimeout(undoTimer)
    undoTimer = undefined
  }

  /**
   * 同步通知订阅者（React `useSyncExternalStore` 允许在写入后同步调用）。
   * 必须同步：否则共享同一个 `state` 变量的订阅者会跳过中间快照
   * （例如 importFiles 的 `queued` 态会在首次 await 前就被 hashing 覆盖）。
   */
  const notify = (): void => {
    for (const listener of [...listeners]) listener()
  }

  const setState = (patch: Partial<LibraryState>): void => {
    const next: LibraryState = { ...state, ...patch }
    if (next.assets !== state.assets || next.query !== state.query) {
      next.filtered = applyQuery(next.assets, next.query)
    }
    state = freezeState(next)
    notify()
  }

  /** 追加导入进度事件。 */
  const pushEvent = (event: ImportEvent): void => {
    setState({ imports: [...state.imports, event] })
  }

  /** 更新单条素材（整表替换为新数组）。 */
  const replaceAsset = (id: string, patch: Partial<AssetRecord>): void => {
    setState({ assets: state.assets.map(a => (a.id === id ? { ...a, ...patch } : a)) })
  }

  /** HEAD 探测宿主 Range 路由：200/206 → ok，404/403 → missing。 */
  const probe = async (path: string): Promise<'ok' | 'missing'> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), RECHECK_TIMEOUT_MS)
    try {
      const res = await fetch(fileUrl(path), {
        method: 'HEAD',
        signal: controller.signal,
      })
      if (res.status === 200 || res.status === 206) return 'ok'
      if (res.status === 404 || res.status === 403) return 'missing'
      // 其它状态（400/413/5xx）无法判定文件在否，按可达处理，避免误标 missing。
      return 'ok'
    } catch {
      return 'missing'
    } finally {
      clearTimeout(timer)
    }
  }

  /** 读取待删除批次；结构不符（旧版本/损坏）一律当作没有，不让初始化卡住。 */
  const readPending = async (): Promise<PendingDelete | undefined> => {
    const raw = await readPendingDelete<unknown>()
    return isPendingDelete(raw) ? raw : undefined
  }

  /**
   * 立即真删待删除批次并清空 pending。
   * @returns 错误文案；`null` 表示成功或本来就没有待删除批次。
   */
  const purgeNow = async (): Promise<string | null> => {
    const pending = await readPending()
    clearUndoTimer()
    if (pending === undefined) {
      setState({ pendingUndo: null })
      return null
    }
    try {
      await deleteAssets(pending.ids)
      await clearPendingDelete()
      setState({ pendingUndo: null })
      return null
    } catch (e) {
      // 保留 meta 记录：下一次 init / purge 会重试，绝不静默丢掉待删除清单。
      const message = `移出素材库失败（待删除记录已保留，将自动重试）：${describe(e)}`
      setState({ error: message })
      return message
    }
  }

  /** 安排撤销窗口到期时的真删。 */
  const scheduleUndoPurge = (delayMs: number): void => {
    clearUndoTimer()
    undoTimer = setTimeout(() => {
      undoTimer = undefined
      void purgeNow()
    }, Math.max(0, delayMs))
  }

  const store: LibraryStore = {
    getSnapshot: () => state,

    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    async init(): Promise<void> {
      if (initPromise) return initPromise
      initPromise = (async () => {
        /** 不阻断加载的失败（壁纸读取、到期清理）；最后一次性挂到 `state.error` 上。 */
        const failures: string[] = []
        try {
          await openDb()
          await ensureSchemaVersion()
          const settings = await readSettings()
          setState({ settings })

          // 壁纸是可选的装饰：读失败只报错，不挡住素材列表。
          try {
            setState({ wallpaper: await getWallpaper() })
          } catch (e) {
            failures.push(`读取壁纸失败：${describe(e)}`)
          }

          const pending = await readPending()
          if (pending !== undefined && pending.expiresAt > Date.now()) {
            // 窗口未过：条目继续隐藏，但把撤销机会交回界面，并重新起定时器。
            const assets = await getAllAssets()
            const hidden = new Set(pending.ids)
            setState({
              assets: assets.filter(a => !hidden.has(a.id)),
              loading: false,
              pendingUndo: { ids: pending.ids, expiresAt: pending.expiresAt },
              error: failures.length > 0 ? failures.join('；') : null,
            })
            scheduleUndoPurge(pending.expiresAt - Date.now())
            return
          }
          if (pending !== undefined) {
            const failed = await purgeNow()
            if (failed !== null) failures.push(failed)
          }
          // 真删之后才读列表：在到期分支里先读会让刚删掉的条目又出现在快照里。
          const assets = await getAllAssets()
          setState({
            assets,
            loading: false,
            error: failures.length > 0 ? failures.join('；') : null,
          })
        } catch (e) {
          setState({ loading: false, error: `素材库初始化失败：${describe(e)}` })
        }
      })()
      return initPromise
    },

    setQuery(patch: Partial<Query>): void {
      setState({ query: { ...state.query, ...patch } })
    },

    async importFiles(files, onDuplicate): Promise<void> {
      if (files.length === 0) return
      /** 每个文件的稳定事件键（同批内唯一，且不受路径解析成功与否影响）。 */
      const keyOf = (file: File): string => `${file.name}#${file.size}#${file.lastModified}`
      /** 事件键 → 展示信息；状态机推进时用最新值覆盖同名事件。 */
      const ctxByKey = new Map<string, { name: string; path: string }>()

      setState({
        importRunning: true,
        imports: files.map(f => {
          const key = keyOf(f)
          ctxByKey.set(key, { name: f.name, path: f.name })
          return { path: f.name, name: f.name, phase: 'queued' as const }
        }),
      })

      const advance = (key: string, phase: ImportEvent['phase'], error?: string): void => {
        const ctx = ctxByKey.get(key)
        const next: ImportEvent = { path: ctx?.path ?? key, name: ctx?.name ?? key, phase }
        if (error !== undefined) next.error = error
        const idx = state.imports.findIndex(e => e.path === next.path && e.name === next.name)
        const imports = idx >= 0 ? state.imports.map((e, i) => (i === idx ? next : e)) : [...state.imports, next]
        ctxByKey.set(key, { name: ctx?.name ?? next.name, path: next.path })
        setState({ imports })
      }

      const pool = new TaskPool(IMPORT_CONCURRENCY)

      /** 单个文件的完整状态机；任何失败都只影响该文件。 */
      const importOne = async (file: File): Promise<void> => {
        const key = keyOf(file)
        const name = file.name
        const kind: AssetKind = kindForName(name)
        const ext = extOf(name)
        try {
          let path = name
          if (pathResolver) {
            const resolved = pathResolver(file)
            if (resolved) path = resolved
            else unresolvedPaths.add(file)
          }
          if (unresolvedPaths.has(file)) {
            pushEvent({
              path,
              name,
              phase: 'queued',
              error: '取不到磁盘真实路径，暂以文件名代替；引用到对话前必须重新定位',
            })
          }
          ctxByKey.set(key, { name, path })

          advance(key, 'hashing')
          const { cheap, hash } = await identify(file)
          const duplicates = await findByHash(hash)

          if (duplicates.length > 0) {
            advance(key, 'duplicate')
            const existing = duplicates[0] as AssetRecord
            const choice = await onDuplicate(existing, file)
            if (choice === 'skip') {
              advance(key, 'done')
              return
            }
            if (choice === 'replace') {
              await deleteAssets([existing.id])
              setState({ assets: state.assets.filter(a => a.id !== existing.id) })
            }
          }

          advance(key, 'thumb')
          let thumb: ThumbResult & { durationMs?: number }
          try {
            thumb = await thumbnailFor(file, kind, state.settings)
          } catch (e) {
            // 图片解码失败等 → 类型封面卡兜底，并在进度里标注原因。
            const reason = describe(e)
            thumb = await fallbackCover(kind, name)
            pushEvent({ path, name, phase: 'thumb', error: `缩略图生成失败，已用封面卡替代：${reason}` })
          }

          const record: AssetRecord = {
            id: newId(),
            path,
            name,
            ext,
            kind,
            mediaType: file.type || mediaTypeFor(name),
            size: file.size,
            hash,
            cheap,
            thumb: thumb.blob,
            thumbWidth: thumb.width,
            thumbHeight: thumb.height,
            dominantColor: thumb.dominantColor,
            tags: [],
            favorite: false,
            rating: 0,
            status: 'ok',
            importedAt: Date.now(),
            lastCheckedAt: Date.now(),
          }
          if (thumb.durationMs !== undefined) record.durationMs = thumb.durationMs
          if (thumb.width > 0) record.width = thumb.width
          if (thumb.height > 0) record.height = thumb.height

          advance(key, 'writing')
          await putAsset(record)
          setState({ assets: [...state.assets, record] })
          advance(key, 'done')
        } catch (e) {
          // 单个文件失败不中断整批：状态落 failed 并带中文原因。
          advance(key, 'failed', describe(e))
        }
      }

      for (const file of files) {
        pool.add(
          () => importOne(file),
          e => {
            // importOne 内部已把失败落到该文件的 failed 事件；这里兜住意外逃逸的错误。
            pushEvent({ path: file.name, name: file.name, phase: 'failed', error: describe(e) })
          },
        )
      }
      await pool.wait()
      setState({ importRunning: false })
    },

    async remove(ids: string[]): Promise<void> {
      if (ids.length === 0) return
      await deleteAssets(ids)
      const gone = new Set(ids)
      setState({
        assets: state.assets.filter(a => !gone.has(a.id)),
        selected: state.selected.filter(id => !gone.has(id)),
      })
    },

    async patch(id: string, patch: Partial<AssetRecord>): Promise<void> {
      await patchAsset(id, patch)
      replaceAsset(id, patch)
    },

    toggleFavorite(id: string): void {
      const current = state.assets.find(a => a.id === id)
      if (!current) return
      const favorite = !current.favorite
      replaceAsset(id, { favorite })
      void patchAsset(id, { favorite }).catch(e => {
        setState({ error: `收藏状态保存失败：${describe(e)}` })
      })
    },

    setRating(id: string, rating: AssetRecord['rating']): void {
      replaceAsset(id, { rating })
      void patchAsset(id, { rating }).catch(e => {
        setState({ error: `评分保存失败：${describe(e)}` })
      })
    },

    async setSettings(patch: Partial<PluginSettings>): Promise<void> {
      const previous = state.settings
      setState({ settings: { ...previous, ...patch } })
      try {
        await writeSettings(patch)
      } catch (e) {
        // 回滚而不是留下"看起来生效了"的界面：设置只在真的落盘后算数。
        setState({ settings: previous, error: `设置保存失败：${describe(e)}` })
      }
    },

    async setWallpaper(file: File): Promise<void> {
      if (!file.type.startsWith('image/')) {
        const message = `壁纸必须是图片文件（收到 ${file.type || '未知类型'}）`
        setState({ error: message })
        throw new Error(message)
      }
      if (file.size > WALLPAPER_MAX_BYTES) {
        const message = `壁纸图片过大（${megabytes(file.size)}），上限 ${megabytes(WALLPAPER_MAX_BYTES)}`
        setState({ error: message })
        throw new Error(message)
      }
      try {
        await putWallpaper(file, { name: file.name, type: file.type, bytes: file.size })
        const settings = await writeSettings({ wallpaperKey: WALLPAPER_KEY })
        setState({ wallpaper: file, settings, error: null })
      } catch (e) {
        const message = `保存壁纸失败：${describe(e)}`
        setState({ error: message })
        throw new Error(message, { cause: e })
      }
    },

    async clearWallpaper(): Promise<void> {
      try {
        await clearStoredWallpaper()
        const settings = await writeSettings({ wallpaperKey: null })
        setState({ wallpaper: undefined, settings, error: null })
      } catch (e) {
        const message = `恢复默认壁纸失败：${describe(e)}`
        setState({ error: message })
        throw new Error(message, { cause: e })
      }
    },

    async removeWithUndo(ids: string[]): Promise<void> {
      if (ids.length === 0) return
      const gone = new Set(ids)
      const records = state.assets.filter(a => gone.has(a.id))
      if (records.length === 0) return
      try {
        // 与已有批次合并成一个窗口：第二批若直接覆盖 meta 记录，第一批就会「出了视图却永不删除」。
        const existing = await readPending()
        const mergedIds = existing === undefined ? [...gone] : [...new Set([...existing.ids, ...gone])]
        const mergedRecords = existing === undefined
          ? records
          : [...existing.records.filter(record => !gone.has(record.id)), ...records]
        const expiresAt = Date.now() + UNDO_WINDOW_MS
        await writePendingDelete({ ids: mergedIds, records: mergedRecords, expiresAt })
        setState({
          assets: state.assets.filter(a => !gone.has(a.id)),
          selected: state.selected.filter(id => !gone.has(id)),
          pendingUndo: { ids: mergedIds, expiresAt },
          error: null,
        })
        scheduleUndoPurge(UNDO_WINDOW_MS)
      } catch (e) {
        // 写 meta 失败时视图保持原样：宁可没删掉，也不要出现「看不见但仍占库」的幽灵条目。
        setState({ error: `移出素材库失败：${describe(e)}` })
      }
    },

    async undoRemove(): Promise<void> {
      const pending = await readPending()
      clearUndoTimer()
      if (pending === undefined) {
        setState({ pendingUndo: null })
        return
      }
      if (pending.expiresAt <= Date.now()) {
        // 窗口已过（例如定时器没跑完就被关闭）：按到期处理，并明确告知不再可撤销。
        const failed = await purgeNow()
        if (failed === null) {
          setState({ error: '撤销窗口已过，这些素材已移出素材库（磁盘原文件未动）' })
        }
        return
      }
      try {
        await clearPendingDelete()
        const present = new Set(state.assets.map(a => a.id))
        const restored = pending.records.filter(record => !present.has(record.id))
        setState({ assets: [...state.assets, ...restored], pendingUndo: null, error: null })
      } catch (e) {
        setState({ error: `撤销失败：${describe(e)}` })
      }
    },

    async purgePendingDelete(): Promise<void> {
      await purgeNow()
    },

    async toggleTag(ids: string[], tag: string): Promise<void> {
      if (!tag) return
      const touched: AssetRecord[] = []
      for (const id of ids) {
        const current = state.assets.find(a => a.id === id)
        if (!current) continue
        const tags = current.tags.includes(tag) ? current.tags.filter(t => t !== tag) : [...current.tags, tag]
        touched.push({ ...current, tags })
      }
      if (touched.length === 0) return
      for (const record of touched) await patchAsset(record.id, { tags: record.tags })
      const byId = new Map(touched.map(r => [r.id, r.tags]))
      setState({ assets: state.assets.map(a => (byId.has(a.id) ? { ...a, tags: byId.get(a.id) as string[] } : a)) })
    },

    async relocate(id: string, nextPath: string): Promise<void> {
      if (!nextPath) throw new Error('重新定位失败：新路径为空')
      const lastCheckedAt = Date.now()
      await patchAsset(id, { path: nextPath, status: 'ok', lastCheckedAt })
      replaceAsset(id, { path: nextPath, status: 'ok', lastCheckedAt })
    },

    async recheck(ids: string[]): Promise<void> {
      const targets = ids.length > 0 ? ids : state.assets.map(a => a.id)
      const snapshot = state.assets
      const results = await Promise.all(
        targets.map(async id => {
          const asset = snapshot.find(a => a.id === id)
          if (!asset) return null
          const status = await probe(asset.path)
          return { id, status, lastCheckedAt: Date.now() }
        }),
      )
      const patchById = new Map(
        results.filter((r): r is { id: string; status: 'ok' | 'missing'; lastCheckedAt: number } => r !== null).map(r => [r.id, r]),
      )
      if (patchById.size === 0) return
      await Promise.all(
        [...patchById.entries()].map(([id, patch]) => patchAsset(id, { status: patch.status, lastCheckedAt: patch.lastCheckedAt })),
      )
      setState({
        assets: state.assets.map(a => {
          const patch = patchById.get(a.id)
          return patch ? { ...a, status: patch.status, lastCheckedAt: patch.lastCheckedAt } : a
        }),
      })
    },

    select(ids: string[]): void {
      setState({ selected: [...ids] })
    },

    dispose(): void {
      clearUndoTimer()
      if (activeThumbErrorOff) {
        activeThumbErrorOff()
        activeThumbErrorOff = undefined
      }
    },
  }

  // 缩略图损坏（读取校验失败）时在进度区可见报错。
  // 同一模块内只保留一个订阅：`onThumbError` 没有取消机制，
  // 而每次 createStore 都注册会累加（单进程内多次建实例时重复上报）。
  activeThumbErrorOff?.()
  activeThumbErrorOff = onThumbError((record, message) => {
    pushEvent({ path: record.path, name: record.name, phase: 'failed', error: `缩略图损坏：${message}` })
  })

  if (options.autoInit !== false) {
    // 启动即初始化（失败落 error 状态，不抛未处理拒绝）；UI 也可再调 init() 复用同一 Promise。
    void store.init()
  }

  return store
}

/** 当前实例注册的缩略图错误订阅（见 createStore 内的说明）。 */
let activeThumbErrorOff: (() => void) | undefined

/** 全局单例。 */
export const store: LibraryStore = createStore()

export { writeSettings }
export type { AssetRecord, ImportEvent, PluginSettings, Query }
