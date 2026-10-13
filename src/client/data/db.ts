import { DEFAULT_SETTINGS } from './settings.ts'
import type { AssetRecord, PluginSettings } from './types.ts'

/**
 * IndexedDB 持久层（DB 名 `dsh-asset-library`，版本 2）。
 * 原始素材字节不入库；只有元数据与缩略图 Blob，外加一张可选的自定义壁纸。
 */

const DB_NAME = 'dsh-asset-library'
/** 版本 2 新增 `wallpaper` store；升级块按 `contains` 幂等判断，老库数据原地保留。 */
const DB_VERSION = 2
const STORE_ASSETS = 'assets'
const STORE_META = 'meta'
const STORE_WALLPAPER = 'wallpaper'

/** 自定义壁纸固定占这一条记录（全局唯一，不随会话变化）。 */
export const WALLPAPER_KEY = 'current'

/** 待删除批次（撤销窗口内）在 `meta` 里的键。 */
export const PENDING_DELETE_KEY = 'pendingDelete'

/** 单事务写入条数上限（大 Blob 值，计划 §5）。 */
const BATCH_SIZE = 10
/** 整批重放的退避间隔；第 3 次失败后不再重试。 */
const RETRY_DELAYS_MS = [100, 300, 900]
/** 打开连接本身的重试上限与退避。 */
const OPEN_RETRY_DELAYS_MS = [100, 300, 900]

/** 把底层异常折成一句可读中文，不做静默吞掉。 */
function describeError(e: unknown): string {
  try {
    if (e instanceof Error) return `${e.name}: ${e.message}`
    if (typeof e === 'string') return e
    return JSON.stringify(e) ?? String(e)
  } catch {
    return String(e)
  }
}

/** 构造带中文原因的 DomainError，保留原始异常为 `cause`。 */
function fail(message: string, e: unknown): Error {
  return new Error(`${message}（原因：${describeError(e)}）`, { cause: e })
}

interface TransactionResult<T> {
  ok: boolean
  value?: T
  error?: unknown
}

/** 以 `transaction.oncomplete` 判定提交成功，否则取 abort/error 的原因。 */
function runTransaction<T>(
  db: IDBDatabase,
  stores: string | string[],
  mode: IDBTransactionMode,
  body: (tx: IDBTransaction) => Promise<T> | T,
): Promise<TransactionResult<T>> {
  return new Promise(resolve => {
    let tx: IDBTransaction
    try {
      tx = db.transaction(stores, mode)
    } catch (e) {
      resolve({ ok: false, error: e })
      return
    }
    let settled = false
    let value: T | undefined
    const finish = (result: TransactionResult<T>): void => {
      if (settled) return
      settled = true
      resolve(result)
    }
    tx.oncomplete = () => finish({ ok: true, value })
    tx.onabort = () => finish({ ok: false, error: tx.error ?? new Error('事务被中止') })
    tx.onerror = () => finish({ ok: false, error: tx.error ?? new Error('事务出错') })
    try {
      void Promise.resolve(body(tx)).then(
        v => {
          value = v
        },
        e => {
          try {
            tx.abort()
          } catch {
            /* 事务可能已自行 abort；错误原因由 onabort/onerror 交付 */
          }
          finish({ ok: false, error: e })
        },
      )
    } catch (e) {
      try {
        tx.abort()
      } catch {
        /* 同上：同步抛出时事务可能尚未创建成功 */
      }
      finish({ ok: false, error: e })
    }
  })
}

/** 请求 Promise 化；错误信息由调用方补中文原因。 */
function toPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('请求失败'))
  })
}

