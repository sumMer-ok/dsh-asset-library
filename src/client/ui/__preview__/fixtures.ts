/**
 * Fake library data for the standalone preview harness.
 *
 * Nothing here ships: the preview mounts the real panel against a synthetic
 * store so the gallery, toolbar, and overlays can be exercised without
 * IndexedDB, the host file route, or the plugin loader. Thumbnails are real
 * canvas-produced PNG blobs so the cards decode actual bitmaps.
 */
import type { AssetKind, AssetRecord, PluginSettings } from '../data/types'

/** Aspect ratios cycled through the fixtures, so the masonry stays ragged. */
const ASPECTS: Array<[number, number]> = [
  [1600, 1200],
  [1080, 1920],
  [2400, 900],
  [1200, 1200],
  [1920, 1080],
  [900, 1600],
  [2048, 1365],
  [1000, 1000],
]

/** Kind cycle for the fixtures. */
const KINDS: AssetKind[] = ['image', 'image', 'video', 'image', 'document', 'audio', 'image', 'archive']

/** Palette the generated thumbnails draw from. */
const COLORS = ['#3f6ea8', '#a8563f', '#4f8a63', '#8a6aa8', '#a8903f', '#3f8a8a', '#a83f6e', '#5a5f6b']

/** Names that exercise the search highlighting, including a multi-hit case. */
const NAMES = [
  'hero-banner-final',
  'hero-banner-draft',
  '展厅-平面图-v3',
  'logo-mark-颜色',
  'product-shot-01',
  'product-shot-02',
  'promo-clip-15s',
  '采访录音-第一段',
  'contract-2026.pdf',
  'brand-assets.zip',
  'screenshot-hero-宽屏',
  '展厅-banner-夜间',
  'texture-paper',
  'portrait-team-a',
  'portrait-team-b',
  'diagram-flow',
  'icon-set-outline',
  'mockup-laptop',
  '背景纹理-banner',
  'archive-旧版-hero',
]

/**
 * Build one synthetic asset record.
 * @param index - Zero-based fixture index.
 * @returns A record shaped exactly like a stored one.
 */
export function makeAsset(index: number): AssetRecord {
  const [width, height] = ASPECTS[index % ASPECTS.length] as [number, number]
  const kind = KINDS[index % KINDS.length] as AssetKind
  const name = `${NAMES[index % NAMES.length]}.${kind === 'video' ? 'mp4' : kind === 'document' ? 'pdf' : 'png'}`
  const thumb = makeThumb(index, width, height)
  const tags = [
    kind,
    index % 3 === 0 ? 'banner' : 'gallery',
    index % 4 === 0 ? 'hero' : 'draft',
    ...(index % 5 === 0 ? ['夜间'] : []),
  ]
  return {
    id: `preview-${index}`,
    path: `/Users/preview/Pictures/${name}`,
    name,
    ext: kind === 'video' ? 'mp4' : kind === 'document' ? 'pdf' : 'png',
    kind,
    mediaType: kind === 'video' ? 'video/mp4' : 'image/png',
    size: 180_000 + index * 41_337,
    width,
    height,
    durationMs: kind === 'video' || kind === 'audio' ? 15_000 + index * 1000 : undefined,
    hash: `hash-${index}`.padEnd(64, '0'),
    cheap: `cheap-${index}`,
    thumb: thumb.blob,
    thumbWidth: thumb.width,
    thumbHeight: thumb.height,
    dominantColor: COLORS[index % COLORS.length] as string,
    tags,
    favorite: index % 6 === 0,
    rating: ((index % 6) as 0 | 1 | 2 | 3 | 4 | 5),
    // Two fixtures read as missing so the recheck affordance and the missing
    // badge are both visible.
    status: index % 9 === 7 ? 'missing' : 'ok',
    importedAt: Date.now() - index * 86_400_000 * 2,
    lastCheckedAt: Date.now(),
  }
}

/**
 * Build a real PNG blob for a fixture, drawn at the thumbnail's own ratio.
 * @param index - Fixture index, used to pick the colour.
 * @param width - Nominal source width.
 * @param height - Nominal source height.
 * @returns The blob plus its pixel dimensions.
 */
export function makeThumb(
  index: number,
  width: number,
  height: number,
): { blob: Blob; width: number; height: number } {
  return makeThumbWithColor(COLORS[index % COLORS.length] as string, width, height, index)
}

/**
 * Build a thumbnail in one specific colour.
 * @param color - Fill colour of the generated picture.
 * @param width - Nominal source width.
 * @param height - Nominal source height.
 * @param label - Number drawn on the picture.
 * @returns The blob plus its pixel dimensions.
 */
