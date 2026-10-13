/**
 * 内容指纹与完整哈希（计划 §4）。
 * 只用 `crypto.subtle`（桌面渲染进程 origin `dsh-app://app` 为 secure context）。
 */

/** 廉价指纹取首尾各 1MB。 */
const CHEAP_EDGE_BYTES = 1024 * 1024
/** 完整哈希的分块读取粒度，兼顾内存与进度回调密度。 */
const HASH_CHUNK_BYTES = 4 * 1024 * 1024

/** 取 subtle 实现；缺失时给出可读原因而非静默降级。 */
function subtle(): SubtleCrypto {
  const c: Crypto | undefined = globalThis.crypto
  if (!c?.subtle) {
    throw new Error('当前环境不支持 crypto.subtle，无法计算素材哈希')
  }
  return c.subtle
}

/** 字节数组转小写十六进制。 */
function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let out = ''
  for (const b of bytes) out += b.toString(16).padStart(2, '0')
  return out
}

/**
 * 廉价指纹：`size` 与「首 1MB + 尾 1MB」的 SHA-256。
 * 用于导入时的快速预判；小文件（≤2MB）等价于完整哈希。
 * @param file 待取指纹的 Blob/File。
 * @returns `size + '-' + hex`。
 * @throws 读取失败或环境缺 crypto.subtle 时抛中文原因。
 */
export async function cheapFingerprint(file: Blob): Promise<string> {
  const size = file.size
  const edge = Math.min(CHEAP_EDGE_BYTES, size)
  const head = file.slice(0, edge)
  const tail = size > edge ? file.slice(size - edge, size) : file.slice(0, 0)
  try {
    const parts = await Promise.all([head.arrayBuffer(), tail.arrayBuffer()])
    const total = parts[0].byteLength + parts[1].byteLength
    const merged = new Uint8Array(total)
    merged.set(new Uint8Array(parts[0]), 0)
    merged.set(new Uint8Array(parts[1]), parts[0].byteLength)
    const digest = await subtle().digest('SHA-256', merged)
    return `${size}-${toHex(digest)}`
  } catch (e) {
    throw new Error(`计算廉价指纹失败（${file.size} 字节）：${e instanceof Error ? e.message : String(e)}`, {
      cause: e,
    })
  }
}

/**
 * 完整内容 SHA-256（hex），分块顺序读取。
 * @param file 待哈希的 Blob/File。
 * @param onProgress 每读完一块回调一次已完成比例（0..1），最后必调一次 1。
 * @returns 小写 hex 摘要。
 * @throws 读取失败或环境缺 crypto.subtle 时抛中文原因。
 */
export async function sha256Hex(file: Blob, onProgress?: (ratio: number) => void): Promise<string> {
  const size = file.size
  if (size === 0) {
    const digest = await subtle().digest('SHA-256', new Uint8Array(0))
    onProgress?.(1)
    return toHex(digest)
  }
  try {
    const chunks: Uint8Array[] = []
    let offset = 0
    while (offset < size) {
      const end = Math.min(offset + HASH_CHUNK_BYTES, size)
      chunks.push(new Uint8Array(await file.slice(offset, end).arrayBuffer()))
      offset = end
      onProgress?.(offset / size)
    }
    const merged = new Uint8Array(size)
    let cursor = 0
    for (const chunk of chunks) {
      merged.set(chunk, cursor)
      cursor += chunk.byteLength
    }
    const digest = await subtle().digest('SHA-256', merged)
    // 分块循环已保证最后一回调为 1；此处兜底防止 size 被并发改写。
    onProgress?.(1)
    return toHex(digest)
  } catch (e) {
    throw new Error(`计算完整哈希失败（${size} 字节）：${e instanceof Error ? e.message : String(e)}`, { cause: e })
  }
}

/**
 * 同时取得廉价指纹与完整哈希（导入去重的两个凭据）。
 * @param file 待识别的文件。
 * @returns `{ cheap, hash }`；两者并发计算。
 * @throws 任一计算失败时抛中文原因（整文件失败，不静默降级）。
 */
export async function identify(file: File): Promise<{ cheap: string; hash: string }> {
  const [cheap, hash] = await Promise.all([cheapFingerprint(file), sha256Hex(file)])
  return { cheap, hash }
}
