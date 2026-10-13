import { vi } from 'vitest'

/**
 * 测试替身：jsdom 没有真实解码能力，这里给画布/位图/视频装上可控 stub。
 * 只用于 `tests/**`，不进产物。
 */

/**
 * 让 jsdom 的 `Blob`/`File` 能被 `fake-indexeddb` 正确克隆。
 *
 * 原因：`fake-indexeddb` 直接调用全局 `structuredClone`，而 Node 的 structuredClone
 * 不认识 jsdom 的 Blob 类，会把它退化成普通对象（读回来 `instanceof Blob === false`），
 * 于是「缩略图 Blob 存进 IndexedDB」在 jsdom 下会假性失败。
 *
 * 做法：包装全局 `structuredClone`，克隆前把 jsdom Blob/File 递归换成等价的 Node Blob/File。
 * 必须在任何 `new Blob()` 之前调用。
 */
export async function installNodeBlob(): Promise<void> {
  const buffer = await import('node:buffer')
  Object.defineProperty(globalThis, 'Blob', { configurable: true, writable: true, value: buffer.Blob })
  Object.defineProperty(globalThis, 'File', { configurable: true, writable: true, value: buffer.File })
}

/** 记录 canvas 导出与像素读取次数，供断言。 */
export interface CanvasStats {
  toBlobCalls: number
  convertToBlobCalls: number
  drawImageCalls: number
  getImageDataCalls: number
  revokeCount: number
  createCount: number
}

/** 每个测试用例前重置的统计。 */
export const stats: CanvasStats = {
  toBlobCalls: 0,
  convertToBlobCalls: 0,
  drawImageCalls: 0,
  getImageDataCalls: 0,
  revokeCount: 0,
  createCount: 0,
}

/** 重置统计。 */
export function resetStats(): void {
  stats.toBlobCalls = 0
  stats.convertToBlobCalls = 0
  stats.drawImageCalls = 0
  stats.getImageDataCalls = 0
  stats.revokeCount = 0
  stats.createCount = 0
}

/** 1x1 采样返回的像素（默认不透明红）。 */
export let samplePixel: [number, number, number, number] = [255, 0, 0, 255]

/** 设置 1x1 采样像素。 */
export function setSamplePixel(px: [number, number, number, number]): void {
  samplePixel = px
}

/** 安装画布 stub：getContext/getImageData/toBlob 都可用且确定。 */
export function installCanvasStub(): void {
  const proto = HTMLCanvasElement.prototype
  /** 解析 `#rrggbb` 或 `rgb(a)(...)`。 */
  const parseColor = (value: string): [number, number, number] => {
    const hex = /^#([0-9a-f]{6})$/i.exec(value)
    if (hex) {
      const n = Number.parseInt(hex[1] as string, 16)
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    }
    const rgb = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(value)
    if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
    return [0, 0, 0]
  }

  proto.getContext = vi.fn(function getContext(this: HTMLCanvasElement, kind: string) {
    if (kind !== '2d') return null
    const canvas = this
    const ctx = {
      canvas,
      fillStyle: '#000000',
      font: '',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      fillRect: vi.fn(() => {
        // 把「这张画布的底图色」记到画布自身（而不是 context），
        // 这样主色采样用的新建 context 也能读到同一张画布的颜色。
        // 用闭包里的 ctx 而不是 this：vi.fn 包装后 this 不可靠。
        if (canvas.dataset.__fill === undefined) canvas.dataset.__fill = ctx.fillStyle
      }),
      fillText: vi.fn(),
      drawImage: vi.fn(() => {
        stats.drawImageCalls += 1
      }),
      getImageData: vi.fn((_x: number, _y: number, w: number, h: number) => {
        stats.getImageDataCalls += 1
        const filled = canvas.dataset.__fill
        const [r, g, b] = filled ? parseColor(filled) : samplePixel
        const alpha = filled ? 255 : samplePixel[3]
        const data = new Uint8ClampedArray(w * h * 4)
        for (let i = 0; i < w * h; i += 1) {
          data[i * 4] = r
          data[i * 4 + 1] = g
          data[i * 4 + 2] = b
          data[i * 4 + 3] = alpha
        }
        return { data, width: w, height: h } as ImageData
      }),
    }
    return ctx as unknown as CanvasRenderingContext2D
  }) as unknown as typeof proto.getContext

  proto.toBlob = function toBlob(callback: BlobCallback, type?: string): void {
    stats.toBlobCalls += 1
    callback(new Blob([new Uint8Array([1, 2, 3, 4])], { type: type ?? 'image/webp' }))
  }
}

