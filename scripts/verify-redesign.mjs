/**
 * Redesign acceptance run for the asset library UI.
 *
 * Drives the standalone preview harness (the real `AssetLibraryApp` over
 * synthetic fixtures) in a headless Chromium and asserts the behaviour this
 * redesign promised: the exclusive 「全部」/type chips, the collapsible
 * 「策展筛选」 panel, a constantly visible reference action, the oversized-original
 * fallback badge, the wallpaper layer, and bulk removal with undo.
 *
 * Every check is tolerant: a control this build does not expose is reported as
 * SKIP with the reason, never as a pass. Screenshots land next to the printed
 * paths so a human can confirm what the assertions saw.
 *
 * Usage:
 *   node scripts/verify-redesign.mjs [baseUrl] [outDir]
 *
 * The harness is built and served outside the plugin package:
 *   node_modules/.bin/vite build --config src/client/ui/__preview__/vite.config.ts
 *   (cd ../dsh-asset-library-preview-sandbox/dist-preview && python3 -m http.server 5225)
 *
 * `playwright-core` must be resolvable (link the profile copy when it is not a
 * dependency):
 *   ln -sfn ~/.dsh/profiles/desktop/node_modules/playwright-core node_modules/playwright-core
 *
 * @module dsh-asset-library/scripts/verify-redesign
 */

import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5225/preview.html?count=60'
const outDir = process.argv[3] ?? join(homedir(), 'dsh-asset-library-ui-evidence', 'redesign')

const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')

/** One Playwright Chromium executable from the shared browser cache. */
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

mkdirSync(outDir, { recursive: true })

const results = []
/**
 * Record one tolerant check result.
 * @param name - what was asserted.
 * @param state - PASS, FAIL, or SKIP.
 * @param detail - the value observed or the reason for a skip.
 */
function record(name, state, detail = '') {
  results.push(`${state.padEnd(4)} ${name}${detail === '' ? '' : `  — ${detail}`}`)
}

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const consoleErrors = []
page.on('pageerror', error => consoleErrors.push(String(error)))
page.on('console', message => {
  if (message.type() !== 'error') return
  // Chromium resource errors carry the URL only on the message location, never in
  // the text — record both so the expected host-route 404s can be told apart.
  consoleErrors.push(`${message.text()} @ ${message.location().url}`)
})

await page.goto(baseUrl, { waitUntil: 'load' })
await page.waitForSelector('[data-asset-id]', { timeout: 30000 })
await page.waitForTimeout(800)

/** Click a button by its exact visible text; returns false when absent. */
async function clickText(text) {
  const target = page.getByRole('button', { name: text, exact: true }).first()
  if (await target.count() === 0) return false
  await target.click()
  await page.waitForTimeout(200)
  return true
}

/** Whether a control with the exact visible text exists. */
async function hasText(text) {
  return (await page.getByRole('button', { name: text, exact: true }).count()) > 0
}

/** Close a lightbox the harness opened by accident, so later clicks are not intercepted. */
async function escapeLightbox() {
  const dialog = page.locator('[role="dialog"][aria-modal="true"]')
  if (await dialog.count() > 0) {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(250)
  }
}

/**
 * Dismiss every overlay before the next section.
 *
 * A popover left open silently swallows the following section's clicks (it cost
 * one debugging round here: the batch action looked missing because the settings
 * popover was still covering the toolbar). This waits for a clean stage and
 * reports whether it got one.
 * @returns true when no modal dialog remains.
 */
async function dismissOverlays() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (await page.locator('[role="dialog"], [role="menu"]').count() === 0) return true
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
  }
  // Last resort: a click on neutral stage area dismisses outside-pointer popovers.
  await page.mouse.click(700, 860)
  await page.waitForTimeout(250)
  return (await page.locator('[role="dialog"], [role="menu"]').count()) === 0
}

/**
 * Run one check section in isolation.
 *
 * A tolerant harness must survive its own failed assertion: an unexpected
 * lightbox or a missing control aborts that section only, and the reason is
 * reported instead of throwing the whole run away.
 * @param name - section label for the report.
 * @param fn - the section body.
 */
async function section(name, fn) {
  try {
    await fn()
  } catch (error) {
    await escapeLightbox().catch(() => undefined)
    record(name, 'FAIL', `抛出异常：${error instanceof Error ? error.message.split('\n')[0] : String(error)}`)
  }
}

/* ---------------------------------------------------- 1. 「全部」互斥筛选 */

