import { describe, expect, it } from 'vitest'
import {
  applyQuery,
  autoTags,
  extOf,
  highlightRanges,
  kindForName,
  matchAsset,
  mediaTypeFor,
} from '../../src/client/data/filters.ts'
import type { AssetKind, AssetRecord, Query } from '../../src/client/data/types.ts'

/**
 * filters.ts 的行为规格：搜索组合、highlightRanges 区间正确性、
 * autoTags 与 kind 判定全表、applyQuery 排序与 desc。
 */

/** 构造测试素材。 */
function asset(id: string, overrides: Partial<AssetRecord> = {}): AssetRecord {
  return {
    id,
    path: `/tmp/${id}`,
    name: `${id}.png`,
    ext: 'png',
    kind: 'image',
    mediaType: 'image/png',
    size: 1000,
    hash: `h-${id}`,
    cheap: `c-${id}`,
    thumb: new Blob([new Uint8Array([1])], { type: 'image/webp' }),
    thumbWidth: 10,
    thumbHeight: 10,
    dominantColor: '#000000',
    tags: [],
    favorite: false,
    rating: 0,
    status: 'ok',
    importedAt: Date.parse('2026-03-05T00:00:00Z'),
    lastCheckedAt: Date.parse('2026-03-05T00:00:00Z'),
    ...overrides,
  }
}

/** 构造查询。 */
function query(patch: Partial<Query> = {}): Query {
  return {
    text: '',
    kinds: [],
    tags: [],
    favoriteOnly: false,
    minRating: 0,
    from: null,
    to: null,
    sort: 'importedAt',
    desc: false,
    ...patch,
  }
}

describe('highlightRanges', () => {
  it('空查询返回空数组', () => {
    expect(highlightRanges('abc', '')).toEqual([])
    expect(highlightRanges('abc', '   ')).toEqual([])
    expect(highlightRanges('', 'a')).toEqual([])
  })

  it('单次命中给出 [start, end)', () => {
    expect(highlightRanges('hello world', 'world')).toEqual([[6, 11]])
  })

  it('大小写不敏感且返回原文下标', () => {
    expect(highlightRanges('ScreenShot.PNG', 'png')).toEqual([[11, 14]])
    expect(highlightRanges('screen.png', 'SCREEN')).toEqual([[0, 6]])
  })

  it('多命中全部返回', () => {
    expect(highlightRanges('abab abab', 'ab')).toEqual([
      [0, 2],
      [2, 4],
      [5, 7],
      [7, 9],
    ])
  })

  it('重叠命中被跳过，不是重复的索引', () => {
    expect(highlightRanges('aaaa', 'aa')).toEqual([
      [0, 2],
      [2, 4],
    ])
  })

  it('中文按 code unit 计数', () => {
    expect(highlightRanges('素材库素材', '素材')).toEqual([
      [0, 2],
      [3, 5],
    ])
  })

  it('中文混合英文', () => {
    // 'dsh素材库v2'：v2 占 code unit 6..8，素材占 3..5
    expect(highlightRanges('dsh素材库v2', 'v2')).toEqual([[6, 8]])
    expect(highlightRanges('dsh素材库v2', '素材')).toEqual([[3, 5]])
  })

  it('查询词长于文本时无命中', () => {
    expect(highlightRanges('ab', 'abcdef')).toEqual([])
  })

  it('结果按起点升序且互不重叠', () => {
    const text = '图图图'
    const ranges = highlightRanges(text, '图')
    expect(ranges).toEqual([
      [0, 1],
      [1, 2],
      [2, 3],
    ])
    for (let i = 1; i < ranges.length; i += 1) {
      expect(ranges[i]![0]).toBeGreaterThanOrEqual(ranges[i - 1]![1])
    }
  })

  it('前导/尾随空格被 trim（命中位置按原文计）', () => {
    // ' b '.trim() = 'b'，在 'a b' 中位于下标 2
    expect(highlightRanges('a b', ' b ')).toEqual([[2, 3]])
  })
})

