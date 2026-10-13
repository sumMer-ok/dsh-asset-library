/**
 * Top control bar: the always-visible query spine (search, the mutually
 * exclusive 「全部」/type chips, counts, import, multi-select, the batch removal
 * action, and the settings entry) plus a collapsible 「策展筛选」 panel holding
 * the narrower filters (time range, tags, favourites, minimum rating, sorting).
 *
 * The bar is controlled: it holds no filter state except the literal search text
 * it is typing into, and reports every change through `onQuery`. The curation
 * panel's open state is a persisted setting, so it survives a reload.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { AssetRecord, AssetKind, Query } from '../data/types'
import { ASSET_KINDS, kindGlyph, kindLabel } from './asset-kind'
import { Highlight } from './Highlight'
import { useDebouncedValue } from './hooks'
import styles from './App.module.css'

/** Debounce applied to the search field before it reaches the filter query. */
export const SEARCH_DEBOUNCE_MS = 120

/** Fixed time windows offered by the time-range chips. */
export const TIME_RANGES = ['today', 'week', 'month', 'earlier', 'custom'] as const

/** One entry of {@link TIME_RANGES}. */
export type TimeRange = (typeof TIME_RANGES)[number]

/** Labels for the time-range chips and the sort select. */
const TIME_LABEL: Record<TimeRange, string> = {
  today: '今天',
  week: '本周',
  month: '本月',
  earlier: '更早',
  custom: '自定义',
}

const SORT_LABEL: Record<Query['sort'], string> = {
  importedAt: '导入时间',
  name: '名称',
  size: '大小',
  rating: '评分',
}

/** Props for {@link Toolbar}. */
export interface ToolbarProps {
  /** Current query. */
  query: Query
  /** Total assets in the library, for the count label. */
  totalCount: number
  /** Assets matching the current query. */
  matchCount: number
  /** Assets whose backing file is missing. */
  missingCount: number
  /** Every tag in use, most used first. */
  allTags: string[]
  /** Active time-range chip, when any. */
  activeTimeRange: TimeRange | null
  /** Whether multi-select is armed. */
  selecting: boolean
  /** Number of selected assets. */
  selectedCount: number
  /** Whether an import is running. */
  importing: boolean
  /** Whether the collapsible curation panel is open. */
  curationOpen: boolean
  /** Merge a partial query. */
  onQuery: (patch: Partial<Query>) => void
  /** Switch the active time-range chip, including clearing it. */
  onTimeRange: (range: TimeRange | null) => void
  /** Arm or disarm multi-select. */
  onToggleSelecting: () => void
  /** Clear the current selection. */
  onClearSelection: () => void
  /** Open the file picker. */
  onPickFiles: () => void
  /** Re-check every asset whose file is missing. */
  onRecheckMissing: () => void
  /** Toggle the settings popover. */
  settingsOpen: boolean
  onToggleSettings: () => void
  /** Open the batch-removal confirmation for the current selection. */
  onRequestRemoveSelected: () => void
  /** Flip the persisted curation-panel state. */
  onToggleCuration: () => void
}

/**
 * Render the control bar.
 * @param props - Query state, counts, and change callbacks.
 * @returns The toolbar element.
 */
