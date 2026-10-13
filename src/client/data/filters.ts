import type { AssetKind, AssetRecord, Query } from './types.ts'

/**
 * 筛选、排序、高亮与自动标签（计划 §4/§10）。
 * 扩展名分类表按计划 §10 的清单写全（图片/视频/音频/文档/压缩包）。
 */

/** 扩展名 → 素材类型。 */
const EXT_KIND: Record<string, AssetKind> = {
  // 图片
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  webp: 'image',
  gif: 'image',
  svg: 'image',
  bmp: 'image',
  avif: 'image',
  heic: 'image',
  ico: 'image',
  // 视频
  mp4: 'video',
  webm: 'video',
  mov: 'video',
  m4v: 'video',
  avi: 'video',
  mkv: 'video',
  // 音频
  mp3: 'audio',
  wav: 'audio',
  m4a: 'audio',
  aac: 'audio',
  flac: 'audio',
  ogg: 'audio',
  // 文档
  pdf: 'document',
  doc: 'document',
  docx: 'document',
  xls: 'document',
  xlsx: 'document',
  ppt: 'document',
  pptx: 'document',
  md: 'document',
  txt: 'document',
  csv: 'document',
  json: 'document',
  rtf: 'document',
  // 压缩包
  zip: 'archive',
  tar: 'archive',
  gz: 'archive',
  tgz: 'archive',
  bz2: 'archive',
  xz: 'archive',
  '7z': 'archive',
  rar: 'archive',
}

/** 扩展名 → MIME（不依赖 mime-types 包，客户端只有这张表）。 */
const EXT_MEDIA_TYPE: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  avif: 'image/avif',
  heic: 'image/heic',
  ico: 'image/x-icon',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  avi: 'video/x-msvideo',
  mkv: 'video/x-matroska',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  md: 'text/markdown',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
  rtf: 'application/rtf',
  zip: 'application/zip',
  tar: 'application/x-tar',
  gz: 'application/gzip',
  tgz: 'application/gzip',
  bz2: 'application/x-bzip2',
  xz: 'application/x-xz',
  '7z': 'application/x-7z-compressed',
  rar: 'application/vnd.rar',
}

/** 取小写、无点的扩展名（无扩展名返回空串）。 */
export function extOf(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot <= 0 || dot === name.length - 1) return ''
  return name.slice(dot + 1).toLowerCase()
}

/**
 * 按扩展名判定素材类型。
 * @param name 文件名（大小写不敏感）。
 * @returns 无扩展名或未收录的扩展名一律 `other`。
 */
export function kindForName(name: string): AssetKind {
  return EXT_KIND[extOf(name)] ?? 'other'
}

/**
 * 按扩展名给出 MIME。
 * @param name 文件名。
 * @param fallback 未收录时的兜底（默认 `application/octet-stream`）。
 * @returns MIME 字符串。
 */
export function mediaTypeFor(name: string, fallback = 'application/octet-stream'): string {
  return EXT_MEDIA_TYPE[extOf(name)] ?? fallback
}

/** 大文件档阈值（100MB）与中文件档阈值（10MB）。 */
const LARGE_BYTES = 100 * 1024 * 1024
const MEDIUM_BYTES = 10 * 1024 * 1024

/**
 * 自动标签：扩展名 + 类型 + 大小档 + 年月。
 * @param asset 至少含 ext/kind/size/importedAt。
 * @returns 去重后的标签数组（去掉空串）。
 */
export function autoTags(a: Pick<AssetRecord, 'ext' | 'kind' | 'size' | 'importedAt'>): string[] {
  const tags: string[] = []
  const ext = (a.ext || '').toLowerCase().replace(/^\./, '')
  if (ext) tags.push(ext)
  if (a.kind) tags.push(a.kind)
  if (a.size >= LARGE_BYTES) tags.push('大文件')
  else if (a.size >= MEDIUM_BYTES) tags.push('中等文件')
  const date = new Date(a.importedAt)
  if (!Number.isNaN(date.getTime())) {
    const month = String(date.getMonth() + 1).padStart(2, '0')
    tags.push(`${date.getFullYear()}-${month}`)
  }
  return [...new Set(tags.filter(t => t.length > 0))]
}

