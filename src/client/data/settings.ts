import type { PluginSettings } from './types.ts'

/** 设置默认值（计划 §4）；`readSettings()` 用它补齐 `meta.settings` 的缺失项。 */
export const DEFAULT_SETTINGS: PluginSettings = {
  thumbMaxEdge: 512,
  thumbQuality: 0.85,
  maxImportBytes: 2 * 1024 * 1024 * 1024,
  routeMaxBytes: 64 * 1024 * 1024,
  videoSeekRatio: 0.1,
  videoTimeoutMs: 4000,
  wallpaperKey: null,
  wallpaperMask: 35,
  curationOpen: false,
}
