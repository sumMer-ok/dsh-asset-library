/**
 * Visual verification for the exhibition-wall card and gallery work.
 *
 * Drives the built harness in a headless Chromium and asserts what a screenshot
 * alone cannot: that image cards really request the full-resolution file (not the
 * 512 px thumbnail), that the degraded badges appear for the oversized and
 * unreadable cases, that the hover control board becomes opaque-visible with
 * theme-resolved colours, and that the wallpaper mask actually tracks the prop.
 *
 * Usage:
 *   node src/client/ui/__preview__/serve.mjs 5224 &
 *   node src/client/ui/__preview__/verify.mjs [baseUrl] [outDir]
 *
 * @module dsh-asset-library/preview/verify
 */

import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')

const base = (process.argv[2] ?? 'http://127.0.0.1:5224').replace(/\/$/, '')
const outDir = process.argv[3] ?? '/tmp/al-redesign-shots'
mkdirSync(outDir, { recursive: true })

/**
 * Locate an installed Playwright Chromium build.
 * @returns Absolute path of the executable.
 * @throws when no build is installed.
 */
function findChromium() {
  const root = join(homedir(), 'Library', 'Caches', 'ms-playwright')
  if (!existsSync(root)) throw new Error(`no Playwright browser cache at ${root}`)
  for (const build of readdirSync(root).filter(entry => entry.startsWith('chromium-')).sort().reverse()) {
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

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 2 })

const consoleErrors = []
page.on('console', message => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})
page.on('pageerror', error => consoleErrors.push(String(error)))

/** Failed responses, so an intentional harness 404 is not mistaken for a bug. */
const failedResponses = []
page.on('response', response => {
  if (response.status() >= 400) failedResponses.push(`${String(response.status())} ${response.url()}`)
})

const report = {}

/* ---------------------------------------------------------------- card scene */

await page.goto(`${base}/preview.html?count=24`, { waitUntil: 'load' })
await page.waitForSelector('[data-asset-id]')
// Originals are read from the harness route; give the decode a moment.
await page.waitForTimeout(1500)

report.heroImages = await page.$$eval('[data-asset-id] [data-al-hero]', images =>
  images.map(image => ({
    source: image.getAttribute('data-al-hero'),
    naturalWidth: image.naturalWidth,
    error: image.getAttribute('src') !== null && image.naturalWidth === 0,
  })),
)
report.originalLoads = report.heroImages.filter(entry => entry.source === 'original' && entry.naturalWidth > 512).length
report.thumbnailHeroes = report.heroImages.filter(entry => entry.source === 'thumbnail').length
report.badges = await page.$$eval('[data-al-badge]', badges => badges.map(badge => badge.getAttribute('data-al-badge')))
report.cardCount = await page.locator('[data-asset-id]').count()

// The light picture is the contrast worst case: hover it and read the resolved
// colours of both the persistent action and a control-board button.
const lightCard = page.locator('[data-asset-id="preview-light"]')
await lightCard.hover()
await page.waitForTimeout(450)
report.veilOpacity = await lightCard.locator('[data-al-veil]').evaluate(element => getComputedStyle(element).opacity)
report.colors = await lightCard.evaluate(card => {
  const read = element => {
    const style = getComputedStyle(element)
    return { background: style.backgroundColor, color: style.color, border: style.borderTopColor }
  }
  const reference = card.querySelector('[data-al-reference]')
  const veilButton = card.querySelector('[data-al-veil-panel] button')
  return {
    reference: reference === null ? null : read(reference),
    veilAction: veilButton === null ? null : read(veilButton),
  }
})
await lightCard.screenshot({ path: join(outDir, '01-light-card-hover.png') })

