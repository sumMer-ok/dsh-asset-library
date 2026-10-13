/**
 * dsh-asset-library — client half.
 *
 * Four registrations, all on documented host seams:
 *
 * 1. **The panel** occupies `agent-profile.materials` (the tab page the window
 *    tab strip's `+` menu opens).
 * 2. **The picker + outcome line** ride `shell.overlay`; the command below opens
 *    the picker for one conversation.
 * 3. **The command** adds `添加素材库` to the composer's `+` menu through
 *    `ctx.commandUi` — the same registry the shipped `文件` row uses.
 * 4. **The bridge** is an invisible occupant of `conversation.input.left`: the
 *    host hands every occupant of that session-scoped slot `inputActions`, the
 *    only public handle on the composer's draft. Without it the library could
 *    read files but never hand one to a conversation.
 *
 * The store stays the single source of truth (only `AssetLibraryApp` and the
 * picker host subscribe to it), and the host path bridge is installed once here
 * so nothing below has to know about `window.__DSH_HOST_PATHS__`.
 *
 * @module dsh-asset-library/client
 */

import { useCallback, useEffect, useSyncExternalStore, type ReactElement } from 'react'

import {
  captureInputActions,
  describeResult,
  referenceAssets,
  type HostConversation,
  type HostInputActions,
} from './attachment.ts'
import { registerAssetCommand, type CommandUiFace } from './command.ts'
import { FILE_ROUTE, fileUrl } from './data/route.ts'
import { setPathResolver, store } from './data/store.ts'
import type { AssetRecord } from './data/types.ts'
import { AssetLibraryApp } from './ui/AssetLibraryApp.tsx'
import { AssetPicker } from './ui/AssetPicker.tsx'
import { useStoreState } from './ui/useStoreState.ts'

/** The slot this panel occupies; the shell declares it as `single`/`root`. */
export const SLOT_NAME = 'agent-profile.materials'

/** Registration id for this plugin's occupants of the host's slots. */
export const SLOT_ID = 'asset-library'

/** The overlay slot that hosts the picker so it can cover the whole window. */
const OVERLAY_SLOT = 'shell.overlay'

/** The composer slot whose occupants receive `inputActions`. */
const INPUT_BRIDGE_SLOT = 'conversation.input.left'

/** How long one outcome line stays on screen. */
const NOTICE_MS = 6000

/** Services the shell must have resolved before `apply` runs. */
export const inject = ['slots']

/** `window.__DSH_HOST_PATHS__`, installed by the desktop preload. */
interface HostPathBridge {
  /**
   * Read the real absolute path behind a browser `File`.
   * @param file - a file the user dropped or picked.
   * @returns the host path, or an empty string when the platform cannot map it.
   */
  pathFor(file: File): string
}

/** The `ctx.remote` slice used for the OS-default-application action. */
interface RemoteSessionFace {
  /** Namespace generated for the session controller. */
  session?: {
    /**
     * Verify and open one path on the host desktop.
     * @param request - `{ path }`; no `action` and no `application` means the OS default application.
     * @returns confirmation that the opener accepted the path.
     */
    openWorkspacePath(request: { path: string }): Promise<unknown>
  }
}

/** The client `sessions` slice used to relativize mentions to the active workspace. */
interface SessionsFace {
  /** Session list service, when the shell exposes one. */
  list?: { getSnapshot?: () => { byId?: Record<string, { cwd?: string } | undefined> } }
}

/** The slot registry slice this bundle uses. */
interface SlotsService {
  /**
   * Run `register` once the named slot exists, disposing its result with the plugin.
   * @param name - slot name to wait for.
   * @param register - callback returning the disposer.
   */
  inject(name: string, register: () => () => void): void
  /**
   * Claim a seat in the named slot.
   * @param options - slot name, registration id, and order.
   * @param component - the occupant.
   * @returns the disposer.
   */
  register(
    options: { name: string; id: string; order?: number },
    component: (props: Record<string, unknown>) => ReactElement | null,
  ): () => void
}

/** Client plugin context as far as this bundle reads it. */
interface ClientContext {
  /** Slot registry. */
  slots: SlotsService
  /**
   * Run `apply` in a scope where the named services are resolved.
   * @param services - service names to wait for.
   * @param apply - callback receiving the injected scope.
   */
  inject(services: readonly string[], apply: (scope: ClientScope) => void): void
  /**
   * Read one optional service.
   * @param name - service name.
   * @param strict - `false` reads it without requiring it.
   * @returns the service, or undefined.
   */
  get(name: string, strict?: false): unknown
}

