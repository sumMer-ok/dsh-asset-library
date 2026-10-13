/**
 * 素材库冻结契约（计划 §4）。S2 与 S3 以本文件签名为准，不得增删字段。
 */

/** 素材大类。 */
export type AssetKind = 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other'

/** 素材磁盘可达状态；`missing` 表示外链路径已不可用，需要重新定位。 */
export type AssetStatus = 'ok' | 'missing'

/** 一条素材的完整记录；原始字节不入库，`path` 是唯一外链凭据。 */
export interface AssetRecord {
  id: string
  path: string
  name: string
  ext: string
  kind: AssetKind
  mediaType: string
  size: number
  width?: number
  height?: number
  durationMs?: number
  hash: string
  cheap: string
  thumb: Blob
  thumbWidth: number
  thumbHeight: number
  dominantColor: string
  tags: string[]
  favorite: boolean
  rating: 0 | 1 | 2 | 3 | 4 | 5
  status: AssetStatus
  importedAt: number
  lastCheckedAt: number
  sourceSessionId?: string
}

/** 缩略图生成结果。 */
export interface ThumbResult {
  blob: Blob
  width: number
  height: number
  dominantColor: string
}

/** 单文件导入状态机的阶段。 */
export type ImportPhase = 'queued' | 'hashing' | 'thumb' | 'writing' | 'done' | 'duplicate' | 'failed'

/** 推给 UI 的导入进度事件。 */
export interface ImportEvent {
  path: string
  name: string
  phase: ImportPhase
  error?: string
}

/** 画廊筛选与排序条件。 */
export interface Query {
  text: string
  kinds: AssetKind[]
  tags: string[]
  favoriteOnly: boolean
  minRating: 0 | 1 | 2 | 3 | 4 | 5
  from: number | null
  to: number | null
  sort: 'importedAt' | 'name' | 'size' | 'rating'
  desc: boolean
}

/** 用户可调设置，持久化在 IndexedDB 的 `meta.settings`。 */
export interface PluginSettings {
  thumbMaxEdge: number
  thumbQuality: number
  maxImportBytes: number
  routeMaxBytes: number
  videoSeekRatio: number
  videoTimeoutMs: number
  /** 壁纸在 `wallpaper` store 中的键；`null` 表示没有自定义壁纸（用默认墙面）。 */
  wallpaperKey: string | null
  /** 壁纸遮罩强度（百分比，0–90）；读取时超界会被钳制回区间。 */
  wallpaperMask: number
  /** 「策展筛选」是否展开；展开态跨会话保留。 */
  curationOpen: boolean
}