/** 文本命中判定：名称、标签、扩展名（大小写不敏感）。 */
function matchesText(asset: AssetRecord, needle: string): boolean {
  if (!needle) return true
  const q = needle.toLowerCase()
  if (asset.name.toLowerCase().includes(q)) return true
  if ((asset.ext || '').toLowerCase().includes(q)) return true
  return asset.tags.some(tag => tag.toLowerCase().includes(q))
}

/** 时间范围归一化：`from`/`to` 均为闭区间毫秒时间戳。 */
function inTimeRange(asset: AssetRecord, from: number | null, to: number | null): boolean {
  if (from !== null && asset.importedAt < from) return false
  if (to !== null && asset.importedAt > to) return false
  return true
}

/**
 * 单条素材是否满足查询（文本 × 类型 × 时间 × 标签 × 收藏 × 评分）。
 * @param a 素材记录。
 * @param q 查询条件。
 * @returns 命中为 true。
 */
export function matchAsset(a: AssetRecord, q: Query): boolean {
  if (!matchesText(a, q.text.trim())) return false
  if (q.kinds.length > 0 && !q.kinds.includes(a.kind)) return false
  if (q.tags.length > 0 && !q.tags.some(tag => a.tags.includes(tag))) return false
  if (q.favoriteOnly && !a.favorite) return false
  if (a.rating < q.minRating) return false
  return inTimeRange(a, q.from, q.to)
}

/** 名称排序用：带数字的自然序（`图2` 排在 `图10` 前）。 */
const collator = new Intl.Collator('zh-Hans-CN', { numeric: true, sensitivity: 'base' })

/** 比较两条素材，返回升序结果。 */
function compare(a: AssetRecord, b: AssetRecord, sort: Query['sort']): number {
  switch (sort) {
    case 'name':
      return collator.compare(a.name, b.name)
    case 'size':
      return a.size - b.size
    case 'rating':
      return a.rating - b.rating
    case 'importedAt':
    default:
      return a.importedAt - b.importedAt
  }
}

/**
 * 过滤 + 排序；返回新数组，不改动入参。
 * @param list 素材列表。
 * @param q 查询条件；`desc` 为 true 时反转排序。
 * @returns 排序后的命中列表。
 */
export function applyQuery(list: AssetRecord[], q: Query): AssetRecord[] {
  const hits = list.filter(a => matchAsset(a, q))
  hits.sort((a, b) => (q.desc ? -compare(a, b, q.sort) : compare(a, b, q.sort)))
  return hits
}

/**
 * 找出 `query` 在 `text` 中的所有命中区间（大小写不敏感、中文按 code unit 计数）。
 * 区间为 `[start, end)`，按起点升序，互不重叠；重叠命中会合并为较大区间。
 * @param text 待高亮文本（通常是文件名或标签）。
 * @param query 搜索词；空串返回空数组。
 * @returns 命中区间数组。
 */
export function highlightRanges(text: string, query: string): Array<[number, number]> {
  const needle = query.trim()
  if (!needle || !text) return []
  const haystack = text.toLowerCase()
  const lowerNeedle = needle.toLowerCase()
  const ranges: Array<[number, number]> = []
  let from = 0
  let cursor = 0
  for (;;) {
    const found = haystack.indexOf(lowerNeedle, from)
    if (found < 0) break
    const end = found + lowerNeedle.length
    if (found >= cursor) {
      ranges.push([found, end])
      cursor = end
    }
    from = found + 1 // 允许重叠命中（如 `aa` 在 `aaa` 中）
  }
  return ranges
}
