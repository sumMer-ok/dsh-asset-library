/**
 * The gallery surface: scroll container, masonry layout, cards, and the
 * overlays that belong to one card (lightbox and overflow menu).
 *
 * Selection semantics live here because they depend on display order: a plain
 * click opens the asset, ⌘/Ctrl click toggles it, and Shift click extends from
 * the last touched card. The selection and anchor are mirrored into refs so the
 * memoised card renderer always reads the current values.
 */
import { useCallback, useMemo, useRef, useState } from 'react'
import type { AssetRecord, Query } from '../data/types'
import { AssetCard, cardMediaHeight } from './AssetCard'
import { CardMenu } from './CardMenu'
import { Lightbox } from './Lightbox'
import { EmptyState, ErrorState, LoadingState } from './States'
import { CssMasonryGrid, useMasonryLayout } from './MasonryGrid'
import styles from './Gallery.module.css'

/** Preferred minimum column width for the exhibition layout. */
export const MIN_COLUMN_WIDTH = 220
/** Maximum columns, so a wide window keeps exhibition-scale cards. */
export const MAX_COLUMN_COUNT = 4
/** Gap between cards, horizontal and vertical. */
export const GRID_GUTTER = 22
/** Height a card adds below its media box: border, padding, and the footer row. */
const FOOTER_HEIGHT = 40
/** Full-resolution cap used when the caller does not supply one; mirrors `routeMaxBytes`. */
export const DEFAULT_ORIGINAL_CAP = 64 * 1024 * 1024
/** Wallpaper mask strength used when the caller does not supply one, in percent. */
export const DEFAULT_WALLPAPER_MASK = 35
/** Mask bounds, in percent. */
const MASK_MIN = 0
const MASK_MAX = 90

/** Props for {@link Gallery}. */
export interface GalleryProps {
  /** Assets matching the current query, in display order. */
  assets: AssetRecord[]
  /** Whether the library is still loading from IndexedDB. */
  loading: boolean
  /** Library-level failure message, when loading or opening failed. */
  error: string | null
  /** Technical detail behind {@link GalleryProps.error}, shown on demand. */
  errorDetail?: string
  /** Whether the library holds assets before filtering. */
  hasAnyAssets: boolean
  /** Current query, used for hit highlighting. */
  query: Query
  /** Ids of the selected assets. */
  selected: string[]
  /** Id of the asset open in the lightbox, when any. */
  openId: string | null
  /** Replace the selection. */
  onSelect: (ids: string[], anchorIndex: number) => void
  /** Open an asset in the lightbox. */
  onOpen: (asset: AssetRecord) => void
  /** Close the lightbox. */
  onCloseLightbox: () => void
  /** Step the lightbox to another asset. */
  onOpenStep: (asset: AssetRecord) => void
  /** Toggle the favourite flag. */
  onToggleFavorite: (asset: AssetRecord) => void
  /** Set a rating. */
  onRate: (asset: AssetRecord, rating: AssetRecord['rating']) => void
  /** Replace part of the query, used by the empty state's reset action. */
  onQueryPatch: (patch: Partial<Query>) => void
  /** Open the file picker from the empty state. */
  onPickFiles: () => void
  /** Retry the failed load. */
  onRetry: () => void
  /** Hand an asset to the conversation. */
  onReference?: (asset: AssetRecord) => void
  /** Rename an asset. */
  onRename: (asset: AssetRecord, name: string) => void
  /** Add or remove one tag. */
  onToggleTag: (asset: AssetRecord, tag: string) => void
  /** Re-check whether the backing file still exists. */
  onRecheck: (asset: AssetRecord) => void
  /** Re-point an asset at a relocated file. */
  onRelocate: (asset: AssetRecord, nextPath: string) => void
  /** Delete assets from the library. */
  onDelete: (assets: AssetRecord[]) => void
  /** Ask the host for a replacement path through a native picker. */
  onRequestRelocate?: (asset: AssetRecord) => void
  /** Open a file with the system default application. */
  onOpenSystem?: (asset: AssetRecord) => void
  /**
   * Largest image file rendered at full resolution, in bytes. Bigger pictures
   * keep their thumbnail and say so on the card. Defaults to
   * {@link DEFAULT_ORIGINAL_CAP}.
   */
  originalCap?: number
  /** Object URL of the wall's wallpaper; absent leaves the theme background. */
  wallpaperUrl?: string
  /** Mask strength over the wallpaper, in percent (0–90). Defaults to 35. */
  wallpaperMask?: number
}

