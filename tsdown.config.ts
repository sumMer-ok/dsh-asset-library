/**
 * Bundle the client half into the platform's `window.__ModuleLoader__` contract.
 *
 * The desktop shell loads client bundles by evaluating a single script that
 * calls `window.__ModuleLoader__.load({ id, factory })`; `react`,
 * `react-dom` and every `@deepseek-ai/*` package are supplied by the platform's
 * own `require`, so they stay external and are never inlined.
 */
import { defineConfig } from 'tsdown'

/** Must equal the package name: client-module keying and the bundle patch row both use it. */
const PLUGIN_ID = 'dsh-asset-library'

/** Module ids the platform's `require` provides; bundling any of them breaks the shell. */
const PLATFORM_EXTERNAL = [
  /^react$/,
  /^react-dom$/,
  /^react\/jsx-runtime$/,
  /^react-dom\/client$/,
  /^@deepseek-ai\//,
]

export default defineConfig({
  entry: { client: 'src/client/index.tsx' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  // The host half is emitted by `tsc` into the same directory; tsdown must not wipe it.
  clean: false,
  dts: false,
  sourcemap: false,
  hash: false,
  outExtensions: () => ({ js: '.js' }),
  deps: { neverBundle: PLATFORM_EXTERNAL },
  // One extracted stylesheet; `scripts/inline-css.mjs` folds it into the bundle
  // afterwards, because the shell only ever evaluates this one script.
  css: { splitting: false, fileName: 'style.css' },
  outputOptions: {
    entryFileNames: 'client.js',
    // The shell evaluates ONE script: a split chunk would be required through the
    // platform `require`, which only resolves platform module ids. The masonry
    // library is therefore inlined even though the UI loads it dynamically, so
    // its absence at runtime still degrades to the dependency-free grid.
    codeSplitting: false,
  },
  banner: {
    js: [
      `window.__ModuleLoader__.load({ id: ${JSON.stringify(PLUGIN_ID)},`,
      '\tfactory: (require) => {',
      '\t\tvar module = { exports: {} };',
      '\t\tvar exports = module.exports;',
    ].join('\n'),
  },
  footer: {
    js: ['\t\treturn module.exports;', '\t}', '});'].join('\n'),
  },
})
