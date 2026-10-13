import type { AssetKind, PluginSettings, ThumbResult } from './types.ts'

/**
 * 缩略图生成（计划 §4/§5）。
 * 所有 ObjectURL 均在 finally 中 revoke；`fallbackCover` 永不抛错。
 */

/** 视频封面各类型的主题色（与 DSH 主题无关的固定色，用于占位卡）。 */
const KIND_COLORS: Record<AssetKind, string> = {
  image: '#3b82f6',
  video: '#8b5cf6',
  audio: '#ec4899',
  document: '#f59e0b',
  archive: '#14b8a6',
  other: '#64748b',
}

/** 各类型封面卡正面的类型字样。 */
const KIND_GLYPH: Record<AssetKind, string> = {
  image: '图片',
  video: '视频',
  audio: '音频',
  document: '文档',
  archive: '压缩包',
  other: '文件',
}

/** 取不到宽高时的兜底边长。 */
const FALLBACK_EDGE = 512

/** 媒体类错误：`event.type` = error/loadedmetadata/seeked 等，`detail` 为 MediaError 摘要。 */
export class MediaThumbError extends Error {
  /** 触发失败的事件类型。 */
  readonly eventType: string
  /** 触发失败的补充信息（如 MediaError 描述）。 */
  readonly detail: string

  /**
   * @param message 中文原因。
   * @param eventType 事件类型。
   * @param detail 补充信息。
   */
  constructor(message: string, eventType: string, detail = '') {
    super(message)
    this.name = 'MediaThumbError'
    this.eventType = eventType
    this.detail = detail
  }
}

/** 超时错误，携带阶段名以便进度里标注原因。 */
export class ThumbTimeoutError extends Error {
  /** 超时阶段。 */
  readonly stage: string

  /**
   * @param stage 超时阶段。
   * @param timeoutMs 配置的超时毫秒数。
   */
  constructor(stage: string, timeoutMs: number) {
    super(`生成缩略图超时（阶段：${stage}，上限 ${timeoutMs}ms）`)
    this.name = 'ThumbTimeoutError'
    this.stage = stage
  }
}

/** 图片解码错误。 */
export class ImageDecodeError extends Error {
  /**
   * @param message 中文原因。
   */
  constructor(message: string) {
    super(message)
    this.name = 'ImageDecodeError'
  }
}

/** 让出一次宏任务，避免长任务阻塞主线程 > 50ms（计划 §9）。 */
function yieldToMain(): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, 0)
  })
}

/** 创建一个画布上下文：优先 OffscreenCanvas，回退 DOM canvas。 */
function createContext(width: number, height: number): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
  const w = Math.max(1, Math.round(width))
  const h = Math.max(1, Math.round(height))
  if (typeof OffscreenCanvas !== 'undefined') {
    const ctx = new OffscreenCanvas(w, h).getContext('2d')
    if (ctx) return ctx
  }
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (ctx) return ctx
  }
  throw new Error('当前环境没有可用的 2D 画布，无法生成缩略图')
}

/** 把画布导出为 WebP Blob。 */
async function toWebpBlob(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  quality: number,
): Promise<Blob> {
  const canvas = ctx.canvas as HTMLCanvasElement | OffscreenCanvas
  if (typeof (canvas as OffscreenCanvas).convertToBlob === 'function') {
    const blob = await (canvas as OffscreenCanvas).convertToBlob({ type: 'image/webp', quality })
    if (blob.size > 0) return blob
  }
  const html = canvas as HTMLCanvasElement
  if (typeof html.toBlob === 'function') {
    const blob = await new Promise<Blob | null>(resolve => {
      html.toBlob(resolve, 'image/webp', quality)
    })
    if (blob && blob.size > 0) return blob
  }
  throw new Error('画布未能导出 WebP（convertToBlob/toBlob 均不可用或返回空）')
}

/** rgba 分量转 `#rrggbb`（四舍五入，不用位运算以免截断）。 */
function rgbToHex(r: number, g: number, b: number): string {
  const part = (n: number): string =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0')
  return `#${part(r)}${part(g)}${part(b)}`
}