/** The card whose menu is open, plus the button it hangs from. */
interface MenuState {
  asset: AssetRecord
  anchor: HTMLElement
}

/**
 * Render the gallery.
 * @param props - Assets, selection, and every action the gallery can raise.
 * @returns The gallery surface with its card-level overlays.
 */
export function Gallery(props: GalleryProps): JSX.Element {
  const { assets, loading, error, query, selected } = props
  const [menu, setMenu] = useState<MenuState | null>(null)
  const originalCap = props.originalCap ?? DEFAULT_ORIGINAL_CAP
  const wallpaperUrl = props.wallpaperUrl
  const wallpaperMask = clampMask(props.wallpaperMask ?? DEFAULT_WALLPAPER_MASK)

  const selectedSet = useMemo(() => new Set(selected), [selected])
  const selectionRef = useRef<string[]>(selected)
  selectionRef.current = selected
  const anchorRef = useRef<number | null>(null)

  const indexOf = useMemo(() => {
    const map = new Map<string, number>()
    assets.forEach((asset, index) => map.set(asset.id, index))
    return map
  }, [assets])
  const indexOfRef = useRef(indexOf)
  indexOfRef.current = indexOf

  const selectRef = props.onSelect
  const openRef = props.onOpen

  const handleSelect = useCallback(
    (asset: AssetRecord, modifiers: { toggle: boolean; range: boolean }): void => {
      const index = indexOfRef.current.get(asset.id) ?? 0
      if (modifiers.range && anchorRef.current !== null) {
        const from = Math.min(anchorRef.current, index)
        const to = Math.max(anchorRef.current, index)
        const ids = selectionRef.current.slice()
        for (let cursor = from; cursor <= to; cursor += 1) {
          const id = assets[cursor]?.id
          if (id !== undefined && !ids.includes(id)) ids.push(id)
        }
        selectRef(ids, anchorRef.current)
        return
      }
      const next = selectionRef.current.includes(asset.id)
        ? selectionRef.current.filter(id => id !== asset.id)
        : [...selectionRef.current, asset.id]
      anchorRef.current = index
      selectRef(next, index)
    },
    [assets, selectRef],
  )

  const handleMore = useCallback((asset: AssetRecord, anchor: HTMLElement): void => {
    setMenu({ asset, anchor })
  }, [])

  const cardHeightAt = useCallback(
    (index: number, columnWidth: number): number => {
      const asset = assets[index]
      if (asset === undefined) return columnWidth
      return cardMediaHeight(asset, columnWidth) + FOOTER_HEIGHT
    },
    [assets],
  )

  // Everything that changes what a card renders, and nothing else.
  //
  // `masonic` builds each cell through a trie cache keyed on
  // `(render, index, data, width)`, so a cell whose element was already built is
  // never rebuilt — a card would keep its first appearance for the life of the
  // grid. Folding the current appearance into the cell key is what makes
  // selection, favourites, ratings, renames, and search highlighting reach the
  // card. Selection belongs here because the selected card shows a tick and an
  // outlined border instead of its favourite button.
  const itemRevision = useCallback(
    (item: unknown): string => {
      const asset = item as AssetRecord
      return [
        selectedSet.has(asset.id) ? 's1' : 's0',
        query.text,
        asset.favorite ? 'f1' : 'f0',
        asset.rating,
        asset.status,
        asset.name,
        asset.tags.join(','),
        asset.lastCheckedAt,
      ].join('|')
    },
    [selectedSet, query.text],
  )

  const itemKey = useCallback((item: unknown, index: number): string => {
    const asset = item as AssetRecord | undefined
    return asset?.id ?? `al-item-${index}`
  }, [])

  const renderCard = useCallback(
    (cell: { item: AssetRecord; index: number; width: number }) => (
      <AssetCard
        asset={cell.item}
        width={cell.width}
        index={cell.index}
        selected={selectedSet.has(cell.item.id)}
        query={query.text}
        originalCap={originalCap}
        onOpen={openRef}
        onSelect={handleSelect}
        onToggleFavorite={props.onToggleFavorite}
        onRate={props.onRate}
        onReference={props.onReference}
        onMore={handleMore}
      />
    ),
    [
      selectedSet,
      query.text,
      originalCap,
      openRef,
      handleSelect,
      handleMore,
      props.onToggleFavorite,
      props.onRate,
      props.onReference,
    ],
  )

  const layout = useMasonryLayout<AssetRecord>(assets.length, {
    minColumnWidth: MIN_COLUMN_WIDTH,
    gutter: GRID_GUTTER,
    maxColumnCount: MAX_COLUMN_COUNT,
    estimateIndex: 0,
    cardHeightAt,
    itemKey,
    itemRevision,
    renderCard,
  })

  const closeMenu = useCallback((): void => setMenu(null), [])

  const openAsset = props.openId === null ? undefined : assets.find(item => item.id === props.openId)
  const openIndex = openAsset === undefined ? -1 : (indexOf.get(openAsset.id) ?? -1)

  if (loading) {
    return (
      <div className={styles.scroller}>
        <LoadingState columnCount={MAX_COLUMN_COUNT} gutter={GRID_GUTTER} />
      </div>
    )
  }

  if (error !== null) {
    return (
      <div className={styles.scroller}>
        <ErrorState message={error} detail={props.errorDetail} onRetry={props.onRetry} />
      </div>
    )
  }

  if (assets.length === 0) {
    return (
      <div className={styles.scroller}>
        <EmptyState
          filtered={props.hasAnyAssets}
          onPickFiles={props.onPickFiles}
          onClearQuery={() =>
            props.onQueryPatch({
              text: '',
              kinds: [],
              tags: [],
              from: null,
              to: null,
              favoriteOnly: false,
              minRating: 0,
            })
          }
        />
      </div>
    )
  }

  return (
    <>
      <div className={styles.stage}>
        {wallpaperUrl === undefined ? null : (
          <>
            <div
              className={styles.wallpaper}
              aria-hidden="true"
              style={{ '--al-wallpaper': `url("${wallpaperUrl}")` } as React.CSSProperties}
            />
            <div
              className={styles.wallpaperMask}
              aria-hidden="true"
              style={{ '--al-wallpaper-mask': String(wallpaperMask / 100) } as React.CSSProperties}
            />
          </>
        )}
        <div className={styles.scroller} ref={layout.scrollRef}>
          <div
            className={styles.gridSurface}
            style={{ minHeight: layout.geometry.totalHeight > 0 ? layout.geometry.totalHeight : undefined }}
          >
            {layout.geometry.variant === 'grid' ? (
              <CssMasonryGrid columnCount={layout.geometry.columnCount} gutter={GRID_GUTTER}>
                {assets.map((asset, index) => (
                  <div key={asset.id}>
                    {renderCard({ item: asset, index, width: layout.geometry.columnWidth })}
                  </div>
                ))}
              </CssMasonryGrid>
            ) : (
              layout.renderItems(assets)
            )}
          </div>
        </div>
      </div>

      {menu !== null ? (
        <CardMenu
          asset={menu.asset}
          anchor={menu.anchor}
          onClose={closeMenu}
          onReference={props.onReference}
          onToggleFavorite={props.onToggleFavorite}
          onRename={props.onRename}
          onToggleTag={props.onToggleTag}
          onRecheck={props.onRecheck}
          onRelocate={props.onRelocate}
          onRequestRelocate={props.onRequestRelocate}
          onOpenSystem={props.onOpenSystem}
          onDelete={asset => props.onDelete([asset])}
        />
      ) : null}

      {openAsset !== undefined ? (
        <Lightbox
          asset={openAsset}
          position={openIndex + 1}
          total={assets.length}
          onPrevious={
            openIndex > 0 ? () => props.onOpenStep(assets[openIndex - 1] as AssetRecord) : undefined
          }
          onNext={
            openIndex >= 0 && openIndex < assets.length - 1
              ? () => props.onOpenStep(assets[openIndex + 1] as AssetRecord)
              : undefined
          }
          onClose={props.onCloseLightbox}
          onReference={props.onReference}
          onOpenSystem={props.onOpenSystem}
        />
      ) : null}
    </>
  )
}

/**
 * Clamp a wallpaper mask strength into the supported range.
 * @param percent - Requested strength in percent, possibly out of range.
 * @returns The strength in percent, between 0 and 90.
 */
function clampMask(percent: number): number {
  if (!Number.isFinite(percent)) return DEFAULT_WALLPAPER_MASK
  return Math.min(MASK_MAX, Math.max(MASK_MIN, Math.round(percent)))
}