/** 安装 `createImageBitmap` stub；默认给定 800x600。 */
export function installImageBitmapStub(width = 800, height = 600): void {
  const close = vi.fn()
  Object.defineProperty(globalThis, 'createImageBitmap', {
    configurable: true,
    writable: true,
    value: vi.fn(async () => ({ width, height, close }) as unknown as ImageBitmap),
  })
}

/** 视频 stub 行为配置。 */
export interface VideoStubOptions {
  /** metadata 是否触发（false → 等待超时）。 */
  metadata?: boolean
  /** seeked 是否触发。 */
  seeked?: boolean
  /** metadata 是否触发 error。 */
  error?: boolean
  videoWidth?: number
  videoHeight?: number
  duration?: number
}

/** 最近一次由 `URL.createObjectURL` 产生的对象 URL。 */
export const objectUrls: string[] = []

/** 安装 video 元素 stub 与 objectURL 计数；返回创建次数读取器。 */
export function installVideoStub(options: VideoStubOptions = {}): {
  created: () => number
  lastVideo: () => HTMLVideoElement | undefined
} {
  const video = options.metadata !== false
  const seeked = options.seeked !== false
  let created = 0
  let last: HTMLVideoElement | undefined

  const originalCreateElement = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation(((tag: string, opts?: ElementCreationOptions) => {
    const element = originalCreateElement(tag, opts)
    if (tag.toLowerCase() !== 'video') return element
    created += 1
    // jsdom 的 HTMLVideoElement 缺 videoWidth/currentTime 等只读成员，用类型化子集补齐，
    // 避免在 DOM 对象上堆 `as unknown as` 断言。
    interface VideoStub {
      videoWidth: number
      videoHeight: number
      duration: number
      currentTime: number
      error: { code: number; message: string } | null
    }
    const el = element as unknown as HTMLVideoElement & VideoStub
    last = el
    // jsdom 把这些声明为只读 getter，必须用 defineProperty 覆盖。
    const fixed = (key: keyof VideoStub, value: unknown): void => {
      Object.defineProperty(el, key, { configurable: true, writable: true, value })
    }
    fixed('videoWidth', options.videoWidth ?? 640)
    fixed('videoHeight', options.videoHeight ?? 480)
    fixed('duration', options.duration ?? 12)
    fixed('error', options.error ? { code: 4, message: 'MEDIA_ERR_SRC_NOT_SUPPORTED' } : null)
    el.load = vi.fn()
    // `seeked` 只在 currentTime 被赋值后触发——与真实 `<video>` 一致；
    // 预先定时触发会让「等 seeked」的竞态假性超时。
    let seekTime = 0
    let seekScheduled = false
    Object.defineProperty(el, 'currentTime', {
      configurable: true,
      get: () => seekTime,
      set: (value: number) => {
        seekTime = value
        if (seekScheduled || !seeked) return
        seekScheduled = true
        setTimeout(() => el.dispatchEvent(new Event('seeked')), 0)
      },
    })
    // 事件按宏任务顺序触发，模拟真实 `<video>` 行为。
    if (options.error) {
      setTimeout(() => el.dispatchEvent(new Event('error')), 0)
    } else if (video) {
      setTimeout(() => el.dispatchEvent(new Event('loadedmetadata')), 0)
    }
    return element
  }) as typeof document.createElement)

  const createObjectURL = vi.fn((blob: Blob) => {
    const url = `blob:stub/${objectUrls.length}`
    objectUrls.push(url)
    void blob
    return url
  })
  const revokeObjectURL = vi.fn(() => {
    stats.revokeCount += 1
  })
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: createObjectURL })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: revokeObjectURL })

  return { created: () => created, lastVideo: () => last }
}

/** 构造一个带内容的 File。 */
export function makeFile(name: string, content: string | Uint8Array, type = ''): File {
  const parts: BlobPart[] = [typeof content === 'string' ? content : (content as unknown as BlobPart)]
  return new File(parts, name, { type, lastModified: 1_700_000_000_000 })
}
