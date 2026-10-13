/**
 * Vite config for the standalone UI preview.
 *
 * Run from the plugin root (Vite may be borrowed from the sandbox):
 *   npx vite --config src/client/ui/__preview__/vite.config.ts
 *
 * Two aliases carry the whole harness:
 *   - `../data/store` resolves to `./fake-store.ts`, so the real panel mounts
 *     over in-memory fixtures with no IndexedDB and no host route.
 *   - `masonic` falls back to a stub when the optional dependency is absent,
 *     which is exactly when the dependency-free CSS grid fallback should run.
 * Everything else — panel, gallery, layout, overlays, stylesheets — is real.
 */
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const here = dirname(fileURLToPath(import.meta.url))
const pluginRoot = resolve(here, '../../../..')

/**
 * Locate a resolvable `masonic`, checking the plugin install first and then the
 * sibling preview sandbox, so the virtualised path is reachable before the
 * plugin's own dependency install has finished.
 * @returns The package directory, or `null` when neither location has it.
 */
function findMasonic(): string | null {
  const candidates = [
    resolve(pluginRoot, 'node_modules/masonic'),
    resolve(pluginRoot, '../../dsh-asset-library-preview-sandbox/node_modules/masonic'),
  ]
  return candidates.find(candidate => existsSync(candidate)) ?? null
}

const masonic = findMasonic()

export default defineConfig({
  root: here,
  // The panel is written for the automatic JSX runtime (`jsx: "react-jsx"`),
  // which is what DSH's client build uses. Vite's esbuild must be told the same
  // thing, or the output calls the global `React` that nothing defines.
  esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
  resolve: {
    // One React instance for the whole harness; a duplicated copy would break
    // every hook silently.
    dedupe: ['react', 'react-dom'],
    alias: [
      { find: /^\.\.\/data\/store$/, replacement: resolve(here, 'fake-store.ts') },
      ...(masonic === null
        ? [{ find: /^masonic$/, replacement: resolve(here, 'masonic-missing.ts') }]
        : []),
    ],
  },
  server: {
    host: '127.0.0.1',
    port: 5199,
    strictPort: false,
    fs: { allow: [pluginRoot, resolve(pluginRoot, '../..')] },
  },
  optimizeDeps: {
    include: ['react', 'react-dom/client'],
  },
  build: {
    outDir: resolve(here, '../../../../../dsh-asset-library-preview-sandbox/dist-preview'),
    emptyOutDir: true,
    rollupOptions: { input: resolve(here, 'preview.html') },
  },
})
