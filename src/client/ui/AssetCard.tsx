/**
 * One gallery cell: the picture itself, its corner marks, the always-visible
 * reference action, and the hover control board.
 *
 * The card is purely presentational. It never touches IndexedDB or the store;
 * every action arrives as a callback. Image assets are shown at full resolution
 * (the host file route), with the stored thumbnail standing in as the
 * placeholder and as the only source of card height — so the masonry layout
 * never shifts, and a card that is out of view never requests the original.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AssetRecord } from '../data/types'
import { Highlight } from './Highlight'
import { useObjectUrl } from './hooks'
import {
  fileRouteUrl,
  formatBytes,
  formatDate,
  formatDimensions,
  formatDuration,
  mediaBoxHeight,
  placeholderColor,
} from './format'
import { kindLabel } from './asset-kind'
import styles from './Gallery.module.css'

/** Props for {@link AssetCard}. */
export interface AssetCardProps {
  /** The asset to present. */
  asset: AssetRecord
  /** Rendered card width in CSS pixels. */
  width: number
  /** Index in the display order, used for the entrance stagger. */
  index: number
  /** Whether this card is part of the current selection. */
  selected: boolean
  /** Query whose hits are marked in the name and the tags. */
  query: string
  /**
   * Largest image file the card will render at full resolution, in bytes. A
   * bigger picture keeps its thumbnail and reports the reason on the card.
   */
  originalCap: number
  /** Open the lightbox for this asset. */
  onOpen: (asset: AssetRecord) => void
  /** Report a click with its modifier keys so the gallery can extend selection. */
  onSelect: (asset: AssetRecord, modifiers: { toggle: boolean; range: boolean }) => void
  /** Toggle the favourite flag. */
  onToggleFavorite: (asset: AssetRecord) => void
  /** Set the rating from the control board. */
  onRate: (asset: AssetRecord, rating: AssetRecord['rating']) => void
  /** Hand this asset to the conversation as a reference. */
  onReference?: (asset: AssetRecord) => void
  /** Open this card's overflow menu, anchored to the action button. */
  onMore: (asset: AssetRecord, anchor: HTMLElement) => void
}

/** Star glyphs for one rating value. */
const STARS = ['', '★', '★★', '★★★', '★★★★', '★★★★★']

/** How far outside the viewport a card starts loading its original. */
const ORIGINAL_ROOT_MARGIN = '320px 0px'

/** Rating values the control board offers. */
const RATING_VALUES = [1, 2, 3, 4, 5] as const

/**
 * Paths whose full-resolution read already failed.
 *
 * Virtualisation unmounts and remounts cells as the wall scrolls, so without
 * this memo every scroll back over an unreadable file would ask the host route
 * for it again. The mark is per path, so relocating the asset retries.
 */
const failedOriginalPaths = new Set<string>()

/**
 * Largest picture, in pixels, the card decodes at full resolution.
 *
 * The byte cap alone does not bound memory: a heavily compressed 64 MB JPEG can
 * be a 12000x8000 bitmap, which decodes to roughly 380 MB per visible card. This
 * guard reuses the same "原图过大" branch, so the card degrades to its thumbnail
 * instead of risking the renderer. Photos up to roughly 40 MP still load.
 */
const MAX_ORIGINAL_PIXELS = 40_000_000

/**
 * Render one gallery cell.
 * @param props - Asset, geometry, selection state, and action callbacks.
 * @returns The card element.
 */
