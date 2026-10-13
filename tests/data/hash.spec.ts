import { describe, expect, it } from 'vitest'
import { cheapFingerprint, identify, sha256Hex } from '../../src/client/data/hash.ts'

/**
 * hash.ts 的行为规格：廉价指纹 = size + 首尾各 1MB 的 SHA-256，
 * 完整哈希分块读并回调进度，identify 同时给出两者。
 */

const EDGE = 1024 * 1024

/** 造一个内容确定的 Blob。 */
function blobOf(bytes: Uint8Array): Blob {
  return new Blob([bytes as unknown as BlobPart])
}

/** 造一个 size 字节、首尾段可控的 Blob。 */
function edgeBlob(size: number, headByte: number, tailByte: number): Blob {
  const head = new Uint8Array(Math.min(EDGE, size)).fill(headByte)
  const tailLength = size > EDGE ? Math.min(EDGE, size - EDGE) : 0
  const tail = new Uint8Array(tailLength).fill(tailByte)
  return blobOf(new Uint8Array([...head, ...tail]))
}

describe('cheapFingerprint', () => {
  it('同 size 同首尾 → 同指纹；仅中间不同也相同（廉价指纹的预期行为）', async () => {
    const a = new Uint8Array(3 * EDGE)
    const b = new Uint8Array(3 * EDGE)
    a.fill(7)
    b.fill(7)
    // 只改中间 1MB（不在首尾 1MB 内）
    for (let i = EDGE; i < 2 * EDGE; i += 1) b[i] = 99
    expect(await cheapFingerprint(blobOf(a))).toBe(await cheapFingerprint(blobOf(b)))
  })

  it('首段不同 → 指纹不同', async () => {
    const a = edgeBlob(3 * EDGE, 1, 9)
    const b = edgeBlob(3 * EDGE, 2, 9)
    expect(await cheapFingerprint(a)).not.toBe(await cheapFingerprint(b))
  })

  it('尾段不同 → 指纹不同', async () => {
    const a = edgeBlob(3 * EDGE, 1, 9)
    const b = edgeBlob(3 * EDGE, 1, 8)
    expect(await cheapFingerprint(a)).not.toBe(await cheapFingerprint(b))
  })

  it('size 不同 → 指纹前缀不同', async () => {
    const a = edgeBlob(EDGE, 1, 1)
    const b = edgeBlob(EDGE * 2, 1, 1)
    const [fa, fb] = [await cheapFingerprint(a), await cheapFingerprint(b)]
    expect(fa.startsWith(`${EDGE}-`)).toBe(true)
    expect(fb.startsWith(`${EDGE * 2}-`)).toBe(true)
    expect(fa).not.toBe(fb)
  })

  it('小文件（≤2MB）连续读取全部字节，头尾拼接无重复', async () => {
    const small = blobOf(new Uint8Array([1, 2, 3, 4]))
    const plain = await sha256Hex(small)
    const expected = await cheapFingerprint(small)
    // 4 字节文件：head=全部、tail=空 → 指纹哈希等于完整哈希
    expect(expected).toBe(`4-${plain}`)
  })

  it('空文件也能给出稳定指纹', async () => {
    const empty = new Blob([])
    expect(await cheapFingerprint(empty)).toBe(`0-${await sha256Hex(empty)}`)
  })
})

describe('sha256Hex', () => {
  it('与已知摘要一致（"abc"）', async () => {
    const blob = new Blob(['abc'])
    expect(await sha256Hex(blob)).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })

  it('中文内容按 UTF-8 字节计算且稳定', async () => {
    const a = new Blob(['素材库'])
    const b = new Blob(['素材库'])
    const c = new Blob(['素材'])
    const [ha, hb, hc] = await Promise.all([sha256Hex(a), sha256Hex(b), sha256Hex(c)])
    expect(ha).toBe(hb)
    expect(ha).not.toBe(hc)
    expect(ha).toMatch(/^[0-9a-f]{64}$/)
  })

  it('分块读：大文件仍得到单一摘要且进度回调到 1', async () => {
    const size = 10 * 1024 * 1024
    const big = blobOf(new Uint8Array(size).fill(5))
    const ratios: number[] = []
    const hex = await sha256Hex(big, ratio => ratios.push(ratio))
    expect(hex).toMatch(/^[0-9a-f]{64}$/)
    expect(ratios.length).toBeGreaterThanOrEqual(2) // 4MB 分块 → 至少 3 块
    expect(ratios.at(-1)).toBe(1)
    for (const r of ratios) {
      expect(r).toBeGreaterThan(0)
      expect(r).toBeLessThanOrEqual(1)
    }
    // 单调不减
    const sorted = [...ratios].sort((x, y) => x - y)
    expect(ratios).toEqual(sorted)
  })

  it('内容相同 → 摘要相同；内容不同 → 摘要不同', async () => {
    expect(await sha256Hex(new Blob(['x']))).toBe(await sha256Hex(new Blob(['x'])))
    expect(await sha256Hex(new Blob(['x']))).not.toBe(await sha256Hex(new Blob(['y'])))
  })

  it('crypto.subtle 缺失时抛中文原因', async () => {
    const original = globalThis.crypto
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined })
    try {
      await expect(sha256Hex(new Blob(['abc']))).rejects.toThrow(/crypto\.subtle/)
    } finally {
      Object.defineProperty(globalThis, 'crypto', { configurable: true, value: original })
    }
  })
})

describe('identify', () => {
  it('同时返回 cheap 与 hash，且两个文件内容一致时完全相等', async () => {
    const f1 = new File([new Uint8Array([1, 2, 3, 4, 5])], 'a.bin')
    const f2 = new File([new Uint8Array([1, 2, 3, 4, 5])], 'b.bin')
    const r1 = await identify(f1)
    const r2 = await identify(f2)
    expect(r1.cheap).toBe(r2.cheap)
    expect(r1.hash).toBe(r2.hash)
    expect(r1.cheap).toBe(`5-${r1.hash}`)
  })

  it('内容不同的两个文件在 hash 上可区分', async () => {
    const a = await identify(new File([new Uint8Array([1, 2, 3])], 'a.bin'))
    const b = await identify(new File([new Uint8Array([1, 2, 4])], 'a.bin'))
    expect(a.hash).not.toBe(b.hash)
  })
})
