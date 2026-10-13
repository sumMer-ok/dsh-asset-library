/**
 * The asset library panel: the only component in this directory that reads the
 * data store.
 *
 * Every other component is controlled through props, so the store subscription,
 * the query, and the import wiring live here and nowhere else.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { store } from '../data/store'
import type { AssetRecord, PluginSettings, Query } from '../data/types'
import { DuplicateDialog } from './DuplicateDialog'
import { Gallery } from './Gallery'
import { useObjectUrl } from './hooks'
import { ImportProgress } from './ImportProgress'
import { ImportZone } from './ImportZone'
import { SettingsPopover } from './SettingsPopover'
import { Toolbar, collectTags } from './Toolbar'
import type { TimeRange } from './Toolbar'
import { useDuplicateResolution } from './useDuplicateResolution'
import { useStoreState } from './useStoreState'
import styles from './App.module.css'
import overlayStyles from './Overlay.module.css'

/** Props for {@link AssetLibraryApp}. */
export interface AssetLibraryAppProps {
  /** Session this panel was opened in, when the host supplied one. */
  sessionId?: string
  /**
   * Hand an asset to the conversation. The transport is owned by the plugin
   * entry point (`src/client/attachment.ts`), never by the panel.
   */
  onReference?: (asset: AssetRecord) => void
  /** Open a file with the system default application. */
  onOpenSystem?: (asset: AssetRecord) => void
  /** Ask the host for a replacement path through a native picker. */
  onRequestRelocate?: (asset: AssetRecord) => void
  /** Persist a settings patch. Absent leaves the settings form read-only. */
  onSettingsChange?: (patch: Partial<PluginSettings>) => void
}

/** Fallback query used before the store's first snapshot arrives. */
const INITIAL_QUERY: Query = {
  text: '',
  kinds: [],
  tags: [],
  favoriteOnly: false,
  minRating: 0,
  from: null,
  to: null,
  sort: 'importedAt',
  desc: true,
}