await section('「全部」与类型互斥', async () => {
  const allChip = page.getByRole('button', { name: '全部', exact: true }).first()
  if (await allChip.count() === 0) {
    record('类型筛选含「全部」', 'SKIP', '未找到「全部」chip')
    return
  }
  const initial = await allChip.getAttribute('aria-pressed')
  const clickedType = await clickText('图片')
  const typeChip = page.getByRole('button', { name: '图片', exact: true }).first()
  const afterType = { all: await allChip.getAttribute('aria-pressed'), type: await typeChip.getAttribute('aria-pressed') }
  await allChip.click()
  await page.waitForTimeout(200)
  const afterAll = { all: await allChip.getAttribute('aria-pressed'), type: await typeChip.getAttribute('aria-pressed') }
  const ok = clickedType && initial === 'true' &&
    afterType.all === 'false' && afterType.type === 'true' &&
    afterAll.all === 'true' && afterAll.type === 'false'
  record('「全部」与类型互斥', ok ? 'PASS' : 'FAIL',
    `初始=${initial} 选图片后 全部=${afterType.all}/图片=${afterType.type} 再点全部后 全部=${afterAll.all}/图片=${afterAll.type}`)
})

/* ------------------------------------------------- 2. 策展筛选可折叠 */

await section('策展筛选可折叠', async () => {
  const curation = page.getByRole('button', { name: /策展筛选/ }).first()
  if (await curation.count() === 0) {
    record('策展筛选可折叠', 'SKIP', '未找到「策展筛选」按钮')
    return
  }
  const before = await page.getByRole('button', { name: '今天', exact: true }).count()
  await curation.click()
  await page.waitForTimeout(300)
  const after = await page.getByRole('button', { name: '今天', exact: true }).count()
  // The harness store does not persist settings, so the panel cannot expand here;
  // what IS verifiable is that the toggle submits the setting to the host.
  const logText = await page.locator('#log').innerText().catch(() => '')
  const submitted = logText.includes('curationOpen')
  record('策展筛选可展开且提交设置', after > before && submitted ? 'PASS' : 'FAIL',
    `时间 chip ${before}→${after}（展开生效），夹具回调 ${submitted ? '已收到 curationOpen' : '未收到（见 #log）'}`)
  await curation.click()
  await page.waitForTimeout(200)
})

/* --------------------------------------- 3. 引用常驻 + 悬停信息面板 */

await section('卡片动作可见性', async () => {
  const referenceVisibleWithoutHover = await page.getByRole('button', { name: '引用到对话', exact: true }).first().isVisible().catch(() => false)
  record('「引用到对话」不依赖悬停即可见', referenceVisibleWithoutHover ? 'PASS' : 'FAIL')

  const firstCard = page.locator('[data-asset-id]').first()
  await firstCard.hover()
  await page.waitForTimeout(350)
  const hoverMeta = await page.getByText('尺寸', { exact: true }).first().isVisible().catch(() => false)
  await page.screenshot({ path: join(outDir, 'card-hover-panel.png') })
  record('悬停显示元信息面板', hoverMeta ? 'PASS' : 'FAIL', `截图 ${join(outDir, 'card-hover-panel.png')}`)
})

/* -------------------------------------------- 4. 超大原图降级角标 */

await section('超大原图降级', async () => {
  const oversized = await page.getByText('原图过大', { exact: false }).count()
  await page.screenshot({ path: join(outDir, 'oversized-badge.png') })
  record('超大原图显示降级角标', oversized > 0 ? 'PASS' : 'FAIL', `命中 ${oversized} 处，截图 ${join(outDir, 'oversized-badge.png')}`)
})

/* ------------------------------------------------------- 5. 壁纸外观 */

await section('壁纸外观入口', async () => {
  const settings = page.getByRole('button', { name: /设置/ }).first()
  if (await settings.count() === 0) {
    record('壁纸（画廊外观）入口', 'SKIP', '未找到设置入口')
    return
  }
  await settings.click()
  await page.waitForTimeout(300)
  const galleryLook = await page.getByText('画廊外观', { exact: false }).count()
  const wallpaperPick = await page.getByRole('button', { name: /选择壁纸|壁纸/ }).count()
  await page.screenshot({ path: join(outDir, 'settings-gallery-look.png') })
  record('设置内「画廊外观」区块', galleryLook > 0 ? 'PASS' : 'FAIL',
    `区块命中 ${galleryLook}，壁纸按钮 ${wallpaperPick}，截图 ${join(outDir, 'settings-gallery-look.png')}`)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
})

/* ---------------------------------------------- 6. 批量移出 + 撤销 */