describe('kind 判定全表（计划 §10 清单）', () => {
  const table: Array<[string, AssetKind]> = [
    ['a.png', 'image'],
    ['a.jpg', 'image'],
    ['a.jpeg', 'image'],
    ['a.webp', 'image'],
    ['a.gif', 'image'],
    ['a.svg', 'image'],
    ['a.mp4', 'video'],
    ['a.webm', 'video'],
    ['a.mov', 'video'],
    ['a.mp3', 'audio'],
    ['a.wav', 'audio'],
    ['a.pdf', 'document'],
    ['a.docx', 'document'],
    ['a.xlsx', 'document'],
    ['a.md', 'document'],
    ['a.txt', 'document'],
    ['a.csv', 'document'],
    ['a.json', 'document'],
    ['a.zip', 'archive'],
    ['a.tar', 'archive'],
  ]

  it.each(table)('%s → %s', (name, kind) => {
    expect(kindForName(name)).toBe(kind)
  })

  it('大小写不敏感', () => {
    expect(kindForName('PHOTO.PNG')).toBe('image')
    expect(kindForName('Movie.MP4')).toBe('video')
  })

  it('无扩展名 / 未知扩展名 / 点开头文件 → other', () => {
    expect(kindForName('README')).toBe('other')
    expect(kindForName('a.unknownext')).toBe('other')
    expect(kindForName('.gitignore')).toBe('other')
    expect(kindForName('trailing.')).toBe('other')
  })

  it('extOf 取小写无点扩展名', () => {
    expect(extOf('A.B.PNG')).toBe('png')
    expect(extOf('noext')).toBe('')
    expect(extOf('.hidden')).toBe('')
  })

  it('mediaTypeFor 对上表给 MIME，未知回退 octet-stream', () => {
    expect(mediaTypeFor('a.png')).toBe('image/png')
    expect(mediaTypeFor('a.jpg')).toBe('image/jpeg')
    expect(mediaTypeFor('a.mp4')).toBe('video/mp4')
    expect(mediaTypeFor('a.mp3')).toBe('audio/mpeg')
    expect(mediaTypeFor('a.pdf')).toBe('application/pdf')
    expect(mediaTypeFor('a.zip')).toBe('application/zip')
    expect(mediaTypeFor('a.weird')).toBe('application/octet-stream')
  })
})

describe('autoTags', () => {
  const importedAt = Date.parse('2026-03-05T10:00:00+08:00')

  it('小文件：扩展名 + 类型 + 年月，无大小档', () => {
    expect(autoTags({ ext: 'png', kind: 'image', size: 1000, importedAt })).toEqual(['png', 'image', '2026-03'])
  })

  it('中等文件给「中等文件」，大文件给「大文件」', () => {
    expect(autoTags({ ext: 'mp4', kind: 'video', size: 20 * 1024 * 1024, importedAt })).toEqual([
      'mp4',
      'video',
      '中等文件',
      '2026-03',
    ])
    expect(autoTags({ ext: 'zip', kind: 'archive', size: 200 * 1024 * 1024, importedAt })).toEqual([
      'zip',
      'archive',
      '大文件',
      '2026-03',
    ])
  })

  it('边界值：正好 10MB 算中等、正好 100MB 算大', () => {
    expect(autoTags({ ext: 'bin', kind: 'other', size: 10 * 1024 * 1024, importedAt })).toContain('中等文件')
    expect(autoTags({ ext: 'bin', kind: 'other', size: 100 * 1024 * 1024, importedAt })).toContain('大文件')
    expect(autoTags({ ext: 'bin', kind: 'other', size: 100 * 1024 * 1024, importedAt })).not.toContain('中等文件')
  })

  it('1 月与 12 月补零正确', () => {
    expect(autoTags({ ext: 'a', kind: 'other', size: 1, importedAt: Date.parse('2026-01-15T00:00:00Z') })).toContain('2026-01')
    expect(autoTags({ ext: 'a', kind: 'other', size: 1, importedAt: Date.parse('2026-12-15T00:00:00Z') })).toContain('2026-12')
  })

  it('无扩展名时不产生空标签', () => {
    const tags = autoTags({ ext: '', kind: 'other', size: 1, importedAt })
    expect(tags).toEqual(['other', '2026-03'])
    expect(tags).not.toContain('')
  })

  it('带点的 ext 被归一化且去重', () => {
    expect(autoTags({ ext: '.PNG', kind: 'image', size: 1, importedAt })).toEqual(['png', 'image', '2026-03'])
    expect(autoTags({ ext: 'image', kind: 'image', size: 1, importedAt })).toEqual(['image', '2026-03'])
  })
})