export function AssetCard(props: AssetCardProps): JSX.Element {
  const { asset, width, index, selected, query, originalCap } = props
  const [thumbFailed, setThumbFailed] = useState(false)
  const [heroReady, setHeroReady] = useState(false)
  const [originalFailed, setOriginalFailed] = useState(() => failedOriginalPaths.has(asset.path))
  const [nearViewport, setNearViewport] = useState(false)
  const mediaRef = useRef<HTMLDivElement | null>(null)

  // Reading a non-Blob here means a corrupted or migrated record; surfacing the
  // fallback is better than throwing during render.
  const thumb = asset.thumb instanceof Blob && asset.thumb.size > 0 ? asset.thumb : undefined
  const thumbUrl = useObjectUrl(thumbFailed ? undefined : thumb)

  const missing = asset.status === 'missing'
  const oversized = asset.size > originalCap || pixelCount(asset) > MAX_ORIGINAL_PIXELS
  const wantsOriginal =
    asset.kind === 'image' && !missing && !oversized && !failedOriginalPaths.has(asset.path)
  const originalUrl =
    wantsOriginal && nearViewport && !originalFailed ? fileRouteUrl(asset.path) : undefined

  // A new record for the same slot must not inherit the previous picture's state.
  useEffect(() => {
    setThumbFailed(false)
    setHeroReady(false)
    setOriginalFailed(failedOriginalPaths.has(asset.path))
    setNearViewport(false)
  }, [asset.id, asset.path])

  // Full-resolution files are read from disk, so they are requested only as the
  // card approaches the viewport; masonic unmounts far cells, which drops the
  // decoded bitmap with the element.
  useEffect(() => {
    if (!wantsOriginal || nearViewport) return
    const node = mediaRef.current
    if (node === null || typeof IntersectionObserver === 'undefined') {
      setNearViewport(true)
      return
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setNearViewport(true)
          observer.disconnect()
        }
      },
      { rootMargin: ORIGINAL_ROOT_MARGIN },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [wantsOriginal, nearViewport])

  const showingOriginal = originalUrl !== undefined
  const placeholderUrl = showingOriginal ? thumbUrl : undefined
  const heroUrl = originalUrl ?? thumbUrl

  // A changed source must fade in again rather than keep the previous opacity.
  useEffect(() => {
    setHeroReady(false)
  }, [heroUrl])

  const mediaHeight = useMemo(() => cardMediaHeight(asset, width), [asset, width])

  const cardStyle = useMemo(
    () =>
      ({
        '--al-media-height': `${mediaHeight}px`,
        '--al-stagger': `${Math.min(index, 40) * 12}ms`,
      }) as React.CSSProperties,
    [mediaHeight, index],
  )
  const mediaBackground = useMemo(() => placeholderColor(asset.dominantColor), [asset.dominantColor])

  // A plain click opens the asset; holding ⌘/Ctrl (or Shift) reports a selection
  // gesture instead, which is also what turns multi-select on.
  const activate = useCallback(
    (event: React.MouseEvent | React.KeyboardEvent): void => {
      if (event.metaKey || event.ctrlKey || event.shiftKey) {
        props.onSelect(asset, { toggle: true, range: event.shiftKey })
        return
      }
      props.onOpen(asset)
    },
    [props.onSelect, props.onOpen, asset],
  )

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent): void => {
      if (event.key === 'Enter') {
        event.preventDefault()
        props.onOpen(asset)
        return
      }
      if (event.key === ' ') {
        event.preventDefault()
        props.onSelect(asset, { toggle: true, range: event.shiftKey })
      }
    },
    [props.onOpen, props.onSelect, asset],
  )

  const rating = STARS[asset.rating] ?? ''
  const showSkeleton = heroUrl !== undefined && !heroReady && placeholderUrl === undefined

  return (
    <div
      className={[
        styles.card,
        selected ? styles.cardSelected : '',
        missing ? styles.cardMissing : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={cardStyle}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${asset.name}，${kindLabel(asset.kind)}`}
      data-asset-id={asset.id}
      data-selected={selected ? 'true' : undefined}
      onClick={activate}
      onKeyDown={onKeyDown}
    >
      <div className={styles.media} style={{ background: mediaBackground }} ref={mediaRef}>
        {placeholderUrl !== undefined ? (
          <img
            className={styles.mediaPlaceholder}
            src={placeholderUrl}
            alt=""
            draggable={false}
            data-al-placeholder=""
          />
        ) : null}

        {heroUrl !== undefined ? (
          <img
            className={`${styles.mediaImage} ${heroReady ? styles.mediaImageReady : ''}`}
            src={heroUrl}
            alt=""
            draggable={false}
            decoding="async"
            data-al-hero={showingOriginal ? 'original' : 'thumbnail'}
            onLoad={() => setHeroReady(true)}
            onError={() => {
              // Only an original can fail here; the thumbnail is a local blob.
              if (showingOriginal) {
                failedOriginalPaths.add(asset.path)
                setOriginalFailed(true)
              } else {
                setThumbFailed(true)
              }
            }}
          />
        ) : null}

        {showSkeleton ? <div className={styles.mediaSkeleton} /> : null}

        {placeholderUrl === undefined && heroUrl === undefined ? (
          <div className={styles.mediaFallback} aria-hidden="true">
            {kindLabel(asset.kind).slice(0, 1)}
          </div>
        ) : null}

        <div className={styles.cornerStack}>
          <span className={styles.kindBadge}>{kindLabel(asset.kind)}</span>
          {missing ? (
            <span className={styles.missingBadge} data-al-badge="missing">
              文件缺失
            </span>
          ) : null}
          {oversized && asset.kind === 'image' ? (
            <span className={styles.sourceBadge} data-al-badge="oversized">
              原图过大
            </span>
          ) : null}
          {originalFailed ? (
            <span className={styles.sourceBadge} data-al-badge="unreadable">
              原图不可用
            </span>
          ) : null}
        </div>

        <button
          type="button"
          className={styles.moreButton}
          aria-label="更多操作"
          aria-haspopup="menu"
          onClick={event => {
            event.stopPropagation()
            props.onMore(asset, event.currentTarget)
          }}
        >
          ⋯
        </button>

        {selected ? (
          <span className={styles.selectTick} aria-hidden="true">
            ✓
          </span>
        ) : asset.favorite ? (
          <span className={styles.statusStar} aria-hidden="true">
            ★
          </span>
        ) : null}

        {rating !== '' ? (
          <span className={styles.ratingOverlay} aria-hidden="true">
            {rating}
          </span>
        ) : null}

        {asset.durationMs !== undefined ? (
          <span className={styles.durationBadge}>{formatDuration(asset.durationMs)}</span>
        ) : null}

        <div className={styles.veil} data-al-veil="">
          <div className={styles.veilGradient} aria-hidden="true" />
          <div className={styles.veilPanel} data-al-veil-panel="">
            <div className={styles.veilMeta}>
              <div className={styles.veilMetaRow}>
                <span className={styles.veilMetaKey}>尺寸</span>
                <span className={styles.veilMetaValue}>
                  {formatDimensions(asset.width, asset.height)}
                </span>
              </div>
              <div className={styles.veilMetaRow}>
                <span className={styles.veilMetaKey}>大小</span>
                <span className={styles.veilMetaValue}>{formatBytes(asset.size)}</span>
              </div>
              <div className={styles.veilMetaRow}>
                <span className={styles.veilMetaKey}>导入</span>
                <span className={styles.veilMetaValue}>{formatDate(asset.importedAt)}</span>
              </div>
            </div>

            {asset.tags.length > 0 ? (
              <div className={styles.veilTags}>
                {asset.tags.slice(0, 8).map(tag => (
                  <span key={tag} className={styles.veilTag}>
                    <Highlight text={tag} query={query} />
                  </span>
                ))}
              </div>
            ) : null}

            <div
              className={styles.veilActions}
              role="group"
              aria-label="评分"
              onClick={event => event.stopPropagation()}
            >
              {RATING_VALUES.map(value => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.veilAction} ${asset.rating >= value ? styles.veilActionOn : ''}`}
                  aria-label={`评为 ${value} 星`}
                  aria-pressed={asset.rating === value}
                  onClick={() => props.onRate(asset, asset.rating === value ? 0 : value)}
                >
                  {asset.rating >= value ? '★' : '☆'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <span className={styles.name} title={asset.name}>
          <Highlight text={asset.name} query={query} />
        </span>
        {props.onReference !== undefined ? (
          <button
            type="button"
            className={styles.cardReference}
            data-al-reference=""
            onClick={event => {
              event.stopPropagation()
              props.onReference?.(asset)
            }}
          >
            引用到对话
          </button>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Card media height for one asset at one column width.
 *
 * The height comes from stored metadata only, so it is identical before and
 * after a picture decodes and the masonry layout never reflows.
 * @param asset - Asset whose aspect ratio is reserved.
 * @param width - Rendered card width in CSS pixels.
 * @returns Media box height in CSS pixels.
 */
export function cardMediaHeight(asset: AssetRecord, width: number): number {
  return mediaBoxHeight(width, aspectOf(asset))
}

/**
 * Stored pixel count of one asset, or 0 when the dimensions are unknown.
 * @param asset - Asset whose stored dimensions are read.
 * @returns Width times height, or 0 when either side is missing.
 */
function pixelCount(asset: AssetRecord): number {
  const { width, height } = asset
  if (typeof width !== 'number' || typeof height !== 'number') return 0
  if (!(width > 0) || !(height > 0)) return 0
  return width * height
}

/** Aspect ratio from the most trustworthy stored numbers. */
function aspectOf(asset: AssetRecord): number {
  const { width, height, thumbWidth, thumbHeight } = asset
  // The checks stay inline so TypeScript narrows both numbers in the same
  // branch: a helper returning `boolean` cannot propagate that narrowing.
  if (typeof width === 'number' && typeof height === 'number' && width > 0 && height > 0) {
    return width / height
  }
  if (
    typeof thumbWidth === 'number'
    && typeof thumbHeight === 'number'
    && thumbWidth > 0
    && thumbHeight > 0
  ) {
    return thumbWidth / thumbHeight
  }
  return 4 / 3
}
