/**
 * Standalone preview entry.
 *
 * Vite aliases `../data/store` onto `./fake-store` for this harness, so the
 * panel below is the real `AssetLibraryApp` — same toolbar, gallery, masonry
 * layout, lightbox, and overlays — running on synthetic fixtures instead of
 * IndexedDB. Nothing here ships.
 */
import { createRoot } from 'react-dom/client'
import { AssetLibraryApp } from '../AssetLibraryApp'
import { seedPreviewStore, store } from './fake-store'
import type { PreviewScenario } from './fake-store'
import { pushLog } from './log'
import { WallpaperScene } from './wallpaper-scene'

/** Scenarios the harness can force from its control bar. */
const SCENARIOS: Array<{ id: PreviewScenario; label: string }> = [
  { id: 'library', label: '20 条素材' },
  { id: 'empty', label: '空态' },
  { id: 'loading', label: '加载态' },
  { id: 'error', label: '错误态' },
]

/**
 * Mount the panel and wire the harness control bar.
 */
function main(): void {
  const mount = document.getElementById('mount')
  const controls = document.getElementById('controls')
  if (mount === null) throw new Error('preview: #mount is missing from preview.html')

  // A `#error` fragment forces `store.init()` to fail. It has to be set before the
  // first render, because the panel initialises from its own mount effect.
  if (window.location.hash === '#error') {
    ;(window as unknown as { __alInitFailure?: string }).__alInitFailure =
      'IndexedDB unavailable: SecurityError: the operation is insecure.'
  }

  const params = new URLSearchParams(location.search)

  // `?scene=wallpaper` mounts the real Gallery directly, because the wallpaper
  // props reach it through the panel, which belongs to another workstream.
  if (params.get('scene') === 'wallpaper') {
    createRoot(mount).render(<WallpaperScene />)
    return
  }

  const requested = Number(params.get('count') ?? '')
  seedPreviewStore({ scenario: 'library', ...(Number.isFinite(requested) && requested > 0 ? { count: requested } : {}) })
  createRoot(mount).render(
    <AssetLibraryApp
      sessionId="preview-session"
      onReference={asset => pushLog(`引用到对话：${asset.name}`)}
      onOpenSystem={asset => pushLog(`系统打开：${asset.path}`)}
      onSettingsChange={patch => {
        // Write through to the harness store, exactly as the plugin entry does
        // with `store.setSettings`, so settings-driven UI (the collapsible
        // 「策展筛选」 panel, the wallpaper mask) actually reflects the change
        // instead of only logging it.
        void store.setSettings(patch)
        pushLog(`设置变更：${JSON.stringify(patch)}`)
      }}
    />,
  )

  if (controls === null) return
  for (const scenario of SCENARIOS) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = scenario.label
    button.dataset.scenario = scenario.id
    button.addEventListener('click', () => {
      seedPreviewStore({ scenario: scenario.id })
      pushLog(`场景：${scenario.label}`)
    })
    controls.append(button)
  }
}

main()