describe('matchAsset：搜索组合', () => {
  const list: AssetRecord[] = [
    asset('a', { name: '落日.png', ext: 'png', kind: 'image', tags: ['png', 'image', '风景'], importedAt: 1000, favorite: true, rating: 5 }),
    asset('b', { name: '会议记录.pdf', ext: 'pdf', kind: 'document', tags: ['pdf', 'document'], importedAt: 2000, rating: 3 }),
    asset('c', { name: 'clip.mp4', ext: 'mp4', kind: 'video', tags: ['mp4', 'video', '风景'], importedAt: 3000, rating: 0 }),
  ]

  it('text 命中名称（大小写不敏感）', () => {
    expect(applyQuery(list, query({ text: 'CLIP' })).map(a => a.id)).toEqual(['c'])
    expect(applyQuery(list, query({ text: '落日' })).map(a => a.id)).toEqual(['a'])
  })

  it('text 命中标签与扩展名', () => {
    expect(applyQuery(list, query({ text: '风景' })).map(a => a.id).sort()).toEqual(['a', 'c'])
    expect(applyQuery(list, query({ text: 'pdf' })).map(a => a.id)).toEqual(['b'])
  })

  it('关键词 × 类型 × 标签 组合取交集', () => {
    const q = query({ text: '风景', kinds: ['video'], tags: ['风景'] })
    expect(applyQuery(list, q).map(a => a.id)).toEqual(['c'])
    expect(applyQuery(list, query({ text: '风景', kinds: ['document'] }))).toEqual([])
  })

  it('标签为多选 OR 语义', () => {
    expect(applyQuery(list, query({ tags: ['风景', 'document'] })).map(a => a.id).sort()).toEqual(['a', 'b', 'c'])
  })

  it('时间范围（闭区间）', () => {
    expect(applyQuery(list, query({ from: 2000, to: 3000 })).map(a => a.id).sort()).toEqual(['b', 'c'])
    expect(applyQuery(list, query({ from: 1000, to: 1000 })).map(a => a.id)).toEqual(['a'])
    expect(applyQuery(list, query({ to: 1999 })).map(a => a.id)).toEqual(['a'])
    expect(applyQuery(list, query({ from: 3001 }))).toEqual([])
  })

  it('收藏与最低评分', () => {
    expect(applyQuery(list, query({ favoriteOnly: true })).map(a => a.id)).toEqual(['a'])
    expect(applyQuery(list, query({ minRating: 3 })).map(a => a.id).sort()).toEqual(['a', 'b'])
  })

  it('多条件同时命中才保留', () => {
    const q = query({ text: '风', kinds: ['image'], tags: ['风景'], minRating: 5, from: 0, to: 5000, favoriteOnly: true })
    expect(matchAsset(list[0] as AssetRecord, q)).toBe(true)
    expect(matchAsset(list[2] as AssetRecord, q)).toBe(false)
  })

  it('空文本不产生过滤', () => {
    expect(applyQuery(list, query()).map(a => a.id).sort()).toEqual(['a', 'b', 'c'])
    expect(applyQuery(list, query({ text: '   ' })).map(a => a.id)).toHaveLength(3)
  })
})

describe('applyQuery：排序与 desc', () => {
  const list: AssetRecord[] = [
    asset('b', { name: '图10.png', size: 300, rating: 2, importedAt: 3000 }),
    asset('a', { name: '图2.png', size: 100, rating: 5, importedAt: 1000 }),
    asset('c', { name: '图1.png', size: 200, rating: 0, importedAt: 2000 }),
  ]

  it('按 importedAt 升序/降序', () => {
    expect(applyQuery(list, query({ sort: 'importedAt' })).map(a => a.id)).toEqual(['a', 'c', 'b'])
    expect(applyQuery(list, query({ sort: 'importedAt', desc: true })).map(a => a.id)).toEqual(['b', 'c', 'a'])
  })

  it('按 size 升序/降序', () => {
    expect(applyQuery(list, query({ sort: 'size' })).map(a => a.id)).toEqual(['a', 'c', 'b'])
    expect(applyQuery(list, query({ sort: 'size', desc: true })).map(a => a.id)).toEqual(['b', 'c', 'a'])
  })

  it('按 rating 升序/降序', () => {
    expect(applyQuery(list, query({ sort: 'rating' })).map(a => a.id)).toEqual(['c', 'b', 'a'])
    expect(applyQuery(list, query({ sort: 'rating', desc: true })).map(a => a.id)).toEqual(['a', 'b', 'c'])
  })

  it('按 name 自然序（图1 < 图2 < 图10）', () => {
    expect(applyQuery(list, query({ sort: 'name' })).map(a => a.name)).toEqual(['图1.png', '图2.png', '图10.png'])
    expect(applyQuery(list, query({ sort: 'name', desc: true })).map(a => a.name)).toEqual([
      '图10.png',
      '图2.png',
      '图1.png',
    ])
  })

  it('不改动入参数组', () => {
    const snapshot = list.map(a => a.id)
    applyQuery(list, query({ sort: 'size', desc: true }))
    expect(list.map(a => a.id)).toEqual(snapshot)
  })

  it('过滤与排序同时生效', () => {
    const q = query({ minRating: 1, sort: 'size', desc: true })
    expect(applyQuery(list, q).map(a => a.id)).toEqual(['b', 'a'])
  })
})
