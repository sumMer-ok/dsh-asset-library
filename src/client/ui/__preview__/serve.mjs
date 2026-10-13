/**
 * Harness server for the preview build.
 *
 * A plain static server cannot answer the plugin's own file route, so every
 * card in the preview would fall back to its thumbnail and the full-resolution
 * path would stay unverified. This server serves the built harness and answers
 * `/api/plugins/dsh-asset-library/file?path=…` with a generated PNG, which is
 * what lets the screenshots prove that a card really requested the original.
 *
 *   node src/client/ui/__preview__/serve.mjs [port] [distDir]
 *
 * `/Broken/…` paths answer 404 on purpose: that is the "original unavailable"
 * case in `fixtures.ts`. `/Light/…` and `texture-paper` select the light and the
 * busy background, which is how the control-panel contrast is checked against
 * the two hardest pictures.
 *
 * @module dsh-asset-library/preview/serve
 */

import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const here = dirname(fileURLToPath(import.meta.url))
const port = Number(process.argv[2] ?? 5224)
const distDir = process.argv[3] ?? join(here, '../../../../../dsh-asset-library-preview-sandbox/dist-preview')

/** Route the plugin's browser half reads originals from. */
const FILE_ROUTE = '/api/plugins/dsh-asset-library/file'

/* --------------------------------------------------------------- PNG writer */

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

/**
 * CRC-32 over one buffer, as PNG chunks require.
 * @param buffer - Bytes to checksum.
 * @returns The unsigned checksum.
 */
function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/**
 * One PNG chunk: length, type, payload, CRC.
 * @param type - Four-character chunk type.
 * @param data - Chunk payload.
 * @returns The encoded chunk.
 */
function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([length, body, crc])
}

/**
 * Encode an RGB image as PNG.
 * @param width - Pixel width.
 * @param height - Pixel height.
 * @param shade - Per-pixel colour function returning `[r, g, b]`.
 * @returns The complete PNG file.
 */
function encodePng(width, height, shade) {
  const stride = width * 3 + 1
  const raw = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y += 1) {
    let offset = y * stride
    raw[offset] = 0
    offset += 1
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = shade(x, y)
      raw[offset] = r
      raw[offset + 1] = g
      raw[offset + 2] = b
      offset += 3
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ------------------------------------------------------------ picture styles */

const PICTURE_WIDTH = 1600
const PICTURE_HEIGHT = 1067

/**
 * Pick the background style for one path.
 * @param path - Absolute path the browser asked for.
 * @returns `light`, `busy`, or `plain`.
 */
function styleFor(path) {
  if (path.includes('/Light/') || path.includes('white-wall')) return 'light'
  if (path.includes('texture-paper')) return 'busy'
  return 'plain'
}

/**
 * Encode the picture one background style maps to.
 * @param style - `light`, `busy`, or `plain`.
 * @returns PNG bytes.
 */
function pictureBytes(style) {
  // `plain` keeps one fixed hue so the encode cache stays small.
  const hue = 205
  return encodePng(PICTURE_WIDTH, PICTURE_HEIGHT, (x, y) => {
    const u = x / PICTURE_WIDTH
    const v = y / PICTURE_HEIGHT
    if (style === 'light') {
      // A near-white wall: the hardest background for a light-themed control.
      const grain = ((x * 7 + y * 13) % 11) - 5
      const edge = v > 0.86 ? -26 : 0
      const value = 236 + grain + edge
      return [value, value - 1, value - 4]
    }
    if (style === 'busy') {
      // Fine high-frequency stripes: the worst case for any translucent control.
      const stripe = (x + y) % 9 < 4 ? 26 : -26
      const band = Math.floor(((Math.atan2(v - 0.5, u - 0.5) + Math.PI) / Math.PI) * 12) % 2 === 0 ? 18 : -14
      return [140 + stripe + band, 128 + stripe - band, 150 + stripe + band]
    }
    const ring = Math.abs(Math.sin(Math.hypot(u - 0.5, v - 0.45) * 26)) * 46
    const [r, g, b] = hslToRgb(hue / 360, 0.42, 0.52)
    return [
      clampByte(r * 255 * 0.55 + ring + v * 22),
      clampByte(g * 255 * 0.55 + ring + v * 18),
      clampByte(b * 255 * 0.55 + ring + 30 - v * 12),
    ]
  })
}

/**
 * Clamp a channel into a byte.
 * @param value - Raw channel value.
 * @returns The clamped byte.
 */
function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

/**
 * Convert HSL to RGB.
 * @param h - Hue in 0–1.
 * @param s - Saturation in 0–1.
 * @param l - Lightness in 0–1.
 * @returns Channels in 0–1.
 */
function hslToRgb(h, s, l) {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const toChannel = t => {
    let value = t
    if (value < 0) value += 1
    if (value > 1) value -= 1
    if (value < 1 / 6) return p + (q - p) * 6 * value
    if (value < 1 / 2) return q
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6
    return p
  }
  return [toChannel(h + 1 / 3), toChannel(h), toChannel(h - 1 / 3)]
}

/** Cached pictures, keyed by style, so twenty cards do not re-encode twenty times. */
const pictureCache = new Map()

/**
 * One generated picture for a style.
 * @param style - `light`, `busy`, or `plain`.
 * @returns PNG bytes.
 */
function cachedPicture(style) {
  const cached = pictureCache.get(style)
  if (cached !== undefined) return cached
  const picture = pictureBytes(style)
  pictureCache.set(style, picture)
  return picture
}

/* ------------------------------------------------------------------ routing */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`)

  if (url.pathname === FILE_ROUTE) {
    const path = url.searchParams.get('path') ?? ''
    if (path.includes('/Broken/')) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end('original unavailable (harness)')
      return
    }
    const picture = cachedPicture(styleFor(path))
    response.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': String(picture.byteLength),
      'Cache-Control': 'no-store',
    })
    if (request.method === 'HEAD') response.end()
    else response.end(picture)
    return
  }

  const relative = url.pathname === '/' ? '/preview.html' : url.pathname
  const target = join(distDir, normalize(relative).replace(/^(\.\.[/\\])+/, ''))
  if (!existsSync(target) || !statSync(target).isFile()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end(`not found: ${relative}`)
    return
  }
  response.writeHead(200, { 'Content-Type': MIME[extname(target)] ?? 'application/octet-stream' })
  createReadStream(target).pipe(response)
})

server.listen(port, '127.0.0.1', () => {
  console.log(`preview harness on http://127.0.0.1:${port}/preview.html (dist: ${distDir})`)
})