/** 读取指定像素的 rgba；越界或读取失败返回 null。 */
function readPixel(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
): [number, number, number, number] | null {
  const data = ctx.getImageData(x, y, 1, 1).data
  const r = data[0]
  const g = data[1]
  const b = data[2]
  const a = data[3]
  if (r === undefined || g === undefined || b === undefined || a === undefined) return null
  return [r, g, b, a]
}

/** 主色量化调色板（红/橙/黄/绿/青/蓝/紫/粉/白/灰/黑）。 */
const PALETTE = [
  [244, 67, 54],
  [255, 152, 0],
  [255, 235, 59],
  [76, 175, 80],
  [0, 188, 212],
  [33, 150, 243],
  [156, 39, 176],
  [233, 30, 99],
  [255, 255, 255],
  [158, 158, 158],
  [33, 33, 33],
] as const

/** 主色量化的采样网格边长。 */
const QUANT_GRID = 8

/**
 * 主色：优先 1x1 缩放的均值；透明或失败时量化到最近调色板色。
 * 该函数保证返回 `#rrggbb`。
 */
function dominatedColor(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, w: number, h: number): string {
  try {
    const sample = createContext(1, 1)
    sample.drawImage(
      ctx.canvas as CanvasImageSource,
      0,
      0,
      Math.max(1, w),
      Math.max(1, h),
      0,
      0,
      1,
      1,
    )
    const px = readPixel(sample, 0, 0)
    if (px && px[3] >= 8) return rgbToHex(px[0], px[1], px[2])
  } catch {
    /* 1x1 缩放失败（canvas 为 stub 或 drawImage 不可用）→ 走量化路径 */
  }
  try {
    const grid = QUANT_GRID
    const sample = createContext(grid, grid)
    sample.drawImage(ctx.canvas as CanvasImageSource, 0, 0, Math.max(1, w), Math.max(1, h), 0, 0, grid, grid)
    let best = PALETTE[0] as readonly [number, number, number]
    let bestDistance = Number.POSITIVE_INFINITY
    for (let y = 0; y < grid; y += 1) {
      for (let x = 0; x < grid; x += 1) {
        const px = readPixel(sample, x, y)
        if (!px || px[3] < 8) continue
        for (const color of PALETTE) {
          const dr = px[0] - color[0]
          const dg = px[1] - color[1]
          const db = px[2] - color[2]
          const distance = dr * dr + dg * dg + db * db
          if (distance < bestDistance) {
            bestDistance = distance
            best = color
          }
        }
      }
    }
    return rgbToHex(best[0], best[1], best[2])
  } catch {
    /* 量化同样失败（stub 环境）→ 返回中性色，不抛错 */
    return '#888888'
  }
}

/** 按长边 maxEdge 等比缩放，至少 1px。 */
function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const safeEdge = Number.isFinite(maxEdge) && maxEdge > 0 ? maxEdge : FALLBACK_EDGE
  const longest = Math.max(width, height)
  const ratio = longest > safeEdge ? safeEdge / longest : 1
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) }
}

/** 把源（ImageBitmap/视频）按长边上限画进 WebP Blob。 */
async function drawToThumb(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxEdge: number,
  quality: number,
): Promise<ThumbResult> {
  const w = Math.max(1, Math.round(sourceWidth))
  const h = Math.max(1, Math.round(sourceHeight))
  const ctx = createContext(w, h)
  ctx.drawImage(source, 0, 0, w, h)
  const dominantColor = dominatedColor(ctx, w, h)
  const fitted = fitWithin(w, h, maxEdge)
  const outCtx = createContext(fitted.width, fitted.height)
  outCtx.drawImage(ctx.canvas as CanvasImageSource, 0, 0, w, h, 0, 0, fitted.width, fitted.height)
  const blob = await toWebpBlob(outCtx, quality)
  return { blob, width: w, height: h, dominantColor }
}

/**
 * 图片缩略图：`createImageBitmap` → 画布 → `image/webp`。
 * @param file 图片 Blob/File。
 * @param maxEdge 长边上限（px）。
 * @param quality WebP 质量（0..1）。
 * @returns 缩略图、原始宽高与主色。
 * @throws 解码失败或画布不可用时抛 {@link ImageDecodeError}（中文原因）。
 */
