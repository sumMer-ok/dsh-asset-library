/**
 * Settings popover for the thumbnail and import knobs.
 *
 * Every field writes through `onChange` with a validated value, so a half-typed
 * number never reaches the store: the field keeps its own text and only commits
 * when the parsed result is a usable number.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PluginSettings } from '../data/types'
import styles from './Overlay.module.css'

/** Props for {@link SettingsPopover}. */
export interface SettingsPopoverProps {
  /** Current settings. */
  settings: PluginSettings
  /** Merge a validated patch. */
  onChange: (patch: Partial<PluginSettings>) => void
  /** Close the popover. */
  onClose: () => void
  /** Assets currently stored, shown as a cache summary. */
  assetCount: number
  /** Total bytes of stored thumbnails. */
  thumbBytes: number
  /**
   * Whether a settings patch can be persisted. The frozen store contract has no
   * settings mutator, so the panel reports the form as view-only rather than
   * accepting edits that would be silently dropped.
   */
  editable: boolean
  /** Whether a custom wall now backs the gallery. */
  hasWallpaper: boolean
  /** Store one chosen local image as the gallery wall; receives the picked file. */
  onPickWallpaper: (file: File) => void
  /** Drop the custom wall and fall back to the theme background. */
  onClearWallpaper: () => void
  /** Store-level failure to show inside this panel (wallpaper writes included). */
  errorText?: string | undefined
}

/** Largest wallpaper accepted locally, mirroring the store's own limit. */
const WALLPAPER_MAX_BYTES = 20 * 1024 * 1024

/**
 * Render the settings popover.
 * @param props - Settings, patch callback, close callback, and cache stats.
 * @returns The popover element.
 */
export function SettingsPopover(props: SettingsPopoverProps): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [wallpaperNotice, setWallpaperNotice] = useState<string | null>(null)
  const { onClose } = props

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    const onPointer = (event: PointerEvent): void => {
      if (event.target instanceof Node && ref.current !== null && !ref.current.contains(event.target)) {
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer, true)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer, true)
    }
  }, [onClose])

  /**
   * Validate one picked wallpaper before the store sees it.
   *
   * The same limits are enforced again in the store; checking here keeps the
   * failure next to the control the user just used.
   * @param file - The chosen local image.
   */
  const acceptWallpaper = useCallback(
    (file: File | undefined): void => {
      if (file === undefined) return
      if (!file.type.startsWith('image/')) {
        setWallpaperNotice(`只支持图片作为壁纸（收到 ${file.type || '未知类型'}）`)
        return
      }
      if (file.size > WALLPAPER_MAX_BYTES) {
        setWallpaperNotice(
          `壁纸最大 20 MB，这张是 ${(file.size / 1024 / 1024).toFixed(1)} MB`,
        )
        return
      }
      setWallpaperNotice(null)
      props.onPickWallpaper(file)
    },
    [props],
  )

  const commitNumber = useCallback(
    (key: keyof PluginSettings, min: number, max: number, integer: boolean) => (raw: string): void => {
      const parsed = Number(raw)
      if (!Number.isFinite(parsed)) return
      const clamped = Math.min(Math.max(parsed, min), max)
      props.onChange({ [key]: integer ? Math.round(clamped) : clamped } as Partial<PluginSettings>)
    },
    [props.onChange, props],
  )

  return (
    <div className={styles.popover} ref={ref} role="dialog" aria-label="设置">
      <span className={styles.popoverTitle}>画廊外观</span>

      <div className={styles.field}>
        <div className={styles.fieldRow}>
          <span>展墙壁纸</span>
          <span className={styles.fieldValue}>{props.hasWallpaper ? '已自定义' : '默认背景'}</span>
        </div>
        <div className={styles.wallpaperActions}>
          <input
            ref={fileRef}
            className={styles.visuallyHidden}
            type="file"
            accept="image/*"
            tabIndex={-1}
            aria-hidden="true"
            onChange={event => {
              acceptWallpaper(event.target.files?.[0])
              // Re-picking the same file must fire `change` again.
              event.target.value = ''
            }}
          />
          <button
            type="button"
            className={styles.ghostButton}
            disabled={!props.editable}
            onClick={() => fileRef.current?.click()}
          >
            选择本机图片
          </button>
          <button
            type="button"
            className={styles.ghostButton}
            disabled={!props.editable || !props.hasWallpaper}
            onClick={() => {
              setWallpaperNotice(null)
              props.onClearWallpaper()
            }}
          >
            恢复默认
          </button>
        </div>
        <span className={styles.fieldValue}>单张 ≤ 20 MB，仅铺展墙、不挡住工具条。</span>
      </div>

      <div className={styles.field}>
        <div className={styles.fieldRow}>
          <span>遮罩强度</span>
          <span className={styles.fieldValue}>{Math.round(props.settings.wallpaperMask)}%</span>
        </div>
        <input
          className={styles.range}
          type="range"
          min={0}
          max={90}
          step={5}
          disabled={!props.editable}
          value={props.settings.wallpaperMask}
          aria-label="壁纸遮罩强度"
          onChange={event => props.onChange({ wallpaperMask: Number(event.target.value) })}
        />
      </div>

      {wallpaperNotice !== null || props.errorText !== undefined ? (
        <span className={styles.fieldError} role="alert">
          {wallpaperNotice ?? props.errorText}
        </span>
      ) : null}

      <span className={styles.popoverTitle}>导入与缩略图</span>

      {!props.editable ? (
        <span className={styles.fieldValue}>
          当前宿主未提供设置写入通道，以下数值为只读展示。
        </span>
      ) : null}

      <div className={styles.field}>
        <div className={styles.fieldRow}>
          <span>缩略图长边</span>
          <span className={styles.fieldValue}>{props.settings.thumbMaxEdge} px</span>
        </div>
        <input
          className={styles.range}
          type="range"
          min={128}
          max={1024}
          step={32}
          disabled={!props.editable}
          value={props.settings.thumbMaxEdge}
          aria-label="缩略图长边"
          onChange={event => commitNumber('thumbMaxEdge', 128, 1024, true)(event.target.value)}
        />
      </div>

      <div className={styles.field}>
        <div className={styles.fieldRow}>
          <span>缩略图质量</span>
          <span className={styles.fieldValue}>{props.settings.thumbQuality.toFixed(2)}</span>
        </div>
        <input
          className={styles.range}
          type="range"
          min={0.3}
          max={1}
          step={0.05}
          disabled={!props.editable}
          value={props.settings.thumbQuality}
          aria-label="缩略图质量"
          onChange={event => commitNumber('thumbQuality', 0.3, 1, false)(event.target.value)}
        />
      </div>

      <NumberField
        label="单文件导入上限"
        suffix="MB"
        value={Math.round(props.settings.maxImportBytes / 1024 / 1024)}
        min={1}
        disabled={!props.editable}
        onCommit={value => props.onChange({ maxImportBytes: value * 1024 * 1024 })}
      />

      <NumberField
        label="单次响应上限"
        suffix="MB"
        value={Math.round(props.settings.routeMaxBytes / 1024 / 1024)}
        min={1}
        disabled={!props.editable}
        onCommit={value => props.onChange({ routeMaxBytes: value * 1024 * 1024 })}
      />

      <NumberField
        label="视频取帧位置"
        suffix={`（${props.settings.videoSeekRatio.toFixed(2)}）`}
        value={Math.round(props.settings.videoSeekRatio * 100)}
        min={0}
        max={100}
        disabled={!props.editable}
        onCommit={value =>
          props.onChange({ videoSeekRatio: Math.min(Math.max(value / 100, 0), 1) })
        }
      />

      <NumberField
        label="视频取帧超时"
        suffix="ms"
        value={props.settings.videoTimeoutMs}
        min={200}
        disabled={!props.editable}
        onCommit={value => props.onChange({ videoTimeoutMs: Math.max(200, value) })}
      />

      <span className={styles.popoverTitle}>
        已存 {props.assetCount} 项缩略图，约 {formatMegabytes(props.thumbBytes)}
      </span>
    </div>
  )
}

