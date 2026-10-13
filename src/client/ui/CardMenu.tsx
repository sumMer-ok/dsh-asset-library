/**
 * Per-card overflow menu.
 *
 * Anchored to the button that opened it and positioned in viewport coordinates,
 * because the gallery scrolls inside its own pane and an absolutely positioned
 * child of a card would be clipped by the card's own overflow.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { AssetRecord } from '../data/types'
import styles from './CardMenu.module.css'

/** Props for {@link CardMenu}. */
export interface CardMenuProps {
  /** Asset the menu acts on. */
  asset: AssetRecord
  /** Button the menu is anchored to, in viewport coordinates. */
  anchor: HTMLElement
  /** Close the menu without acting. */
  onClose: () => void
  /** Hand the asset to the conversation. */
  onReference?: (asset: AssetRecord) => void
  /** Toggle the favourite flag. */
  onToggleFavorite: (asset: AssetRecord) => void
  /** Rename the asset. */
  onRename: (asset: AssetRecord, name: string) => void
  /** Add or remove one tag. */
  onToggleTag: (asset: AssetRecord, tag: string) => void
  /** Re-check whether the backing file still exists. */
  onRecheck: (asset: AssetRecord) => void
  /** Re-point the asset at a relocated file. */
  onRelocate: (asset: AssetRecord, nextPath: string) => void
  /**
   * Ask the host for a replacement path through a native picker. When absent,
   * the menu offers an inline absolute-path field instead.
   */
  onRequestRelocate?: (asset: AssetRecord) => void
  /** Open the file with the system default application. */
  onOpenSystem?: (asset: AssetRecord) => void
  /** Delete the asset from the library. */
  onDelete: (asset: AssetRecord) => void
}

/** Gap between the anchor button and the menu. */
const ANCHOR_GAP = 6
/** Minimum distance the menu keeps from the viewport edge. */
const VIEWPORT_MARGIN = 8

/**
 * Render the overflow menu for one asset.
 * @param props - Asset and action callbacks.
 * @returns The menu element.
 */