export async function imageThumb(file: Blob, maxEdge: number, quality: number): Promise<ThumbResult> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch (e) {
    throw new ImageDecodeError(`图片解码失败（${file.type || '未知类型'}，${file.size} 字节）：${e instanceof Error ? e.message : String(e)}`)
  }
  try {
    const width = bitmap.width
    const height = bitmap.height
    if (width <= 0 || height <= 0) {
      throw new ImageDecodeError(`图片解码结果尺寸非法（${width}x${height}）`)
    }
    return await drawToThumb(bitmap, width, height, maxEdge, quality)
  } finally {
    bitmap.close()
  }
}

/**
 * 等到 DOM 事件触发；同时监听 `error`，让加载失败立刻以可读原因失败而不是干等超时。
 * @param target 事件目标（video 元素）。
 * @param type 期望事件名。
 * @param timeoutMs 超时上限。
 * @param stage 阶段名，用于错误与超时文案。
 */
function waitForEvent(target: EventTarget, type: string, timeoutMs: number, stage: string): Promise<Event> {
  return new Promise<Event>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const cleanup = (): void => {
      target.removeEventListener(type, onEvent)
      target.removeEventListener('error', onError)
      if (timer !== undefined) clearTimeout(timer)
    }
    const onEvent = (event: Event): void => {
      cleanup()
      resolve(event)
    }
    const onError = (event: Event): void => {
      cleanup()
      const mediaError = (event.target as HTMLVideoElement | null)?.error
      reject(
        new MediaThumbError(
          `视频加载失败（阶段：${stage}）`,
          'error',
          mediaError ? `MediaError code=${mediaError.code}` : '',
        ),
      )
    }
    target.addEventListener(type, onEvent)
    target.addEventListener('error', onError)
    timer = setTimeout(() => {
      cleanup()
      reject(new ThumbTimeoutError(stage, timeoutMs))
    }, timeoutMs)
  })
}

/**
 * 视频首帧缩略图：`URL.createObjectURL` + muted/playsInline 的 `<video>`，
 * 等 `loadedmetadata` → `currentTime = min(seekRatio * duration, 1s)` → 等 `seeked` → 抓帧。
 * @param file 视频 Blob/File。
 * @param opts 长边上限、WebP 质量、定位比例与超时上限。
 * @returns 缩略图、视频像素宽高、时长（秒）与主色。
 * @throws 元数据/定位超时或加载失败时抛出（含超时阶段）；调用方据此回退封面卡。
 */
export async function videoThumb(
  file: Blob,
  opts: { maxEdge: number; quality: number; seekRatio: number; timeoutMs: number },
): Promise<ThumbResult & { durationMs: number }> {
  if (typeof document === 'undefined') {
    throw new MediaThumbError('当前环境没有 document，无法创建 video 元素', 'create')
  }
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'metadata'
  video.src = url
  try {
    await waitForEvent(video, 'loadedmetadata', opts.timeoutMs, 'loadedmetadata')
    await yieldToMain()
    const duration = Number.isFinite(video.duration) ? video.duration : 0
    const ratio = Number.isFinite(opts.seekRatio) ? opts.seekRatio : 0
    video.currentTime = Math.max(0, Math.min(ratio * duration, 1))
    await waitForEvent(video, 'seeked', opts.timeoutMs, 'seeked')
    const width = video.videoWidth
    const height = video.videoHeight
    if (width <= 0 || height <= 0) {
      throw new MediaThumbError(`视频尺寸不可用（${width}x${height}）`, 'seeked')
    }
    const result = await drawToThumb(video, width, height, opts.maxEdge, opts.quality)
    return { ...result, durationMs: Math.round(duration * 1000) }
  } finally {
    // 关键：任何路径都必须断开 src 并 revoke，避免 blob 泄漏。
    video.removeAttribute('src')
    try {
      video.load()
    } catch {
      /* stub video 可能没有 load；此处只为触发资源释放 */
    }
    URL.revokeObjectURL(url)
  }
}

/**
 * 类型封面卡（图片/视频失败时的兜底，文档/音频/压缩包的默认封面）。
 * 用 canvas 绘制类型色背景 + 扩展名大字；**永不抛错**，画布不可用时返回内联 SVG Blob。
 * @param kind 素材类型。
 * @param name 文件名（用于取扩展名大字）。
 * @returns 缩略图结果；`width`/`height` 为 512×512 的正方形占位。
 * @throws 不抛错。
 */
