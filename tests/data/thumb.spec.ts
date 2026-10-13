// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fallbackCover,
  imageThumb,
  thumbnailFor,
  videoThumb,
} from '../../src/client/data/thumb.ts'
import { DEFAULT_SETTINGS } from '../../src/client/data/settings.ts'
import {
  installCanvasStub,
  installNodeBlob,
  installImageBitmapStub,
  installVideoStub,
  makeFile,
  resetStats,
  setSamplePixel,
  stats,
} from './utils.ts'

/**
 * thumb.ts 的行为规格：jsdom 没有真实解码，用 stub 断言
 * 输出尺寸/主色/WebP 类型、objectURL 成对回收、视频超时回退封面卡且不抛。
 */

/** 用画布 stub 造一张「图片」。 */
function imageFile(name = 'photo.png'): File {
  return makeFile(name, new Uint8Array([1, 2, 3, 4]), 'image/png')
}

beforeEach(async () => {
  await installNodeBlob()
  resetStats()
  installCanvasStub()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('imageThumb', () => {
  it('按长边 maxEdge 等比缩小，返回原始宽高与主色', async () => {
    installImageBitmapStub(800, 600)
    setSamplePixel([255, 0, 0, 255])
    const result = await imageThumb(imageFile(), 512, 0.85)
    expect(result.width).toBe(800)
    expect(result.height).toBe(600)
    expect(result.dominantColor).toBe('#ff0000')
    expect(result.blob).toBeInstanceOf(Blob)
    expect(result.blob.type).toBe('image/webp')
    expect(result.blob.size).toBeGreaterThan(0)
  })

  it('长边不足 maxEdge 时不放大', async () => {
    installImageBitmapStub(100, 50)
    const result = await imageThumb(imageFile(), 512, 0.85)
    expect(result.width).toBe(100)
    expect(result.height).toBe(50)
  })

  it('竖图按高边缩小', async () => {
    installImageBitmapStub(600, 1200)
    await imageThumb(imageFile(), 512, 0.85)
    // 输出画布由 fitWithin 决定：1200 → 512，宽 256
    expect(stats.drawImageCalls).toBeGreaterThanOrEqual(2)
  })

  it('主色随采样像素变化', async () => {
    installImageBitmapStub(10, 10)
    setSamplePixel([0, 128, 255, 255])
    const result = await imageThumb(imageFile(), 512, 0.85)
    expect(result.dominantColor).toBe('#0080ff')
  })

  it('透明采样时量化到调色板色（不抛）', async () => {
    installImageBitmapStub(10, 10)
    setSamplePixel([255, 0, 0, 0])
    const result = await imageThumb(imageFile(), 512, 0.85)
    expect(result.dominantColor).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('解码失败抛中文原因', async () => {
    Object.defineProperty(globalThis, 'createImageBitmap', {
      configurable: true,
      writable: true,
      value: vi.fn(async () => {
        throw new Error('boom')
      }),
    })
    await expect(imageThumb(imageFile('broken.png'), 512, 0.85)).rejects.toThrow(/图片解码失败/)
  })

  it('尺寸非法抛中文原因', async () => {
    installImageBitmapStub(0, 0)
    await expect(imageThumb(imageFile('zero.png'), 512, 0.85)).rejects.toThrow(/尺寸非法/)
  })

  it('解码成功后释放 ImageBitmap', async () => {
    const close = vi.fn()
    Object.defineProperty(globalThis, 'createImageBitmap', {
      configurable: true,
      writable: true,
      value: vi.fn(async () => ({ width: 20, height: 20, close }) as unknown as ImageBitmap),
    })
    await imageThumb(imageFile(), 512, 0.85)
    expect(close).toHaveBeenCalledTimes(1)
  })
})

describe('videoThumb', () => {
  it('metadata → seek → 抓帧，得到像素宽高与时长', async () => {
    installVideoStub({ duration: 12, videoWidth: 640, videoHeight: 480 })
    const result = await videoThumb(makeFile('clip.mp4', new Uint8Array([1]), 'video/mp4'), {
      maxEdge: 512,
      quality: 0.85,
      seekRatio: 0.1,
      timeoutMs: 200,
    })
    expect(result.width).toBe(640)
    expect(result.height).toBe(480)
    expect(result.durationMs).toBe(12000)
    expect(result.blob.type).toBe('image/webp')
  })

  it('定位时间为 min(ratio*duration, 1s)：ratio 0.1 × 12s = 1.2s → 夹到 1s', async () => {
    const stub = installVideoStub({ duration: 12 })
    await videoThumb(makeFile('clip.mp4', new Uint8Array([1]), 'video/mp4'), {
      maxEdge: 512,
      quality: 0.85,
      seekRatio: 0.1,
      timeoutMs: 200,
    })
    expect(stub.lastVideo()?.currentTime).toBe(1)
  })

  it('短视频按比例定位（0.1 × 2s = 0.2s，不触发 1s 夹断）', async () => {
    const stub = installVideoStub({ duration: 2 })
    await videoThumb(makeFile('short.mp4', new Uint8Array([1]), 'video/mp4'), {
      maxEdge: 512,
      quality: 0.85,
      seekRatio: 0.1,
      timeoutMs: 200,
    })
    expect(stub.lastVideo()?.currentTime).toBeCloseTo(0.2, 5)
  })

  it('objectURL 在成功路径被 revoke 一次', async () => {
    installVideoStub({})
    await videoThumb(makeFile('clip.mp4', new Uint8Array([1]), 'video/mp4'), {
      maxEdge: 512,
      quality: 0.85,
      seekRatio: 0.1,
      timeoutMs: 200,
    })
    expect(stats.revokeCount).toBe(1)
  })

  it('metadata 超时 → 抛超时错误，且 objectURL 仍被 revoke', async () => {
    installVideoStub({ metadata: false })
    await expect(
      videoThumb(makeFile('stuck.mp4', new Uint8Array([1]), 'video/mp4'), {
        maxEdge: 512,
        quality: 0.85,
        seekRatio: 0.1,
        timeoutMs: 30,
      }),
    ).rejects.toThrow(/超时（阶段：loadedmetadata/)
    expect(stats.revokeCount).toBe(1)
  })

  it('seeked 超时 → 抛超时错误，且 objectURL 仍被 revoke', async () => {
    installVideoStub({ seeked: false })
    await expect(
      videoThumb(makeFile('stuck2.mp4', new Uint8Array([1]), 'video/mp4'), {
        maxEdge: 512,
        quality: 0.85,
        seekRatio: 0.1,
        timeoutMs: 30,
      }),
    ).rejects.toThrow(/超时（阶段：seeked/)
    expect(stats.revokeCount).toBe(1)
  })

  it('加载 error → 抛加载失败（含阶段），objectURL 被 revoke', async () => {
    installVideoStub({ error: true })
    await expect(
      videoThumb(makeFile('bad.mp4', new Uint8Array([1]), 'video/mp4'), {
        maxEdge: 512,
        quality: 0.85,
        seekRatio: 0.1,
        timeoutMs: 100,
      }),
    ).rejects.toThrow(/视频加载失败/)
    expect(stats.revokeCount).toBe(1)
  })

  it('尺寸为 0 → 抛中文原因且 revoke', async () => {
    installVideoStub({ videoWidth: 0, videoHeight: 0 })
    await expect(
      videoThumb(makeFile('zero.mp4', new Uint8Array([1]), 'video/mp4'), {
        maxEdge: 512,
        quality: 0.85,
        seekRatio: 0.1,
        timeoutMs: 100,
      }),
    ).rejects.toThrow(/视频尺寸不可用/)
    expect(stats.revokeCount).toBe(1)
  })
})

describe('fallbackCover', () => {
  it('画布可用时给出 512×512 的 WebP 封面卡与类型色', async () => {
    // 封面主色取自类型色（画布底图），不由采样像素决定
    const result = await fallbackCover('document', '报告.pdf')
    expect(result.width).toBe(512)
    expect(result.height).toBe(512)
    expect(result.blob.type).toBe('image/webp')
    // document 的类型色（与 image 的 #3b82f6 不同）
    expect(result.dominantColor).toBe('#f59e0b')
  })

  it('画布完全不可用时退回内联 SVG Blob（永不抛错）', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const result = await fallbackCover('archive', 'data.zip')
    expect(result.blob.type).toBe('image/svg+xml')
    expect(result.dominantColor).toBe('#14b8a6')
    expect(result.width).toBe(512)
    expect(result.height).toBe(512)
  })

  it('极端文件名不会抛错（SVG 转义）', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const result = await fallbackCover('other', '<a&b>.x"y')
    expect(result.blob.size).toBeGreaterThan(0)
  })

  it('六种类型各有自己的颜色（不会抛错）', async () => {
    const colors = new Set<string>()
    for (const kind of ['image', 'video', 'audio', 'document', 'archive', 'other'] as const) {
      const r = await fallbackCover(kind, 'x.bin')
      colors.add(r.dominantColor)
    }
    expect(colors.size).toBe(6)
  })
})

describe('thumbnailFor 分派', () => {
  it('image → imageThumb 路径', async () => {
    installImageBitmapStub(400, 300)
    const result = await thumbnailFor(imageFile(), 'image', DEFAULT_SETTINGS)
    expect(result.width).toBe(400)
    expect(result.height).toBe(300)
  })

  it('video 超时 → 回退封面卡且不抛，并 revoke objectURL', async () => {
    installVideoStub({ metadata: false })
    const result = await thumbnailFor(makeFile('stuck.mp4', new Uint8Array([1]), 'video/mp4'), 'video', {
      ...DEFAULT_SETTINGS,
      videoTimeoutMs: 30,
    })
    expect(result.width).toBe(512)
    expect(result.height).toBe(512)
    expect(result.blob.type).toBe('image/webp')
    expect(stats.revokeCount).toBe(1)
  })

  it('video 成功 → 带 durationMs', async () => {
    installVideoStub({ duration: 30 })
    const result = await thumbnailFor(makeFile('ok.mp4', new Uint8Array([1]), 'video/mp4'), 'video', {
      ...DEFAULT_SETTINGS,
      videoTimeoutMs: 300,
    })
    expect(result.durationMs).toBe(30000)
  })

  it('document / audio / archive / other → 封面卡', async () => {
    const pdf = await thumbnailFor(makeFile('a.pdf', new Uint8Array([1]), 'application/pdf'), 'document', DEFAULT_SETTINGS)
    expect(pdf.blob.type).toBe('image/webp')
    expect(pdf.width).toBe(512)
    const mp3 = await thumbnailFor(makeFile('a.mp3', new Uint8Array([1]), 'audio/mpeg'), 'audio', DEFAULT_SETTINGS)
    expect(mp3.blob.size).toBeGreaterThan(0)
    const zip = await thumbnailFor(makeFile('a.zip', new Uint8Array([1]), 'application/zip'), 'archive', DEFAULT_SETTINGS)
    expect(zip.blob.size).toBeGreaterThan(0)
    const bin = await thumbnailFor(makeFile('a.bin', new Uint8Array([1])), 'other', DEFAULT_SETTINGS)
    expect(bin.blob.size).toBeGreaterThan(0)
  })

  it('图片解码失败 → 封面卡兜底（thumbnailFor 不抛）', async () => {
    Object.defineProperty(globalThis, 'createImageBitmap', {
      configurable: true,
      writable: true,
      value: vi.fn(async () => {
        throw new Error('bad image')
      }),
    })
    const result = await thumbnailFor(imageFile('broken.png'), 'image', DEFAULT_SETTINGS)
    expect(result.width).toBe(512)
    expect(result.blob.size).toBeGreaterThan(0)
  })
})