export function CardMenu(props: CardMenuProps): JSX.Element {
  const { asset, anchor, onClose } = props
  const ref = useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = useState(() => anchorPosition(anchor))
  const [renaming, setRenaming] = useState(false)
  const [draftName, setDraftName] = useState(asset.name)
  const [relocating, setRelocating] = useState(false)
  const [draftPath, setDraftPath] = useState(asset.path)
  const [tagDraft, setTagDraft] = useState('')

  useLayoutEffect(() => {
    const element = ref.current
    if (element === null) return
    const place = (): void => {
      const box = element.getBoundingClientRect()
      const anchorBox = anchor.getBoundingClientRect()
      const left = Math.min(
        Math.max(anchorBox.right - box.width, VIEWPORT_MARGIN),
        window.innerWidth - box.width - VIEWPORT_MARGIN,
      )
      const below = anchorBox.bottom + ANCHOR_GAP
      const top = below + box.height > window.innerHeight - VIEWPORT_MARGIN
        ? Math.max(VIEWPORT_MARGIN, anchorBox.top - box.height - ANCHOR_GAP)
        : below
      setPosition({ left, top })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [anchor, renaming, relocating])

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    const onPointer = (event: PointerEvent): void => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (ref.current?.contains(target) === true || anchor.contains(target)) return
      onClose()
    }
    // The menu is positioned in viewport coordinates, so any scroll would leave
    // it floating away from its card.
    const onScroll = (): void => onClose()
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer, true)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer, true)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [anchor, onClose])

  const run = (action: () => void): void => {
    action()
    onClose()
  }

  return (
    <div
      className={styles.menu}
      ref={ref}
      role="menu"
      aria-label={`${asset.name} 的操作`}
      style={{ left: position.left, top: position.top }}
    >
      {renaming ? (
        <form
          className={styles.inlineForm}
          onSubmit={event => {
            event.preventDefault()
            const next = draftName.trim()
            if (next !== '' && next !== asset.name) run(() => props.onRename(asset, next))
            else onClose()
          }}
        >
          <input
            className={styles.inlineInput}
            value={draftName}
            autoFocus
            aria-label="新名称"
            onChange={event => setDraftName(event.target.value)}
          />
          <button type="submit" className={styles.inlineConfirm}>
            确定
          </button>
        </form>
      ) : null}

      {props.onReference !== undefined ? (
        <button
          type="button"
          role="menuitem"
          className={styles.item}
          onClick={() => run(() => props.onReference?.(asset))}
        >
          引用到对话
        </button>
      ) : null}

      <button
        type="button"
        role="menuitem"
        className={styles.item}
        onClick={() => run(() => props.onToggleFavorite(asset))}
      >
        {asset.favorite ? '取消收藏' : '收藏'}
      </button>

      <button
        type="button"
        role="menuitem"
        className={styles.item}
        onClick={() => setRenaming(true)}
      >
        重命名
      </button>

      <div className={styles.section}>
        <span className={styles.sectionLabel}>标签</span>
        <div className={styles.tagList}>
          {asset.tags.length === 0 ? <span className={styles.empty}>暂无标签</span> : null}
          {asset.tags.map(tag => (
            <button
              key={tag}
              type="button"
              className={styles.tag}
              title="移除标签"
              onClick={() => props.onToggleTag(asset, tag)}
            >
              {tag} ✕
            </button>
          ))}
        </div>
        <form
          className={styles.inlineForm}
          onSubmit={event => {
            event.preventDefault()
            const tag = tagDraft.trim()
            if (tag !== '') props.onToggleTag(asset, tag)
            setTagDraft('')
          }}
        >
          <input
            className={styles.inlineInput}
            value={tagDraft}
            placeholder="添加标签…"
            aria-label="添加标签"
            onChange={event => setTagDraft(event.target.value)}
          />
          <button type="submit" className={styles.inlineConfirm}>
            添加
          </button>
        </form>
      </div>

      <button
        type="button"
        role="menuitem"
        className={styles.item}
        onClick={() => run(() => props.onRecheck(asset))}
      >
        重新检查文件
      </button>

      {relocating ? (
        <form
          className={styles.inlineForm}
          onSubmit={event => {
            event.preventDefault()
            const next = draftPath.trim()
            if (next !== '' && next !== asset.path) run(() => props.onRelocate(asset, next))
            else onClose()
          }}
        >
          <input
            className={styles.inlineInput}
            value={draftPath}
            autoFocus
            aria-label="新的文件路径"
            placeholder="/绝对路径/文件.ext"
            onChange={event => setDraftPath(event.target.value)}
          />
          <button type="submit" className={styles.inlineConfirm}>
            确定
          </button>
        </form>
      ) : null}

      <button
        type="button"
        role="menuitem"
        className={styles.item}
        onClick={() => {
          if (props.onRequestRelocate !== undefined) {
            run(() => props.onRequestRelocate?.(asset))
            return
          }
          setRelocating(true)
        }}
      >
        重新定位…
      </button>

      {props.onOpenSystem !== undefined ? (
        <button
          type="button"
          role="menuitem"
          className={styles.item}
          onClick={() => run(() => props.onOpenSystem?.(asset))}
        >
          用系统默认应用打开
        </button>
      ) : null}

      <button
        type="button"
        role="menuitem"
        className={`${styles.item} ${styles.itemDanger}`}
        title="只从素材库移除，磁盘上的原文件保留"
        onClick={() => run(() => props.onDelete(asset))}
      >
        移出素材库
      </button>
    </div>
  )
}

/**
 * Initial menu position, before the menu has been measured.
 * @param anchor - The button the menu hangs from.
 * @returns Viewport coordinates for the menu's top-left corner.
 */
function anchorPosition(anchor: HTMLElement): { left: number; top: number } {
  const box = anchor.getBoundingClientRect()
  return { left: box.right, top: box.bottom + ANCHOR_GAP }
}
