/**
 * Synthetic store for the standalone preview harness.
 *
 * It implements the frozen `LibraryStore` surface over in-memory fixtures, so
 * Vite can alias `../data/store` onto this module and the real panel renders
 * without IndexedDB, the host file route, or the plugin loader. Nothing here
 * ships.
 */
import type { AssetRecord, ImportEvent, Query } from '../data/types'
import type { LibraryState, LibraryStore } from '../data/store'
import { PREVIEW_SETTINGS, makeLibrary } from './fixtures'

/** A scenario the preview can force, so every state is reachable by hand. */
export type PreviewScenario = 'library' | 'loading' | 'empty' | 'error'

/** Options for {@link seedPreviewStore}. */
export interface SeedOptions {
  /** Which library state to present. */
  scenario?: PreviewScenario
  /** How many fixtures to synthesize. */
  count?: number
  /** Message the error scenario reports; falls back to a generic one. */
  errorMessage?: string
}

const listeners = new Set<() => void>()
let snapshot: LibraryState = {
  loading: true,
  error: null,
  assets: [],
  filtered: [],
  query: {
    text: '',
    kinds: [],
    tags: [],
    favoriteOnly: false,
    minRating: 0,
    from: null,
    to: null,
    sort: 'importedAt',
    desc: true,
  },
  settings: PREVIEW_SETTINGS,
  imports: [],
  importRunning: false,
  selected: [],
  pendingUndo: null,
  wallpaper: undefined,
}

/**
 * Records held back by a removal that is still inside its undo window.
 *
 * The real store keeps them in IndexedDB (it must survive a reload); the harness
 * only has to reproduce the observable behaviour, so memory is enough here.
 */
let pendingRecords: AssetRecord[] = []
let pendingTimer: ReturnType<typeof setTimeout> | undefined

/** Notify every subscriber, exactly like the real store does. */
function emit(): void {
  for (const listener of listeners) listener()
}

/**
 * Replace the whole snapshot.
 * @param patch - Fields to merge into the current snapshot.
 */
function setState(patch: Partial<LibraryState>): void {
  snapshot = { ...snapshot, ...patch }
  emit()
}

/**
 * Recompute the filtered view from the query, using the store's own contract
 * rather than a second filtering implementation.
 * @param assets - Source assets.
 * @param query - Active query.
 * @returns The filtered and sorted list.
 */
function refilter(assets: AssetRecord[], query: Query): AssetRecord[] {
  const text = query.text.trim().toLowerCase()
  const matched = assets.filter(asset => {
    if (text !== '' && !asset.name.toLowerCase().includes(text)) {
      if (!asset.tags.some(tag => tag.toLowerCase().includes(text))) return false
    }
    if (query.kinds.length > 0 && !query.kinds.includes(asset.kind)) return false
    if (query.tags.length > 0 && !query.tags.every(tag => asset.tags.includes(tag))) return false
    if (query.favoriteOnly && !asset.favorite) return false
    if (asset.rating < query.minRating) return false
    if (query.from !== null && asset.importedAt < query.from) return false
    if (query.to !== null && asset.importedAt > query.to) return false
    return true
  })
  const direction = query.desc ? -1 : 1
  return matched.sort((left, right) => {
    if (query.sort === 'name') return left.name.localeCompare(right.name) * direction
    if (query.sort === 'size') return (left.size - right.size) * direction
    if (query.sort === 'rating') return (left.rating - right.rating) * direction
    return (left.importedAt - right.importedAt) * direction
  })
}

/**
 * Rebuild the preview store's snapshot.
 * @param options - Scenario and fixture count.
 */
export function seedPreviewStore(options: SeedOptions = {}): void {
  const scenario = options.scenario ?? 'library'
  if (scenario === 'loading') {
    setState({ loading: true, error: null, assets: [], filtered: [], selected: [], imports: [] })
    return
  }
  if (scenario === 'error') {
    setState({
      loading: false,
      error: options.errorMessage ?? '无法打开本地素材库（IndexedDB 不可用）',
      assets: [],
      filtered: [],
      selected: [],
      imports: [],
    })
    return
  }
  if (scenario === 'empty') {
    setState({ loading: false, error: null, assets: [], filtered: [], selected: [], imports: [] })
    return
  }
  const assets = makeLibrary(options.count)
  setState({
    loading: false,
    error: null,
    assets,
    filtered: refilter(assets, snapshot.query),
    selected: [],
  })
}

