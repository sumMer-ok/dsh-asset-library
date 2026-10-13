/**
 * The two halves must name the same route.
 *
 * The host registers one exact pathname on `ctx.connection.fetch`; every browser
 * read builds its URL from the client-side constant. Nothing else couples them,
 * so this test is the coupling: a rename on either side that is not mirrored
 * fails here instead of on a real machine as a silent 404.
 */

import { describe, expect, it } from 'vitest'

import { FILE_ROUTE, fileUrl } from '../src/client/data/route.ts'
import { ROUTE_PATH } from '../src/host/file-route.ts'

describe('file route path', () => {
  it('客户端常量与宿主注册路径逐字相同', () => {
    expect(FILE_ROUTE).toBe(ROUTE_PATH)
  })

  it('路径位于 connection 唯一拥有的 /api 桥下', () => {
    // 其它 pathname 在 connection 上未被认领，一律 404。
    expect(FILE_ROUTE.startsWith('/api/')).toBe(true)
  })

  it('fileUrl 编码路径并只保留一个查询参数', () => {
    const url = fileUrl('/Users/示例/Pictures/a b#c.png')
    expect(url.startsWith(`${FILE_ROUTE}?path=`)).toBe(true)
    const parsed = new URL(url, 'http://dsh.internal')
    expect(parsed.pathname).toBe(FILE_ROUTE)
    expect(parsed.searchParams.get('path')).toBe('/Users/示例/Pictures/a b#c.png')
    expect([...parsed.searchParams.keys()]).toEqual(['path'])
  })
})
