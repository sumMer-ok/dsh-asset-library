/**
 * The picker opened from the composer's `+` menu: choose library assets and hand
 * them to the conversation.
 *
 * The component is fully controlled — assets arrive through props, selection is
 * local, and the single `onConfirm` callback reports the chosen ids. It never
 * touches the store, so the panel and the picker cannot drift apart.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { matchAsset } from '../data/filters'
import type { AssetRecord, Query } from '../data/types'
import { formatBytes } from './format'
import { Highlight } from './Highlight'
import { useDebouncedValue, useObjectUrl } from './hooks'
import styles from './AssetPicker.module.css'

/** Props for {@link AssetPicker}. */
export interface AssetPickerProps {
  /** Whether the picker is on screen; `false` renders nothing. */
  open: boolean
  /** Close without confirming (Escape, the close button, the backdrop). */
  onClose: () => void
  /** Confirm the selection; receives the chosen asset ids in list order. */
  onConfirm: (ids: string[]) => void
  /** Every asset in the library, in the order the panel would show them. */
  assets: readonly AssetRecord[]
  /** Open the library tab itself (offered on the empty state). */
  onOpenLibrary?: () => void
}

/** A text-only query: the picker is a search box, not a filter panel. */
const TEXT_ONLY: Omit<Query, 'text'> = {
  kinds: [],
  tags: [],
  favoriteOnly: false,
  minRating: 0,
  from: null,
  to: null,
  sort: 'importedAt',
  desc: true,
}

/** How long typing settles before the list re-filters. */
const SEARCH_DEBOUNCE_MS = 120

/**
 * Render the asset picker dialog.
 * @param props - Open state, the library contents, and the two callbacks.
 * @returns The dialog, or `null` while closed.
 */
export function AssetPicker(props: AssetPickerProps): JSX.Element | null {
  const { open, onClose, onConfirm, assets, onOpenLibrary } = props
  const [text, setText] = useState('')
  const [selected, setSelected] = useState<readonly string[]>([])
  const searchRef = useRef<HTMLInputElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const debounced = useDebouncedValue(text, SEARCH_DEBOUNCE_MS)

  // Every open starts clean: a stale selection must never ride into a new message.
  useEffect(() => {
    if (!open) return
    setText('')
    setSelected([])
    searchRef.current?.focus()
  }, [open])

  const visible = useMemo(() => {
    const query: Query = { ...TEXT_ONLY, text: debounced }
    const trimmed = debounced.trim()
    return trimmed === '' ? [...assets] : assets.filter((asset) => matchAsset(asset, query))
  }, [assets, debounced])

  const toggle = useCallback((id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }, [])

  const confirm = useCallback(() => {
    if (selected.length === 0) return
    // Confirm in list order so the composer receives them the way the user saw them.
    onConfirm(assets.filter((asset) => selected.includes(asset.id)).map((asset) => asset.id))
  }, [assets, onConfirm, selected])

  // Escape closes; Enter confirms once something is selected. Both are captured on
  // the dialog so the composer underneath never sees the keystrokes.
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key === 'Enter' && selected.length > 0 && event.target !== searchRef.current) {
        event.preventDefault()
        confirm()
      }
    },
    [confirm, onClose, selected.length],
  )

  if (!open) return null

  return (
    <div
      className={styles.backdrop}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="从素材库添加"
        onKeyDown={onKeyDown}
      >
        <header className={styles.header}>
          <h2 className={styles.title}>从素材库添加</h2>
          <input
            ref={searchRef}
            className={styles.search}
            type="search"
            value={text}
            placeholder="搜索名称、标签、扩展名…"
            aria-label="搜索素材"
            onChange={(event) => setText(event.target.value)}
          />
        </header>

        {assets.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyText}>素材库还是空的，先拖入一些文件。</p>
            {onOpenLibrary !== undefined ? (
              <button type="button" className={styles.secondary} onClick={onOpenLibrary}>
                去素材库
              </button>
            ) : null}
          </div>
        ) : visible.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyText}>没有匹配「{debounced}」的素材。</p>
          </div>
        ) : (
          <ul className={styles.grid} aria-label="素材列表">
            {visible.map((asset) => (
              <PickerCell
                key={asset.id}
                asset={asset}
                query={debounced}
                selected={selected.includes(asset.id)}
                onToggle={toggle}
              />
            ))}
          </ul>
        )}

        <footer className={styles.footer}>
          <span className={styles.count}>
            {selected.length === 0 ? '' : `已选 ${selected.length} 项`}
          </span>
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={onClose}>
              取消
            </button>
            <button
              type="button"
              className={styles.primary}
              disabled={selected.length === 0}
              onClick={confirm}
            >
              {selected.length === 0 ? '加入对话' : `加入对话（${selected.length}）`}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

/** One selectable cell: thumbnail, name, size. */
function PickerCell(props: {
  asset: AssetRecord
  query: string
  selected: boolean
  onToggle: (id: string) => void
}): JSX.Element {
  const { asset, query, selected, onToggle } = props
  const url = useObjectUrl(asset.thumb)
  return (
    <li className={styles.cellWrap}>
      <button
        type="button"
        className={selected ? styles.cellSelected : styles.cell}
        aria-pressed={selected}
        onClick={() => onToggle(asset.id)}
      >
        <span className={styles.thumbBox}>
          {url === undefined ? (
            <span className={styles.thumbFallback} aria-hidden="true">
              {asset.ext.slice(0, 4).toUpperCase() || '?'}
            </span>
          ) : (
            <img className={styles.thumb} src={url} alt="" loading="lazy" draggable={false} />
          )}
        </span>
        <span className={styles.cellName} title={asset.name}>
          <Highlight text={asset.name} query={query} markClassName={styles.mark} />
        </span>
        <span className={styles.cellMeta}>{formatBytes(asset.size)}</span>
      </button>
    </li>
  )
}