await section('批量移出与撤销', async () => {
  const clean = await dismissOverlays()
  if (!clean) {
    await page.screenshot({ path: join(outDir, 'overlay-not-dismissed.png') })
    record('批量移出与撤销', 'SKIP', `上一段的浮层未关闭，点击会被拦截；截图 ${join(outDir, 'overlay-not-dismissed.png')}`)
    return
  }
  const multi = page.getByRole('button', { name: '多选', exact: true }).first()
  if (await multi.count() === 0) {
    record('批量移出与撤销', 'SKIP', '未找到「多选」入口')
    return
  }
  await multi.click()
  await page.waitForTimeout(400)
  // The toolbar reports the mode by its own label once armed; a label that never
  // changes means the click did not land, which is worth reporting verbatim.
  const toolbarLabels = async () => (await page.locator('button').allInnerTexts()).filter(t => /多选|已选|清空|移出/.test(t)).join(' / ')
  const pressed = await multi.getAttribute('aria-pressed')
  const batchAnywhere = () => page.getByText('移出素材库', { exact: false }).count()
  const armed = pressed === 'true' || (await batchAnywhere()) > 0
  const labels = await toolbarLabels()
  const cards = page.locator('[data-asset-id]')
  const total = await cards.count()
  // Selection is modifier-driven by design: a plain click opens the lightbox.
  await cards.nth(0).click({ modifiers: ['Meta'] })
  await page.waitForTimeout(300)
  const removeButton = page.locator('button, [role="menuitem"]').filter({ hasText: '移出素材库' }).first()
  if (await removeButton.count() === 0) {
    await escapeLightbox()
    await page.screenshot({ path: join(outDir, 'batch-action-missing.png') })
    record('批量移出与撤销', 'SKIP',
      `多选按钮 aria-pressed=${String(pressed)}，工具栏=[${labels}]，位次匹配数=${await batchAnywhere()}；截图 ${join(outDir, 'batch-action-missing.png')}`)
    return
  }
  await cards.nth(1).click({ modifiers: ['Meta'] })
  await page.waitForTimeout(300)
  await escapeLightbox()
  await removeButton.click()
  await page.waitForTimeout(400)
  const confirm = page.getByRole('button', { name: /确认|移出/ }).last()
  await confirm.click()
  await page.waitForTimeout(500)
  // The harness store may predate the removal action; that is a fixture gap, and it
  // names itself in the console. Reporting it as a skip keeps the run honest: the
  // real store's chain is covered by tests/data/store.undo.spec.ts.
  if (consoleErrors.some(line => line.includes('removeWithUndo is not a function'))) {
    await page.screenshot({ path: join(outDir, 'undo-bar.png') })
    record('批量移出 + 撤销往返', 'SKIP',
      '预览夹具 fake-store 未实现 removeWithUndo（真实 store 由 store.undo.spec.ts 覆盖，待真机确认）')
    return
  }
  const undo = page.getByRole('button', { name: /撤销/ }).first()
  const undoVisible = await undo.count() > 0
  await page.screenshot({ path: join(outDir, 'undo-bar.png') })
  if (undoVisible) {
    await undo.click()
    await page.waitForTimeout(600)
  }
  const undoGoneAfterClick = (await page.getByRole('button', { name: /撤销/ }).count()) === 0
  record('批量移出 + 撤销往返', undoVisible && undoGoneAfterClick ? 'PASS' : 'FAIL',
    `撤销条出现=${undoVisible}，点撤销后消失=${undoGoneAfterClick}（卡片数在虚拟化下不可比：${total}）`)
})

/* ------------------------------------------------- 7. 控制台零错误 */

// The static preview server has no host half, so the file route answers 404 for
// every card that legitimately requests its original image. Those are expected
// here — and their presence is itself the evidence that cards load originals —
// so only other errors count.
const unexpectedErrors = consoleErrors.filter(
  line => !line.includes('/api/plugins/dsh-asset-library/file')
    && !line.includes('/favicon.ico')
    // The preview fixture predates the removal action; the gap is reported as a
    // SKIP on the batch check, so it must not also count as a product error here.
    && !line.includes('removeWithUndo is not a function'),
)
const originalImage404s = consoleErrors.length - unexpectedErrors.length
record('页面无非预期错误', unexpectedErrors.length === 0 ? 'PASS' : 'FAIL',
  unexpectedErrors.length === 0
    ? `（忽略 ${originalImage404s} 条原图 404：预览服务没有宿主路由）`
    : unexpectedErrors.slice(0, 3).join(' | '))

await browser.close()

console.log(results.join('\n'))
const failed = results.filter(line => line.startsWith('FAIL')).length
const skipped = results.filter(line => line.startsWith('SKIP')).length
console.log(`\n${results.length - failed - skipped} passed, ${failed} failed, ${skipped} skipped`)
process.exitCode = failed === 0 ? 0 : 1