/** 等待若干毫秒（重放退避）。 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

let dbPromise: Promise<IDBDatabase> | undefined

/** 打开（并首次建库）连接；同一进程内复用，失败后不缓存被拒的连接。 */
export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  const attempt = (triesLeft: number): Promise<IDBDatabase> => {
    return new Promise<IDBDatabase>((resolve, reject) => {
      let req: IDBOpenDBRequest
      try {
        req = indexedDB.open(DB_NAME, DB_VERSION)
      } catch (e) {
        reject(fail('打开素材库数据库失败（无法发起 open）', e))
        return
      }
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE_ASSETS)) {
          const assets = db.createObjectStore(STORE_ASSETS, { keyPath: 'id' })
          assets.createIndex('kind', 'kind', { unique: false })
          assets.createIndex('importedAt', 'importedAt', { unique: false })
          assets.createIndex('hash', 'hash', { unique: false })
          assets.createIndex('cheap', 'cheap', { unique: false })
          assets.createIndex('favorite', 'favorite', { unique: false })
          assets.createIndex('tags', 'tags', { unique: false, multiEntry: true })
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains(STORE_WALLPAPER)) {
          db.createObjectStore(STORE_WALLPAPER, { keyPath: 'key' })
        }
      }
      req.onsuccess = () => {
        const db = req.result
        // 其它标签页请求升级时主动让路，避免整库卡死。
        db.onversionchange = () => db.close()
        resolve(db)
      }
      req.onerror = () => reject(req.error ?? new Error('打开数据库失败'))
      req.onblocked = () => reject(new Error('数据库被其它标签页阻塞（请关闭其它素材库标签页后重试）'))
    }).catch(async (e: unknown) => {
      if (triesLeft > 0) {
        const idx = OPEN_RETRY_DELAYS_MS.length - triesLeft
        await delay(OPEN_RETRY_DELAYS_MS[idx] ?? 900)
        return attempt(triesLeft - 1)
      }
      throw fail('打开素材库数据库失败（已重试 3 次）', e)
    })
  }
  dbPromise = attempt(OPEN_RETRY_DELAYS_MS.length).catch((e: unknown) => {
    dbPromise = undefined
    throw e
  })
  return dbPromise
}

/**
 * 单事务写入一批（≤10 条）；失败整批重放，退避 100/300/900ms。
 * @param list 同一事务内的记录；调用方负责保证 ≤ BATCH_SIZE。
 * @returns 仍然失败的记录（空数组表示全部成功）。
 */
function putBatch(db: IDBDatabase, list: AssetRecord[]): Promise<AssetRecord[]> {
  const attempt = async (round: number): Promise<AssetRecord[]> => {
    const result = await runTransaction(db, STORE_ASSETS, 'readwrite', tx => {
      const store = tx.objectStore(STORE_ASSETS)
      for (const a of list) store.put(a)
    })
    if (result.ok) return []
    if (round >= RETRY_DELAYS_MS.length) return list
    await delay(RETRY_DELAYS_MS[round] ?? 900)
    return attempt(round + 1)
  }
  return attempt(0)
}

/**
 * 写入单条素材（写入前校验缩略图为非空 Blob）。
 * @param a 完整记录；`thumb` 必须是 image/* 的非空 Blob。
 * @throws 记录非法或写入失败（重放 3 次后）时抛中文原因。
 */
export async function putAsset(a: AssetRecord): Promise<void> {
  verifyThumb(a)
  const failed = await putBatch(await openDb(), [a])
  if (failed.length > 0) throw fail(`写入素材「${a.name}」失败（已重放 3 次）`, new Error('事务未提交'))
}

/**
 * 批量写入；按 ≤10 条切分，每批独立重放。
 * @param list 待写记录。
 * @throws 任一批次重放 3 次仍失败时，以 AggregateError 汇总；已成功批次不回滚。
 */
export async function putAssets(list: AssetRecord[]): Promise<void> {
  if (list.length === 0) return
  const db = await openDb()
  const failures: AssetRecord[] = []
  for (let i = 0; i < list.length; i += BATCH_SIZE) {
    const batch = list.slice(i, i + BATCH_SIZE)
    failures.push(...(await putBatch(db, batch)))
  }
  if (failures.length > 0) {
    const names = failures.map(a => a.name).join('、')
    throw new AggregateError(
      failures,
      `写入失败（已重放 3 次）：${failures.length}/${list.length} 条未入库，分别为 ${names}`,
    )
  }
}

/**
 * 读取单条素材，并校验缩略图 Blob 未损坏。
 * @param id 素材 id。
 * @throws 读取失败或 Blob 与其 size/type 不符（视为缩略图损坏，需重新导入）。
 */
