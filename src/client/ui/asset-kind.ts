/**
 * Presentation metadata for {@link AssetKind} values.
 *
 * The kind union itself is owned by the frozen data contract in
 * `../data/types.ts`; this module adds only the labels and glyphs the UI needs
 * and exports a keyed list so components can iterate without naming kinds.
 */

/** Every `AssetKind` the data layer can produce, in toolbar order. */
export const ASSET_KINDS = [
  'image',
  'video',
  'audio',
  'document',
  'archive',
  'other',
] as const

/** Short Chinese labels for the type chips and type badges. */
export const KIND_LABEL: Record<string, string> = {
  image: '图片',
  video: '视频',
  audio: '音频',
  document: '文档',
  archive: '压缩包',
  other: '其它',
}

/** One glyph per kind, embedded as text so no icon font is required. */
const KIND_GLYPH: Record<string, string> = {
  image: '🖼',
  video: '🎬',
  audio: '🎵',
  document: '📄',
  archive: '🗜',
  other: '📦',
}

/**
 * Read a kind's label.
 * @param kind - Asset kind, or an unexpected string from persisted data.
 * @returns The Chinese label, falling back to the raw kind.
 */
export function kindLabel(kind: string): string {
  return KIND_LABEL[kind] ?? kind
}

/**
 * Read a kind's badge glyph.
 * @param kind - Asset kind, or an unexpected string from persisted data.
 * @returns The glyph, falling back to the generic box.
 */
export function kindGlyph(kind: string): string {
  return KIND_GLYPH[kind] ?? '📦'
}