export async function fallbackCover(kind: AssetKind, name: string): Promise<ThumbResult> {
  const color = KIND_COLORS[kind] ?? KIND_COLORS.other
  const label = extractExtLabel(name)
  try {
    const ctx = createContext(FALLBACK_EDGE, FALLBACK_EDGE)
    ctx.fillStyle = color
    ctx.fillRect(0, 0, FALLBACK_EDGE, FALLBACK_EDGE)
    try {
      ctx.fillStyle = 'rgba(255,255,255,0.16)'
      ctx.fillRect(0, FALLBACK_EDGE - 120, FALLBACK_EDGE, 120)
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 96px system-ui, -apple-system, "PingFang SC", sans-serif'
      ctx.fillText(label, FALLBACK_EDGE / 2, FALLBACK_EDGE / 2 - 40)
      ctx.font = '40px system-ui, -apple-system, "PingFang SC", sans-serif'
      ctx.fillText(KIND_GLYPH[kind] ?? KIND_GLYPH.other, FALLBACK_EDGE / 2, FALLBACK_EDGE - 60)
    } catch {
      /* 文本绘制失败（stub 画布缺 fillText）不影响底图 */
    }
    let dominantColor = color
    try {
      const px = readPixel(ctx, 0, 0)
      if (px && px[3] > 0) dominantColor = rgbToHex(px[0], px[1], px[2])
    } catch {
      /* 读不到像素就用类型色 */
    }
    const blob = await toWebpBlob(ctx, 0.9)
    return { blob, width: FALLBACK_EDGE, height: FALLBACK_EDGE, dominantColor }
  } catch {
    // 最后的兜底：内联 SVG，任何环境都能构造出 Blob。
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${FALLBACK_EDGE}" height="${FALLBACK_EDGE}" viewBox="0 0 ${FALLBACK_EDGE} ${FALLBACK_EDGE}"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" fill="#ffffff" font-family="sans-serif" font-size="96" font-weight="bold" text-anchor="middle" dominant-baseline="middle">${escapeXml(label)}</text></svg>`
    return {
      blob: new Blob([svg], { type: 'image/svg+xml' }),
      width: FALLBACK_EDGE,
      height: FALLBACK_EDGE,
      dominantColor: color,
    }
  }
}

/** 取扩展名大字（无扩展名时用类型首字）。 */
function extractExtLabel(name: string): string {
  const dot = name.lastIndexOf('.')
  const ext = dot > 0 ? name.slice(dot + 1).trim() : ''
  return (ext || '?').slice(0, 4).toUpperCase()
}

/** 转义 SVG 文本节点中的特殊字符。 */
function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, ch => {
    switch (ch) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      default:
        return '&apos;'
    }
  })
}

/**
 * 按类型分派缩略图生成，并按计划 §13.5 在图片/视频失败时回退封面卡。
 * @param file 源文件。
 * @param kind 已判定的类型。
 * @param s 设置（长边/质量/定位比例/超时）。
 * @returns 一定成功返回一个缩略图结果（失败路径走封面卡，不抛错）。
 */
export async function thumbnailFor(
  file: File,
  kind: AssetKind,
  s: PluginSettings,
): Promise<ThumbResult & { durationMs?: number }> {
  if (kind === 'image') {
    try {
      return await imageThumb(file, s.thumbMaxEdge, s.thumbQuality)
    } catch {
      // 解码失败/画布不可用 → 类型封面卡（不抛错），进度里由调用方标注原因。
      return fallbackCover(kind, file.name)
    }
  }
  if (kind === 'video') {
    try {
      return await videoThumb(file, {
        maxEdge: s.thumbMaxEdge,
        quality: s.thumbQuality,
        seekRatio: s.videoSeekRatio,
        timeoutMs: s.videoTimeoutMs,
      })
    } catch {
      // 超时/解码失败 → 类型封面卡（不抛错），进度里由调用方标注原因。
      return fallbackCover(kind, file.name)
    }
  }
  return fallbackCover(kind, file.name)
}