export async function getAsset(id: string): Promise<AssetRecord | undefined> {
  const db = await openDb()
  let record: AssetRecord | undefined
  try {
    record = await toPromise<AssetRecord | undefined>(db.transaction(STORE_ASSETS, 'readonly').objectStore(STORE_ASSETS).get(id))
  } catch (e) {
    throw fail(`读取素材 ${id} 失败`, e)
  }
  if (record) verifyThumb(record)
  return record
}

/** 校验缩略图 Blob 合法：类型为 image/*、尺寸非负且字节数大于 0。 */
function verifyThumb(record: AssetRecord): void {
  const t: unknown = record.thumb
  if (!(t instanceof Blob)) {
    throw new Error(`素材「${record.name}」的缩略图已损坏（不是 Blob，需重新导入）`)
  }
  if (t.size <= 0) {
    throw new Error(`素材「${record.name}」的缩略图已损坏（字节数为 0，需重新导入）`)
  }
  if (!t.type.startsWith('image/')) {
    throw new Error(`素材「${record.name}」的缩略图已损坏（类型 ${t.type || '(空)'} 不是图片，需重新导入）`)
  }
}

/**
 * 读取全部素材，逐条校验缩略图；损坏条目以 `thumbnail-error` 事件可见，不中断整表读取。
 * @returns 未损坏的记录（损坏条目由 host 侧 store 标记，见 store.init）。
 */
export async function getAllAssets(): Promise<AssetRecord[]> {
  const db = await openDb()
  let all: AssetRecord[]
  try {
    all = await toPromise<AssetRecord[]>(db.transaction(STORE_ASSETS, 'readonly').objectStore(STORE_ASSETS).getAll())
  } catch (e) {
    throw fail('读取素材列表失败', e)
  }
  const good: AssetRecord[] = []
  for (const record of all) {
    try {
      verifyThumb(record)
      good.push(record)
    } catch (e) {
      reportThumbError(record, e)
    }
  }
  return good
}

/** 缩略图损坏的可见上报通道；S3 可订阅后展示「需重新导入」。 */
const thumbErrorListeners = new Set<(record: AssetRecord, message: string) => void>()

/**
 * 订阅缩略图损坏事件。
 * @param listener 收到损坏记录与中文原因。
 * @returns 取消订阅函数。
 */
export function onThumbError(listener: (record: AssetRecord, message: string) => void): () => void {
  thumbErrorListeners.add(listener)
  return () => {
    thumbErrorListeners.delete(listener)
  }
}

function reportThumbError(record: AssetRecord, e: unknown): void {
  const message = e instanceof Error ? e.message : describeError(e)
  for (const listener of thumbErrorListeners) {
    try {
      listener(record, message)
    } catch {
      /* 单个订阅者抛错不影响其它订阅者与整表读取 */
    }
  }
}

/**
 * 删除若干素材（单事务；ids 为空时直接返回）。
 * @param ids 素材 id 列表。
 * @throws 删除失败时抛中文原因。
 */
export async function deleteAssets(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const db = await openDb()
  const result = await runTransaction(db, STORE_ASSETS, 'readwrite', tx => {
    const store = tx.objectStore(STORE_ASSETS)
    for (const id of ids) store.delete(id)
  })
  if (!result.ok) throw fail(`删除 ${ids.length} 条素材失败`, result.error)
}

/**
 * 局部更新一条素材（先读后写；读-写之间不做事务持有，避免跨 await 的事务生命周期问题）。
 * @param id 素材 id。
 * @param patch 只覆盖给出的字段。
 * @throws 素材不存在或写入失败时抛中文原因。
 */
export async function patchAsset(id: string, patch: Partial<AssetRecord>): Promise<void> {
  const current = await getAsset(id)
  if (!current) throw new Error(`更新素材 ${id} 失败：素材不存在`)
  await putAsset({ ...current, ...patch, id: current.id })
}

/**
 * 按完整内容哈希查重。
 * @param hash sha256 hex。
 * @returns 同哈希的记录；索引不可用时回退全表过滤。
 */
export async function findByHash(hash: string): Promise<AssetRecord[]> {
  const db = await openDb()
  try {
    const tx = db.transaction(STORE_ASSETS, 'readonly')
    const index = tx.objectStore(STORE_ASSETS).index('hash')
    return await toPromise<AssetRecord[]>(index.getAll(hash))
  } catch {
    // 索引缺失（旧库或异常升级）时回退全表过滤，保证去重不失效。
    const all = await getAllAssets()
    return all.filter(a => a.hash === hash)
  }
}

