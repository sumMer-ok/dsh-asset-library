/**
 * Pure masonry geometry plus the optional-dependency channel for `masonic`.
 *
 * Kept free of JSX so it can be imported by the renderer, by tests, and by the
 * preview harness alike; every React element lives in `MasonryGrid.tsx`.
 *
 * `masonic` is an optional dependency, so a static import would break the client
 * bundle on a machine without network access. The dynamic import is cached for
 * the process lifetime instead, and the renderer is mounted only once that cache
 * has resolved.
 */
import { mediaBoxHeight } from './format'

/** Which renderer a layout verdict selected. */
export type MasonryVariant = 'virtualized' | 'grid'

/** Geometry every part of the gallery reads from one place. */
export interface MasonryGeometry {
  /** `virtualized` renders through `masonic`; `grid` is the fallback. */
  variant: MasonryVariant
  /** Column count at the measured container width. */
  columnCount: number
  /** Rendered width of one column in CSS pixels. */
  columnWidth: number
  /** Gap between cards in CSS pixels. */
  gutter: number
  /** Scroll height the virtualised renderer needs; `0` for the grid fallback. */
  totalHeight: number
}

/** Smallest container width the gallery lays out. */
const MIN_LAYOUT_WIDTH = 120

/** The `masonic` entry points this module uses. */
export interface MasonryModule {
  /** Virtualising grid hook. */
  useMasonry: (options: Record<string, unknown>) => JSX.Element
  /** Column positioner hook. */
  usePositioner: (options: Record<string, unknown>) => unknown
  /** Cell resize observer hook. */
  useResizeObserver: (positioner: unknown) => ResizeObserver
}

let cachedMasonry: MasonryModule | null | undefined
let masonryPromise: Promise<MasonryModule | null> | undefined

/**
 * Resolve `masonic` once per process, tolerating its absence.
 * @returns The module, or `null` when the optional dependency is not installed.
 */
export async function loadMasonry(): Promise<MasonryModule | null> {
  if (cachedMasonry !== undefined) return cachedMasonry
  masonryPromise ??= (async (): Promise<MasonryModule | null> => {
    try {
      const module = (await import('masonic')) as unknown as Partial<MasonryModule>
      if (
        typeof module.useMasonry !== 'function'
        || typeof module.usePositioner !== 'function'
        || typeof module.useResizeObserver !== 'function'
      ) {
        return null
      }
      return module as MasonryModule
    } catch {
      // The only reachable failure is an absent optional dependency: this import
      // appears nowhere else in the bundle, so nothing else can reject here.
      return null
    }
  })()
  cachedMasonry = await masonryPromise
  return cachedMasonry
}

/**
 * Read the cached `masonic` verdict without triggering a load.
 * @returns `undefined` while undecided, otherwise the module or `null`.
 */
export function peekMasonry(): MasonryModule | null | undefined {
  return cachedMasonry
}

/**
 * Split a container width into equal columns.
 *
 * Exported because the height calculation and the virtualised renderer must
 * agree exactly on the column width; a second implementation would drift.
 * @param width - Container content width in CSS pixels.
 * @param minColumnWidth - Preferred minimum column width.
 * @param gutter - Horizontal gap between columns.
 * @param maxColumnCount - Upper bound on column count.
 * @returns The column count and the resulting column width.
 */
export function splitColumns(
  width: number,
  minColumnWidth: number,
  gutter: number,
  maxColumnCount: number,
): { columnCount: number; columnWidth: number } {
  if (!Number.isFinite(width) || width <= 0) {
    return { columnCount: 1, columnWidth: Math.max(MIN_LAYOUT_WIDTH, minColumnWidth) }
  }
  const desired = Math.floor((width + gutter) / (Math.max(minColumnWidth, 1) + gutter))
  const columnCount = Math.max(1, Math.min(desired, Math.max(1, maxColumnCount)))
  const columnWidth = Math.floor((width - gutter * (columnCount - 1)) / columnCount)
  return { columnCount, columnWidth: Math.max(1, columnWidth) }
}

/**
 * Clamp one card's media box height to the exhibition range.
 *
 * Delegates to the shared clamp so the reserved height can never disagree with
 * what the card actually renders.
 * @param columnWidth - Rendered column width in CSS pixels.
 * @param aspect - Width divided by height, from stored metadata.
 * @returns The media box height in CSS pixels.
 */
export function mediaHeight(columnWidth: number, aspect: number): number {
  return mediaBoxHeight(columnWidth, aspect)
}

/**
 * Reserve scroll height for a virtualised grid before it has measured itself.
 *
 * The renderer replaces this with its own measured height, so this value only has
 * to be close enough to keep the scrollbar from jumping.
 * @param heights - One card height per item, already including the footer.
 * @param columnCount - Column count.
 * @param gutter - Vertical gap between cards.
 * @returns The tallest column's height in CSS pixels.
 */
export function estimateTotalHeight(
  heights: number[],
  columnCount: number,
  gutter: number,
): number {
  if (heights.length === 0) return 0
  const columns = Math.max(1, columnCount)
  const totals = new Array<number>(columns).fill(0)
  heights.forEach((height, index) => {
    const column = index % columns
    totals[column] = (totals[column] ?? 0) + height + gutter
  })
  return Math.max(0, Math.max(...totals) - gutter)
}