// The two degraded cards, each framed on its own.
await page.locator('[data-asset-id="preview-oversized"]').screenshot({ path: join(outDir, '02-oversized-card.png') })
await page.locator('[data-asset-id="preview-unreadable"]').screenshot({ path: join(outDir, '03-unreadable-card.png') })
await page.locator('[data-asset-id="preview-missing"]').screenshot({ path: join(outDir, '04-missing-card.png') })
await page.screenshot({ path: join(outDir, '05-gallery-overview.png') })

// The menu must stay readable over a picture: open it on the light card.
await lightCard.locator('button[aria-label="更多操作"]').click()
await page.waitForTimeout(250)
report.menuVisible = await page.locator('[role="menu"]').first().isVisible()
report.menuColors = await page.locator('[role="menu"]').first().evaluate(menu => {
  const style = getComputedStyle(menu)
  const item = menu.querySelector('button[role="menuitem"]')
  return {
    background: style.backgroundColor,
    color: style.color,
    firstItem: item === null ? null : getComputedStyle(item).color,
    labels: [...menu.querySelectorAll('button[role="menuitem"]')].map(entry => entry.textContent),
  }
})
await page.screenshot({ path: join(outDir, '06-card-menu.png') })

/* ----------------------------------------------------------- wallpaper scene */

await page.goto(`${base}/preview.html?scene=wallpaper`, { waitUntil: 'load' })
await page.waitForSelector('[data-asset-id]')
await page.waitForTimeout(1500)

const maskOf = () =>
  page.evaluate(() => {
    const stage = document.querySelector('[class*="stage"]')
    const mask = stage === null ? null : stage.querySelector('[class*="wallpaperMask"]')
    const wall = stage === null ? null : stage.querySelector('[class*="wallpaper"]')
    return {
      maskOpacity: mask === null ? null : getComputedStyle(mask).opacity,
      maskVariable: mask === null ? null : mask.style.getPropertyValue('--al-wallpaper-mask'),
      wallpaper: wall === null ? null : getComputedStyle(wall).backgroundImage.slice(0, 32),
    }
  })

report.wallpaperMask35 = await maskOf()
await page.screenshot({ path: join(outDir, '07-wallpaper-mask-35.png') })

const slider = page.locator('input[type="range"]')
const setMask = async value => {
  // React tracks the value property, so the assignment has to go through the
  // native setter before the synthetic `input` event is dispatched.
  await slider.evaluate((element, next) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(element, String(next))
    element.dispatchEvent(new Event('input', { bubbles: true }))
  }, value)
  await page.waitForTimeout(220)
}

await setMask(0)
report.wallpaperMask0 = await maskOf()
await page.screenshot({ path: join(outDir, '08-wallpaper-mask-0.png') })

await setMask(90)
report.wallpaperMask90 = await maskOf()
await page.screenshot({ path: join(outDir, '09-wallpaper-mask-90.png') })

await setMask(35)
const wallCard = page.locator('[data-asset-id="preview-light"]')
await wallCard.hover()
await page.waitForTimeout(400)
await page.screenshot({ path: join(outDir, '10-wallpaper-card-hover.png') })

report.consoleErrors = consoleErrors
report.failedResponses = failedResponses

// `prefers-reduced-motion: reduce` must switch the motion off, not merely shorten
// it: the entrance animation, the selection pop, and every transition.
await page.emulateMedia({ reducedMotion: 'reduce' })
await page.goto(`${base}/preview.html?count=8`, { waitUntil: 'load' })
await page.waitForSelector('[data-asset-id]')
await page.waitForTimeout(600)
report.reducedMotion = await page.locator('[data-asset-id]').first().evaluate(card => {
  const style = getComputedStyle(card)
  const reference = card.querySelector('[data-al-reference]')
  return {
    cardAnimation: style.animationName,
    cardTransition: style.transitionDuration,
    referenceTransition: reference === null ? null : getComputedStyle(reference).transitionDuration,
  }
})

await browser.close()

report.screenshots = readdirSync(outDir).sort().map(name => join(outDir, name))
console.log(JSON.stringify(report, null, 2))
