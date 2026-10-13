/**
 * Wallpaper scene for the preview harness.
 *
 * The panel reads its wallpaper from `AssetLibraryApp`, which is owned by
 * another workstream, so this scene mounts the real `Gallery` directly with the
 * same fixtures and the two wallpaper props — that is what makes the wall, the
 * mask strength, and the card contrast verifiable before the panel wiring lands.
 */
import { useMemo, useState } from 'react'
import type { AssetRecord, Query } from '../data/types'
import { Gallery } from '../Gallery'
import { makeLibrary, makeWallpaperDataUrl } from './fixtures'
import { pushLog } from './log'

/** Empty query: the scene shows the whole wall. */
const SCENE_QUERY: Query = {
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

/** Cap the scene applies, matching the plugin default. */
const SCENE_ORIGINAL_CAP = 64 * 1024 * 1024

/**
 * Render the wallpaper scene.
 * @returns The mask control plus the real gallery on a generated wall.
 */
export function WallpaperScene(): JSX.Element {
  const assets = useMemo(() => makeLibrary(24), [])
  const wallpaperUrl = useMemo(() => makeWallpaperDataUrl(), [])
  const [mask, setMask] = useState(35)
  const [selected, setSelected] = useState<string[]>([])
  const [openId, setOpenId] = useState<string | null>(null)

  const handleReference = (asset: AssetRecord): void => {
    pushLog(`引用到对话：${asset.name}`)
  }

  return (
    <div className="scene-root">
      <div className="scene-bar">
        <span>壁纸遮罩</span>
        <input
          type="range"
          min={0}
          max={90}
          value={mask}
          aria-label="壁纸遮罩强度"
          data-mask-value={mask}
          onChange={event => setMask(Number(event.target.value))}
        />
        <span>{mask}%</span>
      </div>
      <Gallery
        assets={assets}
        loading={false}
        error={null}
        hasAnyAssets
        query={SCENE_QUERY}
        selected={selected}
        openId={openId}
        originalCap={SCENE_ORIGINAL_CAP}
        wallpaperUrl={wallpaperUrl}
        wallpaperMask={mask}
        onSelect={ids => setSelected(ids)}
        onOpen={asset => setOpenId(asset.id)}
        onCloseLightbox={() => setOpenId(null)}
        onOpenStep={asset => setOpenId(asset.id)}
        onToggleFavorite={() => undefined}
        onRate={() => undefined}
        onReference={handleReference}
        onQueryPatch={() => undefined}
        onPickFiles={() => undefined}
        onRetry={() => undefined}
        onRename={() => undefined}
        onToggleTag={() => undefined}
        onRecheck={() => undefined}
        onRelocate={() => undefined}
        onDelete={() => undefined}
      />
    </div>
  )
}
