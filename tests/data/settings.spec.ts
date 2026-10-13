import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../../src/client/data/settings.ts'
import type { PluginSettings } from '../../src/client/data/types.ts'

/**
 * 设置项的读写规格。
 *
 * 这里的核心是一条**自动防漏**用例：它按字段类型为 `DEFAULT_SETTINGS` 的**每一个**键造探针值并往返，
 * 所以任何新增设置字段只要没在 `db.ts` 的 `mergeSettings` 里登记类型，就会在这里失败——
 * 不依赖作者记得补注释或补断言。
 */

type DbModule = typeof import('../../src/client/data/db.ts')

/** 每个用例全新的模块 + 全新的库（模块内缓存连接，必须重置）。 */
async function loadDb(): Promise<DbModule> {
  vi.resetModules()
  globalThis.indexedDB = new (await import('fake-indexeddb')).IDBFactory()
  return import('../../src/client/data/db.ts')
}

/** 按默认值的类型造一个「与默认值不同且类型正确」的探针值。 */
function probeFor(key: keyof PluginSettings): unknown {
  const fallback = DEFAULT_SETTINGS[key]
  if (typeof fallback === 'number') return key === 'wallpaperMask' ? 60 : 4242
  if (typeof fallback === 'boolean') return !fallback
  if (fallback === null) return 'probe-wallpaper-key'
  return 'probe-string'
}

describe('设置：默认值、往返与防漏', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('每个默认字段都能写入并原样读回（新增字段漏登记会被这条用例抓住）', async () => {
    const db = await loadDb()
    const probe = Object.fromEntries(
      (Object.keys(DEFAULT_SETTINGS) as Array<keyof PluginSettings>).map(key => [key, probeFor(key)]),
    ) as unknown as PluginSettings

    const written = await db.writeSettings(probe)
    expect(written).toEqual(probe)
    expect(await db.readSettings()).toEqual(probe)
  })

  it('无记录时返回全部默认值（含新增三项）', async () => {
    const db = await loadDb()
    expect(await db.readSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('壁纸键与策展筛选展开态按类型校验：类型不符回退默认', async () => {
    const db = await loadDb()
    await db.writeMeta('settings', { wallpaperKey: 42, curationOpen: 'yes' })
    const merged = await db.readSettings()
    expect(merged.wallpaperKey).toBeNull()
    expect(merged.curationOpen).toBe(false)
  })

  it('空字符串壁纸键视为未设置', async () => {
    const db = await loadDb()
    await db.writeMeta('settings', { wallpaperKey: '' })
    expect((await db.readSettings()).wallpaperKey).toBeNull()
  })

  it('遮罩强度越界被钳制回 0–90，而不是丢弃或原样保留', async () => {
    const db = await loadDb()
    await db.writeMeta('settings', { wallpaperMask: 999 })
    expect((await db.readSettings()).wallpaperMask).toBe(90)
    await db.writeMeta('settings', { wallpaperMask: -5 })
    expect((await db.readSettings()).wallpaperMask).toBe(0)
    await db.writeMeta('settings', { wallpaperMask: 35.4 })
    expect((await db.readSettings()).wallpaperMask).toBe(35)
  })

  it('只改给出项：其余字段保持已存值', async () => {
    const db = await loadDb()
    await db.writeSettings({ wallpaperMask: 80, curationOpen: true })
    const after = await db.writeSettings({ thumbQuality: 0.3 })
    expect(after.thumbQuality).toBe(0.3)
    expect(after.wallpaperMask).toBe(80)
    expect(after.curationOpen).toBe(true)
  })
})