/**
 * 读取 meta 键。
 * @param key 键名。
 * @throws 读取失败时抛中文原因。
 */
export async function readMeta<T>(key: string): Promise<T | undefined> {
  const db = await openDb()
  try {
    const row = await toPromise<{ key: string; value: T } | undefined>(
      db.transaction(STORE_META, 'readonly').objectStore(STORE_META).get(key),
    )
    return row?.value
  } catch (e) {
    throw fail(`读取配置项「${key}」失败`, e)
  }
}

/**
 * 写入 meta 键。
 * @param key 键名。
 * @param value 任意可结构化克隆的值。
 * @throws 写入失败时抛中文原因。
 */
export async function writeMeta<T>(key: string, value: T): Promise<void> {
  const db = await openDb()
  const result = await runTransaction(db, STORE_META, 'readwrite', tx => {
    tx.objectStore(STORE_META).put({ key, value })
  })
  if (!result.ok) throw fail(`写入配置项「${key}」失败`, result.error)
}

/**
 * 写入（或覆盖）唯一那张自定义壁纸。
 * @param blob 壁纸图片字节。
 * @param meta 展示与配额核对用的元信息。
 * @throws 参数非法或写入失败时抛中文原因。
 */
export async function putWallpaper(
  blob: Blob,
  meta: { name: string; type: string; bytes: number },
): Promise<void> {
  if (!(blob instanceof Blob) || blob.size <= 0) {
    throw new Error('保存壁纸失败：图片内容为空')
  }
  const db = await openDb()
  const row = { key: WALLPAPER_KEY, blob, name: meta.name, type: meta.type, bytes: meta.bytes, updatedAt: Date.now() }
  const result = await runTransaction(db, STORE_WALLPAPER, 'readwrite', tx => {
    tx.objectStore(STORE_WALLPAPER).put(row)
  })
  if (!result.ok) throw fail('保存壁纸失败', result.error)
}

/**
 * 读取自定义壁纸。
 * @returns 已保存的图片字节；没有壁纸时返回 `undefined`。
 * @throws 读取失败或记录损坏（不是非空 Blob）时抛中文原因——损坏要让用户看见并重新选择，不能静默当成"没有壁纸"。
 */
export async function getWallpaper(): Promise<Blob | undefined> {
  const db = await openDb()
  let row: { blob?: unknown } | undefined
  try {
    row = await toPromise<{ blob?: unknown } | undefined>(
      db.transaction(STORE_WALLPAPER, 'readonly').objectStore(STORE_WALLPAPER).get(WALLPAPER_KEY),
    )
  } catch (e) {
    throw fail('读取壁纸失败', e)
  }
  if (row === undefined) return undefined
  const blob: unknown = row.blob
  if (!(blob instanceof Blob) || blob.size <= 0) {
    throw new Error('已保存的壁纸已损坏（内容为空或不是图片），请重新选择壁纸')
  }
  return blob
}

/**
 * 删除自定义壁纸（没有壁纸时也是成功）。
 * @throws 删除失败时抛中文原因。
 */
export async function clearWallpaper(): Promise<void> {
  const db = await openDb()
  const result = await runTransaction(db, STORE_WALLPAPER, 'readwrite', tx => {
    tx.objectStore(STORE_WALLPAPER).delete(WALLPAPER_KEY)
  })
  if (!result.ok) throw fail('恢复默认壁纸失败', result.error)
}

/**
 * 读取待删除批次（撤销窗口内）。
 * @returns 写入时的原值；没有待删除批次时返回 `undefined`。
 * @throws 读取失败时抛中文原因。
 */
export async function readPendingDelete<T>(): Promise<T | undefined> {
  return readMeta<T>(PENDING_DELETE_KEY)
}

/**
 * 写入待删除批次。
 * @param value 由调用方定义结构（store 侧负责校验）。
 * @throws 写入失败时抛中文原因。
 */
export async function writePendingDelete(value: unknown): Promise<void> {
  await writeMeta(PENDING_DELETE_KEY, value)
}