/** One injected scope, able to read the services named in the injection. */
interface ClientScope {
  /**
   * Read one of the injected services.
   * @param name - service name.
   * @returns the service.
   */
  get(name: string): unknown
  /**
   * Own one registration for the scope's lifetime.
   * @param callback - returns the disposer.
   * @param label - diagnostic label.
   */
  effect(callback: () => () => void, label: string): void
}

/** Client context kept for the components registered by {@link apply}. */
let panelContext: ClientContext | undefined

/** Session captured by the composer bridge (authoritative while a composer is mounted). */
let bridgeSessionId = ''

/** Session captured by the last `添加素材库` command run (fallback for the panel). */
let lastCommandSession = ''

/* ------------------------------------------------------------------ notices */

let noticeText = ''
let noticeSeq = 0
const noticeListeners = new Set<() => void>()

/**
 * Publish one outcome line for the user; empty clears it.
 * @param text - the message.
 */
function publishNotice(text: string): void {
  noticeText = text
  noticeSeq += 1
  for (const listener of noticeListeners) listener()
}

function subscribeNotice(listener: () => void): () => void {
  noticeListeners.add(listener)
  return () => { noticeListeners.delete(listener) }
}

/* ------------------------------------------------------------------- picker */

/** Which conversation the picker is collecting for; empty while closed. */
let pickerSession = ''
const pickerListeners = new Set<() => void>()

function subscribePicker(listener: () => void): () => void {
  pickerListeners.add(listener)
  return () => { pickerListeners.delete(listener) }
}

function pickerSnapshot(): string {
  return pickerSession
}

/**
 * Open the picker for one conversation.
 * @param sessionId - the conversation whose draft will receive the assets.
 */
function openPicker(sessionId: string): void {
  lastCommandSession = sessionId
  pickerSession = sessionId
  for (const listener of pickerListeners) listener()
}

function closePicker(): void {
  pickerSession = ''
  for (const listener of pickerListeners) listener()
}

/* ------------------------------------------------------------------ helpers */

/** Read the desktop host-path bridge when the shell provides one. */
function hostPaths(): HostPathBridge | undefined {
  const candidate = (globalThis as { __DSH_HOST_PATHS__?: unknown }).__DSH_HOST_PATHS__
  if (typeof candidate !== 'object' || candidate === null) return undefined
  const pathFor = (candidate as { pathFor?: unknown }).pathFor
  return typeof pathFor === 'function' ? (candidate as HostPathBridge) : undefined
}

/**
 * Resolve one session's workspace root, for mention relativization.
 * @param ctx - client context.
 * @param sessionId - target session.
 * @returns the workspace root, or `undefined` when the shell does not expose it.
 */
function cwdOf(ctx: ClientContext, sessionId: string): string | undefined {
  const sessions = ctx.get('sessions', false) as SessionsFace | undefined
  return sessions?.list?.getSnapshot?.().byId?.[sessionId]?.cwd
}

/**
 * Open one asset with the OS default application, through the host.
 *
 * A missing call surface is reported rather than swallowed: the action is only
 * offered by the UI when this plugin wires it, so silence would be a bug.
 * @param ctx - client context.
 * @param asset - the asset to open.
 */