/** Props for the numeric field row. */
interface NumberFieldProps {
  /** Field label. */
  label: string
  /** Unit shown after the input. */
  suffix: string
  /** Current integer value. */
  value: number
  /** Lower bound accepted on commit. */
  min?: number
  /** Upper bound accepted on commit. */
  max?: number
  /** Whether the field accepts edits. */
  disabled?: boolean
  /** Receives the parsed integer. */
  onCommit: (value: number) => void
}

/**
 * Render a labelled integer input that commits only validated values.
 * @param props - Label, unit, value, bounds, and commit callback.
 * @returns The field row.
 */
function NumberField(props: NumberFieldProps): JSX.Element {
  const [text, setText] = useState(String(props.value))
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setText(String(props.value))
  }, [props.value])

  const commit = (): void => {
    const parsed = Number(text)
    if (!Number.isFinite(parsed)) {
      setText(String(props.value))
      return
    }
    const min = props.min ?? Number.NEGATIVE_INFINITY
    const max = props.max ?? Number.POSITIVE_INFINITY
    props.onCommit(Math.round(Math.min(Math.max(parsed, min), max)))
  }

  return (
    <div className={styles.field}>
      <div className={styles.fieldRow}>
        <span>{props.label}</span>
        <span className={styles.fieldValue}>{props.suffix}</span>
      </div>
      <input
        className={styles.fieldInput}
        type="number"
        inputMode="numeric"
        aria-label={props.label}
        value={text}
        disabled={props.disabled}
        onFocus={() => {
          focused.current = true
        }}
        onChange={event => setText(event.target.value)}
        onBlur={() => {
          focused.current = false
          commit()
        }}
        onKeyDown={event => {
          if (event.key === 'Enter') commit()
        }}
      />
    </div>
  )
}

/**
 * Format a byte count as whole megabytes for the cache summary.
 * @param bytes - Stored thumbnail bytes.
 * @returns A string such as `4.2 MB`.
 */
function formatMegabytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB'
  const mb = bytes / 1024 / 1024
  return mb < 1 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${mb.toFixed(1)} MB`
}