/**
 * 清空待删除批次（撤销成功、或删除已真正执行）。
 * @throws 写入失败时抛中文原因。
 */
export async function clearPendingDelete(): Promise<void> {
  const db = await openDb()
  const result = await runTransaction(db, STORE_META, 'readwrite', tx => {
    tx.objectStore(STORE_META).delete(PENDING_DELETE_KEY)
  })
  if (!result.ok) throw fail('清理待删除记录失败', result.error)
}

/** `PluginSettings` 里合法的遮罩强度区间（百分比）。 */
const WALLPAPER_MASK_RANGE = { min: 0, max: 90 } as const

/** 把遮罩强度钳制进合法区间并取整。 */
function clampMask(value: number): number {
  return Math.min(WALLPAPER_MASK_RANGE.max, Math.max(WALLPAPER_MASK_RANGE.min, Math.round(value)))
}

/**
 * 逐字段校验并补齐设置默认值；非法值回退默认，数值型越界项按各自规则钳制。
 *
 * 三类字段分别处理：数值（`wallpaperMask` 额外钳制）、`wallpaperKey`（`null` 或非空字符串）、
 * 布尔（`curationOpen`）。**这里新增分支时，`tests/data/settings.spec.ts` 的
 * 「每个默认字段都能往返」用例会同时检查到——漏登记一个字段会被那条用例抓住**，不靠注释自觉。
 */
function mergeSettings(raw: unknown): PluginSettings {
  const merged: PluginSettings = { ...DEFAULT_SETTINGS }
  if (!raw || typeof raw !== 'object') return merged
  const source = raw as Record<string, unknown>
  const numbers: Record<string, number> = {}

  for (const key of Object.keys(DEFAULT_SETTINGS) as Array<keyof PluginSettings>) {
    if (key === 'wallpaperMask') continue
    // 默认值不是数字的键走下面的类型分支；少了这一句，`wallpaperKey: 42` 会被当成合法数值收下。
    if (typeof DEFAULT_SETTINGS[key] !== 'number') continue
    const value = source[key]
    if (typeof value === 'number' && Number.isFinite(value)) numbers[key] = value
  }
  Object.assign(merged, numbers)

  const mask = source.wallpaperMask
  merged.wallpaperMask = clampMask(
    typeof mask === 'number' && Number.isFinite(mask) ? mask : merged.wallpaperMask,
  )

  const wallpaperKey = source.wallpaperKey
  if (wallpaperKey === null) merged.wallpaperKey = null
  else if (typeof wallpaperKey === 'string' && wallpaperKey !== '') merged.wallpaperKey = wallpaperKey

  if (typeof source.curationOpen === 'boolean') merged.curationOpen = source.curationOpen

  return merged
}

/**
 * 读取设置：默认值与 `meta.settings` 合并（后者优先）。
 * @returns 完整的 PluginSettings，绝不出现缺字段。
 * @throws 读取失败时抛中文原因（不回退默认，避免用户设置被静默覆盖）。
 */
export async function readSettings(): Promise<PluginSettings> {
  const raw = await readMeta<unknown>('settings')
  return mergeSettings(raw)
}

/**
 * 局部写入设置并返回合并后的完整设置。
 * @param patch 只覆盖给出的字段。
 * @returns 写入后的完整设置。
 * @throws 读写失败时抛中文原因。
 */
export async function writeSettings(patch: Partial<PluginSettings>): Promise<PluginSettings> {
  const current = await readSettings()
  const next = mergeSettings({ ...current, ...patch })
  await writeMeta('settings', next)
  return next
}

/**
 * 标记数据库 schema 版本（首次建库时写入）。
 * @throws 写入失败时抛中文原因。
 */
export async function ensureSchemaVersion(): Promise<void> {
  const existing = await readMeta<number>('schemaVersion')
  if (existing === DB_VERSION) return
  await writeMeta('schemaVersion', DB_VERSION)
}

/** 清理当前连接缓存；仅供测试在两库之间切换时使用。 */
export function closeDb(): void {
  const pending = dbPromise
  dbPromise = undefined
  if (pending) {
    void pending.then(
      db => db.close(),
      () => {
        /* 打开已失败，无连接可关 */
      },
    )
  }
}