/** Fallback settings used before the store has loaded them from IndexedDB. */
const INITIAL_SETTINGS: PluginSettings = {
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

/** How long a finished import run stays on screen before hiding itself. */
const PROGRESS_LINGER_MS = 4000

/**
 * Render the asset library panel.
 * @param props - Session identity and the host capabilities the panel may need.
 * @returns The panel, from the loading shell through to the full gallery.
 */
export function AssetLibraryApp(props: AssetLibraryAppProps): JSX.Element {
  const state = useStoreState()
  const ready = state !== null

  const query = state?.query ?? INITIAL_QUERY
  const settings = state?.settings ?? INITIAL_SETTINGS
  const assets = useMemo(() => state?.assets ?? [], [state?.assets])
  const filtered = useMemo(() => state?.filtered ?? [], [state?.filtered])
  const imports = state?.imports ?? []
  const selected = state?.selected ?? []
  const pendingUndo = state?.pendingUndo ?? null
  // The undo bar counts down in whole seconds; the tick only runs while a
  // removal is actually pending, so an idle panel schedules nothing.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (pendingUndo === null) return
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [pendingUndo])

  const [removeConfirm, setRemoveConfirm] = useState<string[] | null>(null)
  // Wallpaper failures get their own slot: `state.error` also carries thumbnail,
  // favourite, and import failures, and surfacing one of those inside the
  // appearance panel would point the user at the wrong control.
  const [wallpaperError, setWallpaperError] = useState<string | undefined>(undefined)
  const wallpaperUrl = useObjectUrl(state?.wallpaper)
  const removeSelected = useCallback((): void => {
    setRemoveConfirm([...selected])
  }, [selected])
  const confirmRemove = useCallback((): void => {
    const ids = removeConfirm ?? []
    setRemoveConfirm(null)
    if (ids.length === 0) return
    // 只移出素材库：磁盘原件始终保留，8 秒内可撤销。
    void store.removeWithUndo(ids)
  }, [removeConfirm])

  const duplicates = useDuplicateResolution()
  const [openId, setOpenId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [timeRange, setTimeRange] = useState<TimeRange | null>(null)
  const [progressDismissed, setProgressDismissed] = useState(false)
  // The store's `error` is only a human-readable summary; the failure that
  // produced it is observable at the call site, so the detail is kept here.
  const [errorDetail, setErrorDetail] = useState<string | undefined>(undefined)
  const settingsAnchorRef = useRef<HTMLDivElement | null>(null)
  const importCountRef = useRef(0)

  const initStore = useCallback((): void => {
    setErrorDetail(undefined)
    store.init().catch((cause: unknown) => {
      setErrorDetail(cause instanceof Error ? `${cause.name}: ${cause.message}\n${cause.stack ?? ''}` : String(cause))
    })
  }, [])

  useEffect(() => {
    initStore()
  }, [initStore])

  const patchQuery = useCallback((patch: Partial<Query>): void => {
    store.setQuery(patch)
  }, [])

  const handleTimeRange = useCallback(
    (next: TimeRange | null): void => {
      setTimeRange(next)
      if (next === null) {
        patchQuery({ from: null, to: null })
        return
      }
      // The custom chip's bounds come from the toolbar's own date fields.
      if (next === 'custom') return
      patchQuery(rangeBounds(next))
    },
    [patchQuery],
  )

  // A new run clears the dismissal so fresh work is always visible.
  useEffect(() => {
    if (imports.length <= importCountRef.current) return
    importCountRef.current = imports.length
    setProgressDismissed(false)
  }, [imports.length])

  const importRunning = state?.importRunning === true
  useEffect(() => {
    if (importRunning || imports.length === 0) return
    const timer = setTimeout(() => setProgressDismissed(true), PROGRESS_LINGER_MS)
    return () => clearTimeout(timer)
  }, [importRunning, imports.length])

  const handleFiles = useCallback(
    (files: File[]): void => {
      if (files.length === 0) return
      void store.importFiles(files, duplicates.onDuplicate)
    },
    [duplicates.onDuplicate],
  )

  const handlePickFiles = useCallback((): void => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.addEventListener('change', () => {
      const files = input.files === null ? [] : Array.from(input.files)
      if (files.length > 0) handleFiles(files)
    })
    input.click()
  }, [handleFiles])

  const tags = useMemo(() => collectTags(assets), [assets])
  const missingCount = useMemo(
    () => assets.filter(asset => asset.status === 'missing').length,
    [assets],
  )
  const thumbBytes = useMemo(
    () => assets.reduce((total, asset) => total + (asset.thumb?.size ?? 0), 0),
    [assets],
  )

  const patch = useCallback((id: string, next: Partial<AssetRecord>): void => {
    void store.patch(id, next)
  }, [])

  if (!ready) {
    return (
      <div className={styles.root}>
        <div className={styles.body}>
          <Gallery
            assets={[]}
            loading
            error={null}
            hasAnyAssets={false}
            query={INITIAL_QUERY}
            selected={[]}
            openId={null}
            onSelect={() => undefined}
            onOpen={() => undefined}
            onCloseLightbox={() => undefined}
            onOpenStep={() => undefined}
            onToggleFavorite={() => undefined}
            onRate={() => undefined}
            onQueryPatch={() => undefined}
            onPickFiles={handlePickFiles}
            onRetry={initStore}
            onRename={() => undefined}
            onToggleTag={() => undefined}
            onRecheck={() => undefined}
            onRelocate={() => undefined}
            onDelete={() => undefined}
            originalCap={INITIAL_SETTINGS.routeMaxBytes}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <Toolbar
        query={query}
        totalCount={assets.length}
        matchCount={filtered.length}
        missingCount={missingCount}
        allTags={tags}
        activeTimeRange={timeRange}
        selecting={selected.length > 0}
        selectedCount={selected.length}
        importing={importRunning}
        curationOpen={settings.curationOpen}
        onToggleCuration={() => {
          props.onSettingsChange?.({ curationOpen: !settings.curationOpen })
        }}
        onQuery={patchQuery}
        onTimeRange={handleTimeRange}
        onToggleSelecting={() => store.select([])}
        onClearSelection={() => store.select([])}
        onPickFiles={handlePickFiles}
        onRecheckMissing={() => void store.recheck(assets.map(asset => asset.id))}
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen(value => !value)}
        onRequestRemoveSelected={removeSelected}
      />

      <ImportZone onFiles={handleFiles} busy={importRunning} empty={assets.length === 0} />

      {settingsOpen ? (
        <div className={styles.settingsAnchor} ref={settingsAnchorRef}>
          <SettingsPopover
            settings={settings}
            assetCount={assets.length}
            thumbBytes={thumbBytes}
            editable={props.onSettingsChange !== undefined}
            hasWallpaper={state.wallpaper !== undefined}
            onPickWallpaper={file => {
              setWallpaperError(undefined)
              store.setWallpaper(file).catch((cause: unknown) => {
                setWallpaperError(cause instanceof Error ? cause.message : String(cause))
              })
            }}
            onClearWallpaper={() => {
              setWallpaperError(undefined)
              store.clearWallpaper().catch((cause: unknown) => {
                setWallpaperError(cause instanceof Error ? cause.message : String(cause))
              })
            }}
            errorText={wallpaperError}
            onChange={next => props.onSettingsChange?.(next)}
            onClose={() => setSettingsOpen(false)}
          />
        </div>
      ) : null}

      <div className={styles.body}>
        <Gallery
          assets={filtered}
          loading={state.loading}
          error={state.error}
          errorDetail={errorDetail}
          hasAnyAssets={assets.length > 0}
          query={query}
          selected={selected}
          openId={openId}
          onSelect={ids => store.select(ids)}
          onOpen={asset => setOpenId(asset.id)}
          onCloseLightbox={() => setOpenId(null)}
          onOpenStep={asset => setOpenId(asset.id)}
          onToggleFavorite={asset => store.toggleFavorite(asset.id)}
          onRate={(asset, rating) => store.setRating(asset.id, rating)}
          onQueryPatch={patchQuery}
          onPickFiles={handlePickFiles}
          onRetry={initStore}
          onReference={props.onReference}
          onRename={(asset, name) => patch(asset.id, { name })}
          onToggleTag={(asset, tag) => void store.toggleTag([asset.id], tag)}
          onRecheck={asset => void store.recheck([asset.id])}
          onRelocate={(asset, nextPath) => void store.relocate(asset.id, nextPath)}
          wallpaperUrl={wallpaperUrl}
          wallpaperMask={settings.wallpaperMask}
          originalCap={settings.routeMaxBytes}
          onDelete={list => {
            void store.remove(list.map(asset => asset.id))
            if (openId !== null && list.some(asset => asset.id === openId)) setOpenId(null)
          }}
          onRequestRelocate={props.onRequestRelocate}
          onOpenSystem={props.onOpenSystem}
        />

        {!progressDismissed || importRunning ? (
          <ImportProgress
            events={imports}
            running={importRunning}
            onDismiss={() => setProgressDismissed(true)}
          />
        ) : null}
      </div>

      {removeConfirm !== null ? (
        <RemoveConfirmDialog
          count={removeConfirm.length}
          onCancel={() => setRemoveConfirm(null)}
          onConfirm={confirmRemove}
        />
      ) : null}

      {pendingUndo !== null ? (
        <UndoBar
          count={pendingUndo.ids.length}
          remainingSeconds={Math.max(0, Math.ceil((pendingUndo.expiresAt - now) / 1000))}
          onUndo={() => void store.undoRemove()}
        />
      ) : null}

      {duplicates.current !== null ? (
        <DuplicateDialog
          request={duplicates.current}
          remaining={duplicates.remaining}
          onResolve={duplicates.resolve}
        />
      ) : null}
    </div>
  )
}