export function makeThumbWithColor(
  color: string,
  width: number,
  height: number,
  label: number,
): { blob: Blob; width: number; height: number } {
  const maxEdge = 512
  const scale = maxEdge / Math.max(width, height)
  const thumbWidth = Math.max(1, Math.round(width * scale))
  const thumbHeight = Math.max(1, Math.round(height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = thumbWidth
  canvas.height = thumbHeight
  const context = canvas.getContext('2d')
  if (context !== null) {
    context.fillStyle = color
    context.fillRect(0, 0, thumbWidth, thumbHeight)
    context.fillStyle = 'rgba(255,255,255,0.22)'
    context.beginPath()
    context.arc(thumbWidth * 0.7, thumbHeight * 0.35, Math.min(thumbWidth, thumbHeight) * 0.22, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = 'rgba(0,0,0,0.28)'
    context.font = `${Math.round(Math.min(thumbWidth, thumbHeight) * 0.18)}px sans-serif`
    context.fillText(String(label + 1), thumbWidth * 0.06, thumbHeight * 0.9)
  }
  // `toBlob` is synchronous enough for a harness; canvas always yields a PNG.
  const blob = dataUrlToBlob(canvas.toDataURL('image/png'))
  return { blob, width: thumbWidth, height: thumbHeight }
}

/**
 * Convert a canvas data URL into a binary blob.
 * @param dataUrl - `data:image/png;base64,...` from the canvas.
 * @returns The decoded PNG blob.
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, payload] = dataUrl.split(',')
  const mime = /:(.*?);/.exec(header ?? '')?.[1] ?? 'image/png'
  const binary = atob(payload ?? '')
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new Blob([bytes], { type: mime })
}

/** Number of fixtures the preview builds by default. */
export const PREVIEW_COUNT = 20

/**
 * One hand-built record that forces a card's degraded path.
 *
 * The preview exists to make the awkward states visible in a screenshot, so the
 * first records of every library are these rather than more pleasant tiles.
 */
export interface PreviewSpecial {
  /** Stable id suffix. */
  key: string
  /** File name shown on the card. */
  name: string
  /** Nominal source size in bytes. */
  size: number
  /** Nominal source dimensions. */
  width: number
  /** Nominal source dimensions. */
  height: number
  /** Thumbnail colour. */
  color: string
  /** Stored reachability state. */
  status?: 'ok' | 'missing'
  /** Directory the fake path points at (the harness server keys behaviour off it). */
  directory?: string
}

/**
 * The degraded cases every preview library starts with: a picture past the
 * original cap, a picture whose original cannot be read, a very light picture
 * (the button-contrast case), and a record whose source is gone.
 */
export const PREVIEW_SPECIALS: readonly PreviewSpecial[] = [
  { key: 'oversized', name: 'huge-panorama-96mb.png', size: 96 * 1024 * 1024, width: 12000, height: 4000, color: '#c9b8a1' },
  { key: 'unreadable', name: 'source-moved-away.png', size: 2_400_000, width: 1600, height: 1000, color: '#8ba0b5', directory: 'Broken' },
  { key: 'light', name: 'white-wall-sample.png', size: 900_000, width: 1600, height: 1200, color: '#f2efe9', directory: 'Light' },
  { key: 'missing', name: 'archived-scan.png', size: 1_200_000, width: 1200, height: 1600, color: '#b9c3cc', status: 'missing' },
]

/**
 * Build one degraded-case record.
 * @param special - The case to build.
 * @param index - Position in the library, used for the thumbnail.
 * @returns A record shaped exactly like a stored one.
 */
function makeSpecialAsset(special: PreviewSpecial, index: number): AssetRecord {
  const thumb = makeThumbWithColor(special.color, special.width, special.height, index)
  const directory = special.directory ?? 'Pictures'
  return {
    id: `preview-${special.key}`,
    path: `/Users/preview/${directory}/${special.name}`,
    name: special.name,
    ext: 'png',
    kind: 'image',
    mediaType: 'image/png',
    size: special.size,
    width: special.width,
    height: special.height,
    hash: `hash-${special.key}`.padEnd(64, '0'),
    cheap: `cheap-${special.key}`,
    thumb: thumb.blob,
    thumbWidth: thumb.width,
    thumbHeight: thumb.height,
    dominantColor: special.color,
    tags: ['preview', special.key],
    favorite: false,
    rating: 3,
    status: special.status ?? 'ok',
    importedAt: Date.now() - index * 3_600_000,
    lastCheckedAt: Date.now(),
  }
}

/**
 * Build the preview library.
 *
 * The first records are the degraded cases from {@link PREVIEW_SPECIALS}, so a
 * screenshot of any size always includes them.
 * @param count - How many records to synthesize.
 * @returns The fixtures in display order.
 */
export function makeLibrary(count: number = PREVIEW_COUNT): AssetRecord[] {
  const base = Array.from({ length: count }, (_, index) => makeAsset(index))
  if (count <= PREVIEW_SPECIALS.length) {
    // Too small to hold both sets: the degraded cases are the point of the harness.
    return PREVIEW_SPECIALS.slice(0, count).map((special, index) => makeSpecialAsset(special, index))
  }
  const specials = PREVIEW_SPECIALS.map((special, index) => makeSpecialAsset(special, index))
  return [...specials, ...base.slice(specials.length)]
}

/**
 * Draw a wallpaper-sized picture for the harness.
 *
 * A data URL keeps the preview free of external assets; the panel only needs a
 * URL to paint as the wall's background.
 * @returns A PNG data URL of a generated wallpaper.
 */
export function makeWallpaperDataUrl(): string {
  const width = 1600
  const height = 1000
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (context === null) return ''
  const wash = context.createLinearGradient(0, 0, width, height)
  wash.addColorStop(0, '#dfe6ef')
  wash.addColorStop(0.5, '#f3ece1')
  wash.addColorStop(1, '#e2e8f0')
  context.fillStyle = wash
  context.fillRect(0, 0, width, height)
  context.strokeStyle = 'rgba(90,105,130,0.35)'
  context.lineWidth = 2
  for (let x = -height; x < width; x += 68) {
    context.beginPath()
    context.moveTo(x, height)
    context.lineTo(x + height, 0)
    context.stroke()
  }
  context.fillStyle = 'rgba(120,95,150,0.20)'
  context.beginPath()
  context.arc(width * 0.72, height * 0.3, Math.min(width, height) * 0.3, 0, Math.PI * 2)
  context.fill()
  return canvas.toDataURL('image/png')
}

/** Settings the preview reports, matching the plugin defaults. */
export const PREVIEW_SETTINGS: PluginSettings = {
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