export function Toolbar(props: ToolbarProps): JSX.Element {
  const { query } = props
  const [text, setText] = useState(query.text)
  const debouncedText = useDebouncedValue(text, SEARCH_DEBOUNCE_MS)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  // Adopt an externally changed query text (a cleared field, a reset filter)
  // without ever clobbering what is being typed. Keyed on `query.text` alone: a
  // dependency on `debouncedText` would also fire while the debounce settles and
  // would reset the field to a query the store has not adopted yet.
  const lastPushed = useRef(query.text)
  useEffect(() => {
    if (query.text === lastPushed.current) return
    lastPushed.current = query.text
    setText(query.text)
  }, [query.text])

  useEffect(() => {
    if (debouncedText === lastPushed.current) return
    lastPushed.current = debouncedText
    props.onQuery({ text: debouncedText })
  }, [debouncedText])

  const toggleKind = (kind: AssetKind): void => {
    const kinds = query.kinds.includes(kind)
      ? query.kinds.filter(item => item !== kind)
      : [...query.kinds, kind]
    props.onQuery({ kinds })
  }

  const toggleTag = (tag: string): void => {
    const tags = query.tags.includes(tag)
      ? query.tags.filter(item => item !== tag)
      : [...query.tags, tag]
    props.onQuery({ tags })
  }

  const applyCustomRange = (next: { from?: string; to?: string }): void => {
    const from = next.from ?? customFrom
    const to = next.to ?? customTo
    setCustomFrom(from)
    setCustomTo(to)
    props.onQuery({
      from: from === '' ? null : new Date(`${from}T00:00:00`).getTime(),
      to: to === '' ? null : new Date(`${to}T23:59:59.999`).getTime(),
    })
  }

  const visibleTags = useMemo(() => props.allTags.slice(0, 24), [props.allTags])
  const sorting = `${query.sort}:${query.desc ? 'desc' : 'asc'}`
  // 「全部」 is the empty kind set: any concrete chip means the user left it.
  const allKinds = query.kinds.length === 0
  // A collapsed panel must still announce that filters are narrowing the view.
  const curationOpen = props.curationOpen === true
  const curationActive =
    props.activeTimeRange !== null ||
    query.tags.length > 0 ||
    query.favoriteOnly ||
    query.minRating > 0

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarRow}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden="true">
            ⌕
          </span>
          <input
            className={styles.searchInput}
            type="search"
            value={text}
            placeholder="搜索名称与标签…"
            aria-label="搜索素材"
            onChange={event => setText(event.target.value)}
          />
          {text !== '' ? (
            <button
              type="button"
              className={styles.searchClear}
              aria-label="清空搜索"
              onClick={() => setText('')}
            >
              ✕
            </button>
          ) : null}
        </div>

        <button
          type="button"
          className={styles.iconButton}
          aria-pressed={props.selecting}
          onClick={props.onToggleSelecting}
        >
          {props.selecting ? `已选 ${props.selectedCount}` : '多选'}
        </button>

        {props.selecting && props.selectedCount > 0 ? (
          <>
            <button
              type="button"
              className={styles.iconButton}
              onClick={props.onClearSelection}
            >
              清空
            </button>
            <button
              type="button"
              className={styles.dangerButton}
              onClick={props.onRequestRemoveSelected}
            >
              移出素材库
            </button>
          </>
        ) : null}

        <span className={styles.spacer} />

        <span className={styles.countLabel}>
          {props.matchCount === props.totalCount
            ? `${props.totalCount} 项`
            : `${props.matchCount} / ${props.totalCount} 项`}
        </span>

        <button
          type="button"
          className={styles.primaryButton}
          disabled={props.importing}
          onClick={props.onPickFiles}
        >
          {props.importing ? '导入中…' : '导入素材'}
        </button>

        <div className={styles.settingsAnchor}>
          <button
            type="button"
            className={styles.iconButton}
            aria-pressed={props.settingsOpen}
            aria-label="设置（含画廊外观）"
            onClick={props.onToggleSettings}
          >
            ⚙
          </button>
        </div>
      </div>

      <div className={styles.toolbarRow}>
        <span className={styles.chipGroupLabel}>类型</span>
        <div className={styles.chipGroup} role="group" aria-label="按类型筛选">
          <button
            type="button"
            className={`${styles.chip} ${allKinds ? styles.chipActive : ''}`}
            aria-pressed={allKinds}
            onClick={() => props.onQuery({ kinds: [] })}
          >
            全部
          </button>
          {ASSET_KINDS.map(kind => {
            const active = query.kinds.includes(kind)
            return (
              <button
                key={kind}
                type="button"
                className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                aria-pressed={active}
                onClick={() => toggleKind(kind)}
              >
                <span className={styles.chipGlyph} aria-hidden="true">
                  {kindGlyph(kind)}
                </span>
                {kindLabel(kind)}
              </button>
            )
          })}
        </div>

        <span className={styles.spacer} />

        <button
          type="button"
          className={`${styles.iconButton} ${curationActive && !curationOpen ? styles.iconButtonFlagged : ''}`}
          aria-expanded={curationOpen}
          aria-controls="al-curation"
          onClick={props.onToggleCuration}
        >
          <span aria-hidden="true">{curationOpen ? '▴' : '▾'}</span> 策展筛选
          {curationActive && !curationOpen ? ' •' : ''}
        </button>
      </div>

      {curationOpen ? (
        <div className={styles.curation} id="al-curation">
          <div className={styles.toolbarRow}>
            <span className={styles.chipGroupLabel}>时间</span>
            <div className={styles.chipGroup} role="group" aria-label="按时间范围筛选">
              {TIME_RANGES.map(range => {
                const active = props.activeTimeRange === range
                return (
                  <button
                    key={range}
                    type="button"
                    className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                    aria-pressed={active}
                    onClick={() => props.onTimeRange(active ? null : range)}
                  >
                    {TIME_LABEL[range]}
                  </button>
                )
              })}
            </div>

            <span className={styles.spacer} />

            <button
              type="button"
              className={`${styles.chip} ${query.favoriteOnly ? styles.chipActive : ''}`}
              aria-pressed={query.favoriteOnly}
              onClick={() => props.onQuery({ favoriteOnly: !query.favoriteOnly })}
            >
              ★ 仅收藏
            </button>

            <span className={styles.chipGroupLabel}>评分</span>
            <div className={styles.chipGroup} role="group" aria-label="按最低评分筛选">
              {([0, 3, 4, 5] as const).map(value => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.chip} ${query.minRating === value ? styles.chipActive : ''}`}
                  aria-pressed={query.minRating === value}
                  onClick={() => props.onQuery({ minRating: value })}
                >
                  {value === 0 ? '不限' : `${value}★+`}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.toolbarRow}>
            {props.missingCount > 0 ? (
              <button type="button" className={styles.chip} onClick={props.onRecheckMissing}>
                重新检查 {props.missingCount} 个缺失文件
              </button>
            ) : null}

            <span className={styles.spacer} />

            <label className={styles.chipGroupLabel} htmlFor="al-sort">
              排序
            </label>
            <select
              id="al-sort"
              className={styles.select}
              value={sorting}
              onChange={event => {
                const [sort, direction] = event.target.value.split(':')
                props.onQuery({
                  sort: sort as Query['sort'],
                  desc: direction === 'desc',
                })
              }}
            >
              {(Object.keys(SORT_LABEL) as Query['sort'][]).flatMap(sort => [
                <option key={`${sort}:desc`} value={`${sort}:desc`}>
                  {SORT_LABEL[sort]} ↓
                </option>,
                <option key={`${sort}:asc`} value={`${sort}:asc`}>
                  {SORT_LABEL[sort]} ↑
                </option>,
              ])}
            </select>
          </div>

          {visibleTags.length > 0 ? (
            <div className={styles.toolbarRow}>
              <span className={styles.chipGroupLabel}>标签</span>
              <div className={styles.chipGroup} role="group" aria-label="按标签筛选">
                {visibleTags.map(tag => {
                  const active = query.tags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                      aria-pressed={active}
                      onClick={() => toggleTag(tag)}
                    >
                      <Highlight text={tag} query={query.text} />
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          {props.activeTimeRange === 'custom' ? (
            <div className={styles.toolbarRow}>
              <span className={styles.chipGroupLabel}>自定义</span>
              <input
                className={styles.dateInput}
                type="date"
                aria-label="起始日期"
                value={customFrom}
                onChange={event => applyCustomRange({ from: event.target.value })}
              />
              <span className={styles.chipGroupLabel}>至</span>
              <input
                className={styles.dateInput}
                type="date"
                aria-label="结束日期"
                value={customTo}
                onChange={event => applyCustomRange({ to: event.target.value })}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Rank the tags in use, most frequent first.
 *
 * Frequency ordering keeps the chips that actually partition the library at the
 * front of a single-line strip; the name breaks ties deterministically.
 * @param assets - Assets to collect from.
 * @returns Tag names, most used first.
 */
export function collectTags(assets: AssetRecord[]): string[] {
  const counts = new Map<string, number>()
  for (const asset of assets) {
    for (const tag of asset.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([tag]) => tag)
}