/** Separates a removal from the disk: the copies on disk are never touched. */
function RemoveConfirmDialog(props: {
  count: number
  onCancel: () => void
  onConfirm: () => void
}): JSX.Element {
  return (
    <div className={overlayStyles.modalBackdrop} role="presentation">
      <div className={overlayStyles.modal} role="alertdialog" aria-modal="true" aria-label="移出素材库">
        <h2 className={overlayStyles.modalTitle}>移出素材库</h2>
        <p className={overlayStyles.modalBody}>
          将从素材库移出 {props.count} 项，<strong>磁盘上的原文件不会被删除</strong>。8 秒内可以撤销。
        </p>
        <div className={overlayStyles.modalActions}>
          <button type="button" className={styles.ghostButton} onClick={props.onCancel}>
            取消
          </button>
          <span className={overlayStyles.modalActionsSpacer} />
          <button type="button" className={styles.dangerButton} onClick={props.onConfirm}>
            移出 {props.count} 项
          </button>
        </div>
      </div>
    </div>
  )
}

/** The 8-second escape hatch offered after a removal. */
function UndoBar(props: {
  count: number
  remainingSeconds: number
  onUndo: () => void
}): JSX.Element {
  return (
    <div className={styles.undoBar} role="status" aria-live="polite">
      <span>已移出 {props.count} 项（磁盘原文件仍在）</span>
      <button type="button" className={styles.ghostButton} onClick={props.onUndo}>
        撤销（{props.remainingSeconds} 秒）
      </button>
    </div>
  )
}

/**
 * Epoch bounds for one fixed time-range chip.
 * @param range - A fixed range; `custom` is resolved by the toolbar's date fields.
 * @returns The inclusive `from` and `to` epoch milliseconds for the query.
 */
export function rangeBounds(range: Exclude<TimeRange, 'custom'>): { from: number; to: number } {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if (range === 'today') return { from: startOfDay, to: Number.POSITIVE_INFINITY }
  if (range === 'week') {
    // Weeks start on Monday, matching the calendar convention the UI implies.
    const weekday = (now.getDay() + 6) % 7
    return { from: startOfDay - weekday * 86_400_000, to: Number.POSITIVE_INFINITY }
  }
  if (range === 'month') {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
      to: Number.POSITIVE_INFINITY,
    }
  }
  return { from: Number.NEGATIVE_INFINITY, to: startOfMonth(now) }
}

/**
 * Start of the current month.
 * @param now - Reference instant.
 * @returns Epoch milliseconds of the month's first midnight.
 */
function startOfMonth(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime()
}
