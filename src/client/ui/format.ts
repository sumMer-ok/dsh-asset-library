/**
 * Pure presentation helpers shared by the gallery, cards, and overlays.
 *
 * Everything here is a total function over persisted values: asset records are
 * read back from IndexedDB and may carry fields written by an older build, so
 * no helper may throw or return `undefined` for an unexpected input.
 */

import { fileUrl } from '../data/route.ts'

/**
 * Format a byte count for display.
 * @param bytes - Size in bytes; negative or non-finite input renders as `—`.
 * @returns A compact string such as `1.4 MB`.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`
}

/**
 * Format an import timestamp as a local calendar date.
 * @param ms - Epoch milliseconds.
 * @returns A `YYYY-MM-DD` string, or `—` when the value is not a finite number.
 */
export function formatDate(ms: number): string {
  if (!Number.isFinite(ms)) return '—'
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) return '—'
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Format a media duration.
 * @param ms - Duration in milliseconds.
 * @returns `m:ss` (or `h:mm:ss`), or `—` when absent or not finite.
 */
export function formatDuration(ms: number | undefined): string {
  if (ms === undefined || !Number.isFinite(ms) || ms < 0) return '—'
  const total = Math.round(ms / 1000)
  const seconds = total % 60
  const minutes = Math.floor(total / 60) % 60
  const hours = Math.floor(total / 3600)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`
}

/**
 * Describe an asset's pixel dimensions.
 * @param width - Pixel width when known.
 * @param height - Pixel height when known.
 * @returns `1920 × 1080`, `1920 × ?`, or `—` when neither side is known.
 */
export function formatDimensions(width: number | undefined, height: number | undefined): string {
  const w = Number.isFinite(width) ? width : undefined
  const h = Number.isFinite(height) ? height : undefined
  if (w === undefined && h === undefined) return '—'
  return `${w ?? '?'} × ${h ?? '?'}`
}

/** Tallest media box a card may reserve, so a very tall image cannot own the viewport. */
export const MAX_CARD_MEDIA = 640
/** Shortest media box a card may reserve, so a panorama still reads as a card. */
export const MIN_CARD_MEDIA = 96

/**
 * Compute the media box a card reserves for one aspect ratio.
 *
 * This is the single clamp shared by the card, the layout, and the grid
 * fallback: a second implementation would let the reserved height drift from the
 * rendered height and reflow the masonry as thumbnails decode.
 * @param columnWidth - Width the card occupies in CSS pixels.
 * @param aspect - Width divided by height; non-positive input falls back to 4:3.
 * @returns The media box height in CSS pixels.
 */
export function mediaBoxHeight(columnWidth: number, aspect: number): number {
  const ratio = Number.isFinite(aspect) && aspect > 0 ? aspect : 4 / 3
  const height = Math.round(columnWidth / ratio)
  if (!Number.isFinite(height) || height <= 0) return Math.round(columnWidth * 0.75)
  return Math.min(Math.max(height, MIN_CARD_MEDIA), MAX_CARD_MEDIA)
}

/**
 * Compute the rendered box for a thumbnail, preserving the asset aspect ratio.
 *
 * The returned height is derived only from stored numbers, never from a decoded
 * image, so a card keeps its exact size while the bitmap is still loading and
 * the masonry layout never shifts.
 * @param asset - The stored width/height and thumbnail dimensions.
 * @param columnWidth - Width the card will occupy, in CSS pixels.
 * @returns The box height in CSS pixels, clamped to a sane exhibition range.
 */
export function thumbBoxHeight(
  asset: { width?: number; height?: number; thumbWidth: number; thumbHeight: number },
  columnWidth: number,
): number {
  return mediaBoxHeight(columnWidth, aspectRatio(asset))
}

/**
 * Derive an asset's aspect ratio from the most trustworthy stored numbers.
 * @param asset - The stored width/height and thumbnail dimensions.
 * @returns A finite ratio `> 0`, defaulting to 4:3 when nothing usable is stored.
 */
export function aspectRatio(asset: {
  width?: number
  height?: number
  thumbWidth: number
  thumbHeight: number
}): number {
  const candidates: Array<[number | undefined, number | undefined]> = [
    [asset.width, asset.height],
    [asset.thumbWidth, asset.thumbHeight],
  ]
  for (const [w, h] of candidates) {
    if (w !== undefined && h !== undefined && Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      return w / h
    }
  }
  return 4 / 3
}

/**
 * Parse a hexadecimal colour into an `rgb()` string usable behind a thumbnail.
 * @param color - A `#rrggbb` / `#rgb` string from the thumbnail pipeline.
 * @returns An `rgb(r, g, b)` string, or `transparent` when unparseable.
 */
export function placeholderColor(color: string | undefined): string {
  if (typeof color !== 'string') return 'transparent'
  const hex = color.trim().replace(/^#/, '')
  const full = hex.length === 3 ? hex.replace(/./g, c => c + c) : hex
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return 'transparent'
  const value = Number.parseInt(full, 16)
  return `rgb(${(value >> 16) & 0xff}, ${(value >> 8) & 0xff}, ${value & 0xff})`
}

/**
 * Build the origin-relative URL of the host's Range file route.
 *
 * The route is registered by the plugin's host half on the connection's `/api`
 * bridge, which the desktop carrier reaches from the renderer without knowing
 * the port. One constant lives in the data layer so the panel, the lightbox,
 * the store's HEAD probe, and the chat reference all read the same path.
 * @param path - Host absolute path of the referenced file.
 * @returns A relative URL carrying the encoded path in its `path` query.
 */
export function fileRouteUrl(path: string): string {
  return fileUrl(path)
}