async function openWithSystem(ctx: ClientContext, asset: AssetRecord): Promise<void> {
  const remote = ctx.get('remote', false) as RemoteSessionFace | undefined
  const session = remote?.session
  const open = session?.openWorkspacePath
  if (typeof open !== 'function') {
    publishNotice(`无法用系统应用打开：宿主未提供 openWorkspacePath（${asset.name}）`)
    return
  }
  try {
    await open.call(session, { path: asset.path })
    publishNotice(`已用系统默认应用打开：${asset.name}`)
  } catch (error) {
    publishNotice(`打开失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Ask for a replacement path through a native picker and record it.
 *
 * A browser `File` from `<input type="file">` carries no path on its own, so the
 * desktop preload's bridge is what turns the user's pick into one; when that
 * bridge is missing the action says so instead of failing silently.
 * @param asset - the asset whose source file moved.
 */
function requestRelocate(asset: AssetRecord): void {
  const bridge = hostPaths()
  if (bridge === undefined) {
    publishNotice('无法重新定位：当前环境不提供宿主路径桥（__DSH_HOST_PATHS__）')
    return
  }
  const input = document.createElement('input')
  input.type = 'file'
  input.style.display = 'none'
  input.addEventListener('change', () => {
    const file = input.files?.[0]
    input.remove()
    if (file === undefined) return
    const next = bridge.pathFor(file)
    if (next === '') {
      publishNotice(`无法取得磁盘路径：${file.name}`)
      return
    }
    void store.relocate(asset.id, next).then(
      () => { publishNotice(`已重新定位：${file.name}`) },
      (error: unknown) => { publishNotice(`重新定位失败：${error instanceof Error ? error.message : String(error)}`) },
    )
  })
  document.body.append(input)
  input.click()
}

/**
 * Hand a set of assets to one conversation.
 * @param ctx - client context.
 * @param sessionId - target session.
 * @param assets - chosen assets, in the order the user saw them.
 */
async function referenceIntoChat(
  ctx: ClientContext,
  sessionId: string,
  assets: readonly AssetRecord[],
): Promise<void> {
  const conversation = ctx.get('conversation', false) as HostConversation | undefined
  const result = await referenceAssets({
    assets,
    sessionId,
    cwd: cwdOf(ctx, sessionId),
    conversation,
  })
  publishNotice(describeResult(result))
}

/* --------------------------------------------------------------- components */

/** The library panel: the tab page opened from the window tab strip's `+`. */
function Panel(): ReactElement {
  return (
    <AssetLibraryApp
      onReference={(asset) => {
        const sessionId = activeSessionId()
        if (sessionId === '') {
          publishNotice('没有活动会话，无法引用到对话')
          return
        }
        if (panelContext === undefined) return
        void referenceIntoChat(panelContext, sessionId, [asset])
      }}
      onOpenSystem={(asset) => {
        if (panelContext === undefined) return
        void openWithSystem(panelContext, asset)
      }}
      onSettingsChange={(patch) => { void store.setSettings(patch) }}
      onRequestRelocate={(asset) => { requestRelocate(asset) }}
    />
  )
}

/** The invisible bridge: it exists only to capture `inputActions` from the host. */
function InputActionsBridge(props: Record<string, unknown>): null {
  const actions = props.inputActions as HostInputActions | undefined
  const sessionId = sessionIdOf(props)
  useEffect(() => {
    if (actions === undefined) return
    captureInputActions(actions)
    bridgeSessionId = sessionId
    return () => {
      captureInputActions(null)
      if (bridgeSessionId === sessionId) bridgeSessionId = ''
    }
  }, [actions, sessionId])
  return null
}

/**
 * Read the session id off one occupant's props.
 *
 * `conversation.input.left` is a session-scoped slot, so the framework-standard
 * id arrives as a prop; the shapes below are tried in order because the slot
 * carries the owner share under slightly different names across host versions.
 * @param props - the occupant's props.
 * @returns the session id, or an empty string when none is exposed.
 */
function sessionIdOf(props: Record<string, unknown>): string {
  const direct = props.sessionId
  if (typeof direct === 'string') return direct
  const session = props.session
  if (typeof session === 'string') return session
  if (typeof session === 'object' && session !== null) {
    const nested = (session as { sessionId?: unknown; id?: unknown }).sessionId ?? (session as { id?: unknown }).id
    if (typeof nested === 'string') return nested
  }
  return ''
}

/**
 * The conversation the panel should reference into.
 *
 * The bridge's session-scoped id is authoritative; the command path records one
 * as well, so a panel opened before any composer mounted still has a target.
 * @returns the session id, or an empty string when neither source knows one.
 */
function activeSessionId(): string {
  return bridgeSessionId !== '' ? bridgeSessionId : lastCommandSession
}

/** Inline style for the outcome line, so this module needs no stylesheet. */
const NOTICE_STYLE = {
  position: 'fixed',
  right: '20px',
  bottom: '20px',
  zIndex: 60,
  maxWidth: '380px',
  padding: '10px 14px',
  border: '1px solid var(--dsw-alias-border-l1)',
  borderRadius: '10px',
  background: 'var(--dsw-alias-bg-layer-1)',
  color: 'var(--dsw-alias-label-primary)',
  fontFamily: 'var(--dsw-font-family)',
  fontSize: 'var(--dsw-font-xs-13)',
  boxShadow: '0 10px 30px rgb(0 0 0 / 22%)',
  // 这一层骑在宿主界面之上，绝不能吃掉点击：提示只读，不参与指针命中。
  pointerEvents: 'none',
} as const

/** The picker and the outcome line it reports into; rides the overlay slot. */
function PickerHost(): ReactElement | null {
  const state = useStoreState()
  const sessionId = useSyncExternalStore(subscribePicker, pickerSnapshot, pickerSnapshot)
  const text = useSyncExternalStore(subscribeNotice, () => noticeText, () => noticeText)

  useEffect(() => {
    if (text === '') return
    const timer = setTimeout(() => { publishNotice('') }, NOTICE_MS)
    return () => { clearTimeout(timer) }
  }, [text, noticeSeq])

  const close = useCallback(() => { closePicker() }, [])

  const confirm = useCallback((ids: readonly string[]) => {
    const assets = (state?.assets ?? []).filter((asset) => ids.includes(asset.id))
    closePicker()
    if (sessionId === '' || assets.length === 0 || panelContext === undefined) return
    void referenceIntoChat(panelContext, sessionId, assets)
  }, [sessionId, state?.assets])

  return (
    <>
      <AssetPicker
        open={sessionId !== ''}
        assets={state?.assets ?? []}
        onClose={close}
        onConfirm={confirm}
      />
      {text === '' ? null : (
        <div role="status" style={NOTICE_STYLE} data-asset-library-notice="">
          {text}
        </div>
      )}
    </>
  )
}

/**
 * Run one registration step so a failure is never silent.
 *
 * A plugin that throws while registering leaves the shell with a half-composed
 * UI and the user with "点了没反应"; every seam therefore reports through both a
 * prefixed console error (for the F12 console) and the on-screen outcome line.
 * @param what - human-readable name of the seam being registered.
 * @param run - the registration step.
 */
function safeRegister(what: string, run: () => void): void {
  try {
    run()
  } catch (error) {
    console.error(`[dsh-asset-library] ${what} 注册失败`, error)
    publishNotice(`素材库「${what}」注册失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Mount the asset library.
 * @param ctx - client plugin context carrying the `slots` service.
 */
export function apply(ctx: ClientContext): void {
  // The host half verifies and streams files; the browser half only ever needs a
  // path, which the desktop preload can produce for dropped and picked files.
  const bridge = hostPaths()
  setPathResolver(bridge === undefined ? undefined : (file: File) => bridge.pathFor(file))
  panelContext = ctx

  safeRegister('素材库页面', () => {
    ctx.slots.inject(SLOT_NAME, () => ctx.slots.register({ name: SLOT_NAME, id: SLOT_ID }, Panel))
  })
  safeRegister('选择器浮层', () => {
    ctx.slots.inject(OVERLAY_SLOT, () => ctx.slots.register(
      { name: OVERLAY_SLOT, id: SLOT_ID, order: 40 },
      PickerHost,
    ))
  })
  safeRegister('输入区桥', () => {
    ctx.slots.inject(INPUT_BRIDGE_SLOT, () => ctx.slots.register(
      { name: INPUT_BRIDGE_SLOT, id: `${SLOT_ID}-bridge`, order: 900 },
      InputActionsBridge,
    ))
  })

  // The menu row is one contribution among many; if its registration ever throws,
  // the whole `/` candidate list goes blank (ui-commands rejects the pass), so the
  // failure has to name itself instead of looking like a dead composer button.
  safeRegister('「添加素材库」命令', () => {
    ctx.inject(['commandUi'], (scope) => {
      safeRegister('「添加素材库」命令（注入后）', () => {
        const commands = scope.get('commandUi') as CommandUiFace | undefined
        if (commands === undefined) {
          console.error('[dsh-asset-library] commandUi 未解析，菜单行不会出现')
          publishNotice('素材库：commandUi 服务未解析，菜单里不会有「添加素材库」')
          return
        }
        scope.effect(
          () => registerAssetCommand(commands, openPicker),
          'dsh-asset-library: 添加素材库 command',
        )
      })
    })
  })

  void probeRoute()
}

/**
 * Confirm the host route answers.
 *
 * An empty path is what this sends, so `400` is the proof that the route exists;
 * a `404` means the bridge never saw a registration, which the user must see
 * rather than discover later as broken thumbnails.
 * @returns nothing; the outcome is published as a notice.
 */
async function probeRoute(): Promise<void> {
  try {
    const response = await fetch(fileUrl(''), { method: 'HEAD' })
    if (response.status === 404) publishNotice(`素材库文件路由未挂载（${FILE_ROUTE}）`)
  } catch {
    publishNotice(`素材库文件路由不可达（${FILE_ROUTE}）`)
  }
}
