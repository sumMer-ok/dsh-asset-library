import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  describeResult,
  mentionFor,
  referenceAssets,
  type HostConversation,
  type HostInputActions,
} from '../src/client/attachment.ts'
import type { AssetKind, AssetRecord } from '../src/client/data/types.ts'

/**
 * The reference path is the one behaviour this redesign changed for every user:
 * a library asset now travels through the composer's real attachment channel
 * (read bytes → `createDrafts` → `addAttachments`) instead of being inserted as
 * plain `@path` text. These tests pin that contract, including the degraded path
 * that must stay visible rather than silently succeed.
 */

/** One minimal asset record; only the fields the reference path reads. */
function makeAsset(over: Partial<AssetRecord> & { kind: AssetKind; name: string }): AssetRecord {
  return {
    id: over.id ?? `id-${over.name}`,
    path: over.path ?? `/Users/x/${over.name}`,
    ext: over.ext ?? over.name.split('.').pop() ?? '',
    mediaType: over.mediaType ?? 'application/octet-stream',
    size: over.size ?? 1024,
    hash: 'h',
    cheap: 'c',
    thumb: new Blob([new Uint8Array([1])], { type: 'image/webp' }),
    thumbWidth: 8,
    thumbHeight: 8,
    dominantColor: '#000000',
    tags: [],
    favorite: false,
    rating: 0,
    status: 'ok',
    importedAt: 0,
    lastCheckedAt: 0,
    ...over,
  }
}

/** Capture every call the reference path makes into the composer. */
function makeActions(): { calls: { inserted: string[]; attached: string[] }; impl: HostInputActions } {
  const calls = { inserted: [] as string[], attached: [] as string[] }
  return {
    calls,
    impl: {
      captureInsertion: () => ({ token: 'span' }),
      insertText: (text) => { calls.inserted.push(text); return true },
      addAttachments: (ids) => { calls.attached.push(...ids); return true },
    },
  }
}

/** A conversation stub that mints one draft id per file, like the host does. */
function makeConversation(): { calls: { sessions: string[]; files: File[] }; impl: HostConversation } {
  const calls = { sessions: [] as string[], files: [] as File[] }
  return {
    calls,
    impl: {
      createDrafts(sessionId, files) {
        calls.sessions.push(sessionId)
        calls.files.push(...files)
        return files.map((_file, index) => ({ id: `draft-${index}` }))
      },
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('引用投递：所有类型统一走真附件', () => {
  it('图片与文档都进 createDrafts，id 交给 addAttachments，不插任何文本', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Blob([new Uint8Array([1, 2, 3])]), { status: 200 })))
    const { calls, impl } = makeActions()
    const conversation = makeConversation()

    const result = await referenceAssets({
      assets: [
        makeAsset({ kind: 'image', name: 'shot.png', mediaType: 'image/png' }),
        makeAsset({ kind: 'document', name: 'form.doc', mediaType: 'application/msword' }),
      ],
      sessionId: 'session-1',
      cwd: undefined,
      conversation: conversation.impl,
      actions: impl,
    })

    expect(result.attached).toBe(2)
    expect(result.degraded).toBe(0)
    expect(result.failures).toEqual([])
    expect(conversation.calls.sessions).toEqual(['session-1'])
    expect(conversation.calls.files.map(file => file.name)).toEqual(['shot.png', 'form.doc'])
    expect(calls.attached).toEqual(['draft-0', 'draft-1'])
    expect(calls.inserted).toEqual([])
  })

  it('读不到字节时降级为文件提及，并把它计入 degraded（不静默）', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 413 })))
    const { calls, impl } = makeActions()
    const conversation = makeConversation()

    const result = await referenceAssets({
      assets: [makeAsset({ kind: 'document', name: 'huge.pdf', path: '/Users/x/docs/huge.pdf' })],
      sessionId: 'session-1',
      cwd: '/Users/x',
      conversation: conversation.impl,
      actions: impl,
    })

    expect(result.attached).toBe(0)
    expect(result.degraded).toBe(1)
    expect(conversation.calls.files).toEqual([])
    expect(calls.inserted).toHaveLength(1)
    expect(calls.inserted[0]?.startsWith('@')).toBe(true)
    expect(calls.inserted[0]).toContain('docs/huge.pdf')
  })

  it('输入区未就绪时不假装成功，而是给出可见失败', async () => {
    const conversation = makeConversation()
    const result = await referenceAssets({
      assets: [makeAsset({ kind: 'image', name: 'a.png' })],
      sessionId: 'session-1',
      cwd: undefined,
      conversation: conversation.impl,
      actions: null,
    })

    expect(result.attached).toBe(0)
    expect(result.failures.length).toBeGreaterThan(0)
    expect(conversation.calls.files).toEqual([])
  })

  it('附件服务不可用时报失败而不是悄悄降级', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Blob([new Uint8Array([1])]), { status: 200 })))
    const { impl } = makeActions()
    const result = await referenceAssets({
      assets: [makeAsset({ kind: 'image', name: 'a.png' })],
      sessionId: 'session-1',
      cwd: undefined,
      conversation: undefined,
      actions: impl,
    })

    expect(result.attached).toBe(0)
    expect(result.failures.length).toBeGreaterThan(0)
  })
})

describe('引用结果与提及文法', () => {
  it('describeResult 分别汇报成交与降级', () => {
    const attachedOnly = describeResult({ attached: 2, degraded: 0, failures: [] })
    const degradedOnly = describeResult({ attached: 0, degraded: 2, failures: [] })
    expect(attachedOnly).not.toBe('')
    expect(degradedOnly).not.toBe('')
    expect(attachedOnly).not.toBe(degradedOnly)
    expect(describeResult({ attached: 0, degraded: 0, failures: ['a: boom'] })).toContain('boom')
  })

  it('mentionFor 按会话工作区相对化，含空白时加引号', () => {
    expect(mentionFor('/Users/x/ws/a.png', '/Users/x/ws')).toBe('@a.png')
    expect(mentionFor('/Users/x/ws/my file.png', '/Users/x/ws')).toBe('@"my file.png"')
    expect(mentionFor('/other/a.png', '/Users/x/ws')).toBe('@/other/a.png')
    expect(mentionFor('/Users/x/a"b.png', undefined)).toBeUndefined()
  })
})
