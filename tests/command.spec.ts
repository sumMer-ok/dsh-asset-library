import { describe, expect, it, vi } from 'vitest'

// The platform module is supplied by the shell's module table, not by this
// package, so the test replaces it with a stub icon. Everything else in
// `command.ts` is ordinary code.
vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({
  IconBrowseOutlineRegular: () => null,
}))

const { ASSET_COMMAND_NAME, createAssetCommand, registerAssetCommand } = await import('../src/client/command.ts')

/**
 * A contribution that violates the registry's expectations does not fail alone:
 * `ui-commands` builds every candidate in one pass, so a single bad row blanks
 * the whole `/` and `+` menu. These assertions pin the fields the host actually
 * calls, so this row can never become that row.
 */

describe('「添加素材库」命令贡献的形状', () => {
  it('label 与 description 是函数（宿主读回时直接调用）', () => {
    const command = createAssetCommand({ open: () => undefined })
    expect(typeof command.label).toBe('function')
    expect(typeof command.description).toBe('function')
    // They must return usable strings when called, not throw.
    expect(typeof command.label()).toBe('string')
    expect(typeof command.description()).toBe('string')
    expect(command.label().length).toBeGreaterThan(0)
  })

  it('available 是函数且返回布尔；name 与 ui.kind 合法', () => {
    const command = createAssetCommand({ open: () => undefined })
    expect(typeof command.available).toBe('function')
    expect(typeof command.available({ sessionId: 's' })).toBe('boolean')
    expect(command.name).toBe(ASSET_COMMAND_NAME)
    expect(command.ui.kind).toBe('action')
    expect(typeof command.ui.run).toBe('function')
  })

  it('run 把会话 id 交给打开选择器的回调', () => {
    const open = vi.fn()
    const command = createAssetCommand({ open })
    command.ui.run({ sessionId: 'session-7' })
    expect(open).toHaveBeenCalledWith('session-7')
  })

  it('registerAssetCommand 把规格原样交给注册面并回传注销器', () => {
    const dispose = vi.fn()
    const register = vi.fn(() => dispose)
    const returned = registerAssetCommand({ register }, () => undefined)

    expect(register).toHaveBeenCalledTimes(1)
    const spec = register.mock.calls[0]?.[0] as { name: string; label: unknown; description: unknown }
    expect(spec.name).toBe(ASSET_COMMAND_NAME)
    expect(typeof spec.label).toBe('function')
    expect(typeof spec.description).toBe('function')
    expect(returned).toBe(dispose)
  })
})
