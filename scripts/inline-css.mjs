/**
 * Fold the extracted stylesheet into the client bundle.
 *
 * The desktop shell evaluates exactly one script per client bundle and resolves
 * requires through its own module table, so a sibling `style.css` would never be
 * fetched and relative chunks would never resolve. This step therefore appends
 * the stylesheet to `lib/client.js` as a runtime-injected `<style>` element and
 * deletes the extracted file, keeping the bundle self-contained.
 *
 * Run by `pnpm run build` right after tsdown.
 *
 * @module dsh-asset-library/scripts/inline-css
 */

import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bundlePath = join(root, 'lib', 'client.js')
const cssPath = join(root, 'lib', 'style.css')

if (!existsSync(bundlePath)) {
  console.error('inline-css: lib/client.js is missing; run tsdown first')
  process.exit(1)
}

if (!existsSync(cssPath)) {
  // A stylesheet is expected; its absence means the extraction step changed.
  console.error('inline-css: lib/style.css is missing, so no styles would ship')
  process.exit(1)
}

const bundle = readFileSync(bundlePath, 'utf8')
const css = readFileSync(cssPath, 'utf8')

/** The footer line the wrapper closes with; the injection goes just before it. */
const footer = '\t\treturn module.exports;'
if (!bundle.includes(footer)) {
  console.error('inline-css: the ModuleLoader footer is missing from lib/client.js')
  process.exit(1)
}

const injection = [
  '\t\t// Injected by scripts/inline-css.mjs: the shell loads one script, so the',
  '\t\t// stylesheet travels inside it as a <style> element.',
  `\t\tvar __dshAssetLibraryCss = ${JSON.stringify(css)};`,
  '\t\t(function injectAssetLibraryStyles() {',
  '\t\t\ttry {',
  "\t\t\t\tvar element = document.createElement('style');",
  "\t\t\t\telement.setAttribute('data-dsh-asset-library', '');",
  '\t\t\t\telement.textContent = __dshAssetLibraryCss;',
  '\t\t\t\tdocument.head.appendChild(element);',
  '\t\t\t} catch (error) {',
  "\t\t\t\tconsole.warn('dsh-asset-library: stylesheet injection failed', error);",
  '\t\t\t}',
  '\t\t})();',
].join('\n')

writeFileSync(bundlePath, bundle.replace(footer, `${injection}\n${footer}`))
rmSync(cssPath)
console.log(`inline-css: folded ${css.length} bytes of CSS into lib/client.js`)
