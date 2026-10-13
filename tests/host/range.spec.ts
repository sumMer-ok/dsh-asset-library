import { describe, expect, it } from 'vitest'

import { etagFor, ifRangeMatches, parseRange } from '../../src/host/range.ts'

describe('parseRange', () => {
  it('returns null when the header is absent', () => {
    expect(parseRange(undefined, 100)).toBeNull()
    expect(parseRange(null, 100)).toBeNull()
  })

  it('parses a closed range', () => {
    expect(parseRange('bytes=0-49', 100)).toEqual({ start: 0, end: 49 })
    expect(parseRange('bytes=10-19', 100)).toEqual({ start: 10, end: 19 })
    expect(parseRange('bytes=0-0', 100)).toEqual({ start: 0, end: 0 })
    expect(parseRange('bytes=99-99', 100)).toEqual({ start: 99, end: 99 })
  })

  it('parses an open-ended range through the last byte', () => {
    expect(parseRange('bytes=50-', 100)).toEqual({ start: 50, end: 99 })
    expect(parseRange('bytes=0-', 100)).toEqual({ start: 0, end: 99 })
    expect(parseRange('bytes=99-', 100)).toEqual({ start: 99, end: 99 })
  })

  it('parses a suffix range', () => {
    expect(parseRange('bytes=-10', 100)).toEqual({ start: 90, end: 99 })
    expect(parseRange('bytes=-1', 100)).toEqual({ start: 99, end: 99 })
    expect(parseRange('bytes=-100', 100)).toEqual({ start: 0, end: 99 })
    expect(parseRange('bytes=-200', 100)).toEqual({ start: 0, end: 99 })
  })

  it('clamps an end past the last byte', () => {
    expect(parseRange('bytes=0-999', 100)).toEqual({ start: 0, end: 99 })
    expect(parseRange('bytes=90-999', 100)).toEqual({ start: 90, end: 99 })
  })

  it('serves only the first range of a multi-range request', () => {
    expect(parseRange('bytes=0-49,60-69', 100)).toEqual({ start: 0, end: 49 })
  })

  it('marks a start at or past the entity size unsatisfiable', () => {
    expect(parseRange('bytes=100-', 100)).toBe('unsatisfiable')
    expect(parseRange('bytes=100-200', 100)).toBe('unsatisfiable')
    expect(parseRange('bytes=500-600', 100)).toBe('unsatisfiable')
  })

  it('marks any range over an empty entity unsatisfiable', () => {
    expect(parseRange('bytes=0-', 0)).toBe('unsatisfiable')
    expect(parseRange('bytes=-1', 0)).toBe('unsatisfiable')
  })

  it('ignores malformed headers instead of failing the request', () => {
    expect(parseRange('', 100)).toBeNull()
    expect(parseRange('   ', 100)).toBeNull()
    expect(parseRange('bytes=', 100)).toBeNull()
    expect(parseRange('bytes=abc', 100)).toBeNull()
    expect(parseRange('bytes=1-2-3', 100)).toBeNull()
    expect(parseRange('bytes=5-2', 100)).toBeNull()
    expect(parseRange('bytes=-0', 100)).toBeNull()
    expect(parseRange('bytes=1.5-3', 100)).toBeNull()
    expect(parseRange('bytes=-', 100)).toBeNull()
    expect(parseRange('items=0-49', 100)).toBeNull()
    expect(parseRange('bytes 0-49', 100)).toBeNull()
  })

  it('accepts case-insensitive units and surrounding whitespace', () => {
    expect(parseRange('BYTES=0-9', 100)).toEqual({ start: 0, end: 9 })
    expect(parseRange('  bytes=0-9  ', 100)).toEqual({ start: 0, end: 9 })
    expect(parseRange('bytes= 0-9', 100)).toEqual({ start: 0, end: 9 })
  })
})

describe('etagFor', () => {
  it('embeds size and modification time', () => {
    expect(etagFor(1024, 1_700_000_000_000)).toBe('"1024-1700000000000"')
    expect(etagFor(0, 0)).toBe('"0-0"')
  })

  it('truncates fractional milliseconds so the tag is stable across calls', () => {
    expect(etagFor(10, 1_700_000_000_123.7)).toBe(etagFor(10, 1_700_000_000_123))
  })

  it('changes when either size or mtime changes', () => {
    expect(etagFor(10, 1000)).not.toBe(etagFor(11, 1000))
    expect(etagFor(10, 1000)).not.toBe(etagFor(10, 1001))
  })
})

describe('ifRangeMatches', () => {
  const etag = etagFor(512, 1_700_000_000_000)

  it('matches the same entity tag', () => {
    expect(ifRangeMatches(etag, etag)).toBe(true)
    expect(ifRangeMatches(` ${etag} `, etag)).toBe(true)
  })

  it('matches an unquoted echo of the tag', () => {
    expect(ifRangeMatches('512-1700000000000', etag)).toBe(true)
  })

  it('rejects a different entity tag so the reply falls back to a full 200', () => {
    expect(ifRangeMatches(etagFor(512, 1_700_000_000_001), etag)).toBe(false)
    expect(ifRangeMatches(etagFor(513, 1_700_000_000_000), etag)).toBe(false)
  })

  it('rejects an absent, empty, weak or date validator', () => {
    expect(ifRangeMatches(undefined, etag)).toBe(false)
    expect(ifRangeMatches(null, etag)).toBe(false)
    expect(ifRangeMatches('', etag)).toBe(false)
    expect(ifRangeMatches(`W/${etag}`, etag)).toBe(false)
    expect(ifRangeMatches('Wed, 21 Oct 2026 07:28:00 GMT', etag)).toBe(false)
  })
})
