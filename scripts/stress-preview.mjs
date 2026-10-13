/**
 * Thousand-item stress measurement for the gallery.
 *
 * Drives the standalone preview harness (the real `AssetLibraryApp` over
 * synthetic fixtures) in a headless Chromium so the numbers come from a real
 * layout engine rather than jsdom: how many nodes the grid keeps in the DOM,
 * how long the first paint of the gallery takes, and the frame cadence while
 * scrolling.
 *
 * Usage:
 *   node scripts/stress-preview.mjs [count] [url]
 *
 * The server is not started here: build the harness first, then serve it. The
 * harness writes outside the plugin package, so the shipped tree stays clean.
 *   node_modules/.bin/vite build --config src/client/ui/__preview__/vite.config.ts
 *   (cd ../dsh-asset-library-preview-sandbox/dist-preview && python3 -m http.server 5222)
 *
 * `playwright-core` must be resolvable from this package (it is not a
 * dependency, to avoid shipping a browser download with the plugin): either
 * install it as a devDependency, or link an existing copy, e.g.
 *   ln -sfn ~/.dsh/profiles/desktop/node_modules/playwright-core node_modules/playwright-core
 *
 * @module dsh-asset-library/scripts/stress-preview
 */

import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const count = Number(process.argv[2] ?? '1000')
const url = process.argv[3] ?? `http://127.0.0.1:5222/preview.html?count=${String(count)}`

const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')

/**
 * Locate one installed Playwright Chromium build.
 * @returns Absolute path of the browser executable.
 * @throws when no build is installed.
 */
function findChromium() {
  const root = join(homedir(), 'Library', 'Caches', 'ms-playwright')
  if (!existsSync(root)) throw new Error(`no Playwright browser cache at ${root}`)
  const builds = readdirSync(root).filter(entry => entry.startsWith('chromium-')).sort()
  for (const build of builds.reverse()) {
    const candidates = [
      join(root, build, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
      join(root, build, 'chrome-mac-arm64', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
      join(root, build, 'chrome-linux', 'chrome'),
    ]
    const found = candidates.find(candidate => existsSync(candidate))
    if (found !== undefined) return found
  }
  throw new Error(`no Chromium executable under ${root}`)
}

const browser = await chromium.launch({
  executablePath: findChromium(),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const started = Date.now()
await page.goto(url, { waitUntil: 'load' })
await page.waitForSelector('[data-asset-id]', { timeout: 30000 })
const firstCardMs = Date.now() - started

// Let lazy images settle before counting, so the numbers describe a steady view.
await page.waitForTimeout(1200)

const beforeScroll = await page.evaluate(() => ({
  nodes: document.querySelectorAll('*').length,
  cards: document.querySelectorAll('[data-asset-id]').length,
}))

/** Sample frame cadence while scrolling the grid in steps. */
const frames = await page.evaluate(async () => {
  const scroller = document.querySelector('[class*="scroller"]') ?? document.scrollingElement
  const samples = []
  let last = performance.now()
  let running = true
  const tick = (now) => {
    samples.push(now - last)
    last = now
    if (running) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  const total = scroller.scrollHeight - scroller.clientHeight
  const steps = 60
  for (let step = 1; step <= steps; step += 1) {
    scroller.scrollTop = (total * step) / steps
    // One frame per step keeps the sampler honest about long frames.
    await new Promise(resolve => requestAnimationFrame(resolve))
  }
  running = false
  return samples.slice(2)
})

await page.waitForTimeout(300)
const afterScroll = await page.evaluate(() => ({
  nodes: document.querySelectorAll('*').length,
  cards: document.querySelectorAll('[data-asset-id]').length,
  heapMb: performance.memory === undefined
    ? null
    : Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
}))

await browser.close()

const sorted = [...frames].sort((a, b) => a - b)
const at = (q) => sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]
const report = {
  素材条数: count,
  首张卡片出现耗时ms: firstCardMs,
  滚动前DOM节点数: beforeScroll.nodes,
  滚动前卡片数: beforeScroll.cards,
  滚动后DOM节点数: afterScroll.nodes,
  滚动后卡片数: afterScroll.cards,
  采样帧数: frames.length,
  帧耗时中位数ms: Number(at(0.5).toFixed(2)),
  帧耗时p95ms: Number(at(0.95).toFixed(2)),
  最长帧ms: Number((sorted[sorted.length - 1] ?? 0).toFixed(2)),
  估算fps中位: at(0.5) === 0 ? null : Number((1000 / at(0.5)).toFixed(1)),
  JS堆MB: afterScroll.heapMb,
}

console.log(JSON.stringify(report, null, 2))
