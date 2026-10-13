/**
 * Full-surface preview for one asset.
 *
 * Images and videos stream from the host's Range file route so playback and
 * seeking work without loading the whole file into memory. When the route
 * cannot serve the original, the image view falls back to the stored thumbnail
 * and says so, rather than showing a broken frame.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AssetRecord } from '../data/types'
import { useObjectUrl } from './hooks'
import { fileRouteUrl, formatBytes, formatDimensions, formatDuration } from './format'
import { kindGlyph, kindLabel } from './asset-kind'
import styles from './Overlay.module.css'

/** Props for {@link Lightbox}. */
export interface LightboxProps {
  /** Asset under preview. */
  asset: AssetRecord
  /** 1-based position within the previewable list. */
  position: number
  /** Size of the previewable list. */
  total: number
  /** Step to the previous asset; `undefined` disables the control. */
  onPrevious?: () => void
  /** Step to the next asset; `undefined` disables the control. */
  onNext?: () => void
  /** Close the preview. */
  onClose: () => void
  /** Hand this asset to the conversation as a reference. */
  onReference?: (asset: AssetRecord) => void
  /** Ask the host to open the file with the system default application. */
  onOpenSystem?: (asset: AssetRecord) => void
}

/** Which media element the current asset needs. */
type MediaMode = 'image' | 'video' | 'none'

/**
 * Decide how an asset should be previewed.
 * @param asset - Asset under preview.
 * @returns The media mode, or `none` for a type-only placeholder.
 */
export function mediaModeFor(asset: AssetRecord): MediaMode {
  if (asset.kind === 'image') return 'image'
  if (asset.kind === 'video') return 'video'
  return 'none'
}

/**
 * Render the lightbox.
 * @param props - Asset, navigation, and close callbacks.
 * @returns The lightbox overlay.
 */