/** The synthetic store, cast to the frozen interface. */
export const store: LibraryStore = {
  getSnapshot: () => snapshot,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  async init() {
    await new Promise(resolve => setTimeout(resolve, 600))
    // The harness flips this to exercise the error state and its detail block.
    const failure = (window as unknown as { __alInitFailure?: string }).__alInitFailure
    if (failure !== undefined) {
      // Mirror the real store's contract: a failed init lands in the snapshot as
      // the error state and still rejects, so the caller can record the detail.
      seedPreviewStore({ scenario: 'error', errorMessage: failure })
      throw new Error(failure)
    }
    seedPreviewStore({ scenario: 'library' })
  },  setQuery(patch: Partial<Query>) {
    const query = { ...snapshot.query, ...patch }
    setState({ query, filtered: refilter(snapshot.assets, query) })
  },
  async importFiles(files: File[], onDuplicate) {
    const events: ImportEvent[] = files.map(file => ({
      path: `/Users/preview/imports/${file.name}`,
      name: file.name,
      phase: 'queued',
    }))
    setState({ imports: events, importRunning: true })

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index] as File
      for (const phase of ['hashing', 'thumb', 'writing'] as const) {
        await new Promise(resolve => setTimeout(resolve, 220))
        events[index] = { ...(events[index] as ImportEvent), phase }
        setState({ imports: [...events] })
      }
      // Every third file exercises the duplicate path so the dialog is reachable
      // without a real hashing pipeline.
      if (index % 3 === 2) {
        events[index] = { ...(events[index] as ImportEvent), phase: 'duplicate' }
        setState({ imports: [...events] })
        const existing = snapshot.assets[index % Math.max(1, snapshot.assets.length)]
        if (existing !== undefined) await onDuplicate(existing, file)
      }
      events[index] = { ...(events[index] as ImportEvent), phase: 'done' }
      setState({ imports: [...events] })
    }

    setState({ importRunning: false })
  },
  async remove(ids: string[]) {
    const assets = snapshot.assets.filter(asset => !ids.includes(asset.id))
    setState({
      assets,
      filtered: refilter(assets, snapshot.query),
      selected: snapshot.selected.filter(id => !ids.includes(id)),
    })
  },
  async removeWithUndo(ids: string[]) {
    if (ids.length === 0) return
    // Same semantics as the real store: the records leave the view now and are
    // only dropped when the window closes, so `undoRemove` has something to
    // restore and the UI can report a real countdown.
    const gone = new Set(ids)
    const held = snapshot.assets.filter(asset => gone.has(asset.id))
    pendingRecords = [...pendingRecords, ...held]
    const assets = snapshot.assets.filter(asset => !gone.has(asset.id))
    const expiresAt = Date.now() + 8000
    setState({
      assets,
      filtered: refilter(assets, snapshot.query),
      selected: snapshot.selected.filter(id => !gone.has(id)),
      pendingUndo: { ids: [...new Set(pendingRecords.map(record => record.id))], expiresAt },
    })
    if (pendingTimer !== undefined) clearTimeout(pendingTimer)
    pendingTimer = setTimeout(() => { void store.purgePendingDelete() }, 8000)
  },
  async undoRemove() {
    if (pendingRecords.length === 0) return
    if (pendingTimer !== undefined) clearTimeout(pendingTimer)
    pendingTimer = undefined
    const restored = pendingRecords
    pendingRecords = []
    const assets = [...snapshot.assets, ...restored]
    setState({ assets, filtered: refilter(assets, snapshot.query), pendingUndo: null })
  },
  async purgePendingDelete() {
    if (pendingTimer !== undefined) clearTimeout(pendingTimer)
    pendingTimer = undefined
    pendingRecords = []
    setState({ pendingUndo: null })
  },
  async setWallpaper(file: File) {
    setState({ wallpaper: file, settings: { ...snapshot.settings, wallpaperKey: 'current' } })
  },
  async clearWallpaper() {
    setState({ wallpaper: undefined, settings: { ...snapshot.settings, wallpaperKey: null } })
  },
  async setSettings(patch: Partial<typeof snapshot.settings>) {
    setState({ settings: { ...snapshot.settings, ...patch } })
  },
  async patch(id: string, patch: Partial<AssetRecord>) {
    const assets = snapshot.assets.map(asset => (asset.id === id ? { ...asset, ...patch } : asset))
    setState({ assets, filtered: refilter(assets, snapshot.query) })
  },
  toggleFavorite(id: string) {
    const target = snapshot.assets.find(asset => asset.id === id)
    if (target === undefined) return
    const assets = snapshot.assets.map(asset =>
      asset.id === id ? { ...asset, favorite: !target.favorite } : asset,
    )
    setState({ assets, filtered: refilter(assets, snapshot.query) })
  },
  setRating(id: string, rating: AssetRecord['rating']) {
    const assets = snapshot.assets.map(asset => (asset.id === id ? { ...asset, rating } : asset))
    setState({ assets, filtered: refilter(assets, snapshot.query) })
  },
  async toggleTag(ids: string[], tag: string) {
    const assets = snapshot.assets.map(asset => {
      if (!ids.includes(asset.id)) return asset
      const tags = asset.tags.includes(tag)
        ? asset.tags.filter(item => item !== tag)
        : [...asset.tags, tag]
      return { ...asset, tags }
    })
    setState({ assets, filtered: refilter(assets, snapshot.query) })
  },
  async relocate(id: string, nextPath: string) {
    const assets = snapshot.assets.map(asset =>
      asset.id === id ? { ...asset, path: nextPath, status: 'ok' as const } : asset,
    )
    setState({ assets, filtered: refilter(assets, snapshot.query) })
  },
  async recheck(ids: string[]) {
    const assets = snapshot.assets.map(asset =>
      ids.includes(asset.id)
        ? { ...asset, lastCheckedAt: Date.now(), status: 'ok' as const }
        : asset,
    )
    setState({ assets, filtered: refilter(assets, snapshot.query) })
  },
  select(ids: string[]) {
    setState({ selected: ids })
  },
}