export function Lightbox(props: LightboxProps): JSX.Element {
  const { asset, position, total } = props
  const mode = mediaModeFor(asset)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  const routeUrl = useMemo(
    () => (asset.status === 'missing' ? undefined : fileRouteUrl(asset.path)),
    [asset.path, asset.status],
  )
  const [routeFailed, setRouteFailed] = useState(false)
  const [mediaLoaded, setMediaLoaded] = useState(false)
  const fallbackUrl = useObjectUrl(routeFailed || mode === 'none' ? asset.thumb : undefined)

  const keyDown = useCallback(
    (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        props.onClose()
        return
      }
      if (event.key === 'ArrowLeft' && props.onPrevious !== undefined) {
        event.preventDefault()
        props.onPrevious()
        return
      }
      if (event.key === 'ArrowRight' && props.onNext !== undefined) {
        event.preventDefault()
        props.onNext()
      }
    },
    [props.onClose, props.onPrevious, props.onNext],
  )

  // Focus moves into the overlay on open and returns to the invoking card on
  // close, so keyboard navigation never strands the user behind the overlay.
  useEffect(() => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialogRef.current?.focus()
    return () => restoreFocusRef.current?.focus()
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', keyDown)
    return () => document.removeEventListener('keydown', keyDown)
  }, [keyDown])

  // A different asset is a different media element: drop the previous outcome.
  useEffect(() => {
    setRouteFailed(false)
    setMediaLoaded(false)
  }, [asset.id])

  const showVideo = mode === 'video' && !routeFailed && asset.status !== 'missing'
  // The route is the only way to the original; once it fails, or the file is
  // known to be gone, the stored thumbnail is all that remains.
  const imageUnavailable = mode === 'image' && (routeFailed || asset.status === 'missing')

  return (
    <div
      className={styles.lightboxBackdrop}
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`预览 ${asset.name}`}
      tabIndex={-1}
      onClick={event => {
        if (event.target === event.currentTarget) props.onClose()
      }}
    >
      <div className={styles.lightboxFrame}>
        <div className={styles.lightboxTitle}>
          <span className={styles.lightboxName}>{asset.name}</span>
          <span className={styles.lightboxCounter}>
            {position} / {total}
          </span>
        </div>
        <button
          type="button"
          className={styles.lightboxNav}
          style={{ position: 'static', transform: 'none', width: 30, height: 30 }}
          aria-label="关闭预览"
          onClick={props.onClose}
        >
          ✕
        </button>
      </div>

      <div className={styles.lightboxStage}>
        {props.onPrevious !== undefined ? (
          <button
            type="button"
            className={`${styles.lightboxNav} ${styles.lightboxNavPrev}`}
            aria-label="上一个"
            onClick={props.onPrevious}
          >
            ‹
          </button>
        ) : null}

        {imageUnavailable ? (
          fallbackUrl !== undefined ? (
            <img className={styles.lightboxMedia} src={fallbackUrl} alt={asset.name} />
          ) : (
            <div className={styles.lightboxPlaceholder}>
              <span className={styles.stateGlyph} aria-hidden="true">
                {kindGlyph(asset.kind)}
              </span>
              <span>缩略图不可用</span>
            </div>
          )
        ) : showVideo ? (
          <video
            className={`${styles.lightboxMedia} ${styles.lightboxVideo}`}
            src={routeUrl}
            controls
            preload="metadata"
            onLoadedData={() => setMediaLoaded(true)}
            onError={() => setRouteFailed(true)}
          />
        ) : mode === 'image' && routeUrl !== undefined ? (
          <img
            className={styles.lightboxMedia}
            src={routeUrl}
            alt={asset.name}
            onLoad={() => setMediaLoaded(true)}
            onError={() => setRouteFailed(true)}
          />
        ) : (
          <div className={styles.lightboxPlaceholder}>
            <span className={styles.stateGlyph} aria-hidden="true">
              {kindGlyph(asset.kind)}
            </span>
            <span>
              {kindLabel(asset.kind)}文件 · {asset.ext.toUpperCase() || '未知格式'}
            </span>
            <span className={styles.lightboxNotice}>
              {asset.status === 'missing'
                ? '原始文件已不在磁盘上，仅能显示已保存的缩略图。'
                : '此类型无法在库内预览，可用系统默认应用打开。'}
            </span>
          </div>
        )}

        {props.onNext !== undefined ? (
          <button
            type="button"
            className={`${styles.lightboxNav} ${styles.lightboxNavNext}`}
            aria-label="下一个"
            onClick={props.onNext}
          >
            ›
          </button>
        ) : null}
      </div>

      <div className={styles.lightboxFooter}>
        <span>
          {formatDimensions(asset.width, asset.height)} · {formatBytes(asset.size)}
          {asset.durationMs !== undefined ? ` · ${formatDuration(asset.durationMs)}` : ''}
        </span>
        {routeFailed && mode === 'image' ? (
          <span className={styles.lightboxNotice}>原图读取失败，已回退到缩略图。</span>
        ) : null}
        {routeFailed && mode === 'video' ? (
          <span className={styles.lightboxNotice}>视频流读取失败，无法在库内播放。</span>
        ) : null}
        <span className={styles.lightboxFooterActions}>
          {props.onReference !== undefined ? (
            <button
              type="button"
              className={styles.veilActionPrimary}
              onClick={() => props.onReference?.(asset)}
            >
              引用到对话
            </button>
          ) : null}
          {props.onOpenSystem !== undefined ? (
            <button
              type="button"
              className={styles.ghostButton}
              onClick={() => props.onOpenSystem?.(asset)}
            >
              用系统应用打开
            </button>
          ) : null}
        </span>
      </div>

      {!mediaLoaded && (mode === 'image' || mode === 'video') && !routeFailed ? (
        <span aria-live="polite" style={{ position: 'absolute', left: -9999 }}>
          正在加载原图
        </span>
      ) : null}
    </div>
  )
}
