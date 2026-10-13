/**
 * 把素材库里的素材送进对话。
 *
 * 载荷口径：**所有类型统一走真附件**，与宿主「拖入文件」同源。
 * - 取字节：经本插件的 Range 路由读回原始字节，构造成 `File`；
 * - 建草稿：`ctx.conversation.createDrafts(sessionId, files)`（见 asar
 *   `@deepseek-ai/dsh-client-ui-conversation/lib/client.js:3478`；非图片同样走
 *   `{ kind: 'file' }` 草稿 + 后台上传，这正是 composer 里那个原生 pill 的来源）；
 * - 入草稿：`inputActions.addAttachments(ids)`（同文件 :13476）。
 *
 * 读不到字节时降级为 `@路径` 文件提及（`captureInsertion` + `insertText`，文法与
 * 相对化照宿主 `formatFileMention`:3227 与 `relativizeToCwd`:3253），并把降级数量
 * 报告给调用方明示——宿主那条结构化插入 `draftEditor.insertFileReferences`(:13336)
 * 不在公开面上，所以公开面能拿到的最接近原生的载荷就是真附件。
 *
 * `inputActions` 不是全局对象：它由宿主通过 `ctx.uiSession.provide({ props: ["inputActions"] })`
 * 发给会话作用域内的槽位占用者（同文件 :18127-18140），所以入口装配会往
 * `conversation.input.left` 放一个不渲染任何东西的组件，把这一面捕获到这里。
 *
 * @module dsh-asset-library/client/attachment
 */

import type { AssetRecord } from './data/types.ts'
import { fileUrl, FILE_ROUTE } from './data/route.ts'
import { t } from './locales.ts'

/** 本插件的 Range 文件路由路径（宿主挂在 `ctx.connection.fetch` 的 `/api` 桥下）。 */
export { FILE_ROUTE, fileUrl }

/**
 * 宿主交给输入区槽位的动作面（只列出本模块用到的成员）。
 */
export interface HostInputActions {
  /** 取出当前插入点；返回值只能原样回传给 `insertText`。 */
  captureInsertion(): unknown
  /**
   * 在捕获的插入点插入文本。
   * @param text - 要插入的文本。
   * @param span - `captureInsertion()` 的返回值。
   * @returns 是否插入成功（草稿已被占用时返回 false）。
   */
  insertText(text: string, span: unknown): boolean
  /**
   * 把附件 id 追加到当前草稿。
   * @param ids - 浏览器附件注册表里的 id。
   * @returns 是否接收（提交/裁决中会拒绝）。
   */
  addAttachments(ids: readonly string[]): boolean
}

/** 宿主 `conversation` 服务里本模块用到的那一面。 */
export interface HostConversation {
  /**
   * 为一批浏览器文件建立草稿附件。
   * @param sessionId - 目标会话。
   * @param files - 要登记的浏览器文件。
   * @returns 有序的草稿描述符（每项至少带 `id`）。
   */
  createDrafts(sessionId: string, files: readonly File[]): ReadonlyArray<{ id: string }>
}

let capturedActions: HostInputActions | null = null

/**
 * 记录（或清除）宿主交到输入区槽位手里的动作面。
 * @param actions - 槽位 props 里的 `inputActions`；组件卸载时传 null。
 */
export function captureInputActions(actions: HostInputActions | null): void {
  capturedActions = actions
}

/** 当前的输入动作面；宿主没挂载输入区时为 null。 */
export function currentInputActions(): HostInputActions | null {
  return capturedActions
}

/**
 * 把一条绝对路径格式化成宿主认识的文件提及文本。
 * @param path - 素材的绝对路径。
 * @param cwd - 会话工作区根；路径落在其内时去掉该前缀。
 * @returns `@path` 或（含空白时）`@"path"`。
 */
export function mentionFor(path: string, cwd: string | undefined): string | undefined {
  let text = path
  if (cwd !== undefined && cwd !== '') {
    const root = cwd.replace(/[/\\]+$/u, '')
    if (text.startsWith(`${root}/`) || text.startsWith(`${root}\\`)) text = text.slice(root.length + 1)
  }
  // 与宿主同一套安全判据：控制字符与双引号无法被编辑器文法表达。
  if (/[\u0000-\u001f\u007f-\u009f"]/u.test(text)) return undefined
  return /\s/u.test(text) ? `@"${text}"` : `@${text}`
}

/**
 * 经本插件路由取回素材字节并包装成 `File`。
 * @param asset - 目标素材。
 * @returns 浏览器 `File`。
 * @throws 路由拒绝（403/404/413）或网络失败时抛出带状态码的错误。
 */
export async function readAsFile(asset: AssetRecord): Promise<File> {
  const response = await fetch(fileUrl(asset.path), { credentials: 'same-origin' })
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText || 'read failed'}`)
  }
  const blob = await response.blob()
  return new File([blob], asset.name, { type: asset.mediaType || blob.type || 'application/octet-stream' })
}

/** 一次引用的结果统计。 */
export interface ReferenceResult {
  /** 作为真附件送出的数量。 */
  attached: number
  /** 降级为 `@路径` 文本的数量（读不到字节时）。 */
  degraded: number
  /** 逐条失败原因；为空表示全部成功。 */
  failures: string[]
}

/**
 * 把一批素材引用进当前对话。
 *
 * **所有类型统一走真附件**：读回原始字节 → `createDrafts` → `addAttachments`。
 * 这条路径与宿主「拖入文件」完全同源（宿主在拿不到磁盘路径时也走 `uploads → createDrafts`），
 * 因此 composer 渲染出的 pill 与拖入完全一致——这是「引用样式要和拖入一致」的正解。
 *
 * 读不到字节时（超过 `routeMaxBytes`、路由拒绝、原文件失效）**降级**为 `@路径` 文件提及，
 * 并把降级项记进 `degraded` 让界面明说，绝不静默或假装成功。
 *
 * @param options - 引用所需的宿主面与目标。
 * @returns 各类载荷的成交数量、降级数量与失败原因。
 */
export async function referenceAssets(options: {
  assets: readonly AssetRecord[]
  sessionId: string
  cwd: string | undefined
  conversation: HostConversation | undefined
  actions?: HostInputActions | null
}): Promise<ReferenceResult> {
  const actions = options.actions ?? capturedActions
  const result: ReferenceResult = { attached: 0, degraded: 0, failures: [] }

  if (actions === null || actions === undefined) {
    result.failures.push(t('refFailed', { reason: '输入区尚未就绪' }))
    return result
  }

  const files: File[] = []
  const mentionTexts: string[] = []
  for (const asset of options.assets) {
    try {
      files.push(await readAsFile(asset))
      continue
    } catch (error) {
      const mention = mentionFor(asset.path, options.cwd)
      if (mention === undefined) {
        result.failures.push(
          `${asset.name}: ${error instanceof Error ? error.message : String(error)}（且路径无法被编辑器文法表达）`,
        )
        continue
      }
      mentionTexts.push(mention)
      result.degraded += 1
    }
  }

  if (files.length > 0) {
    if (options.conversation === undefined) {
      result.failures.push(t('refFailed', { reason: '附件服务不可用' }))
    } else {
      try {
        const drafts = options.conversation.createDrafts(options.sessionId, files)
        if (actions.addAttachments(drafts.map((draft) => draft.id))) result.attached = drafts.length
        else result.failures.push(t('refFailed', { reason: '草稿正在提交' }))
      } catch (error) {
        result.failures.push(t('refFailed', { reason: error instanceof Error ? error.message : String(error) }))
      }
    }
  }

  if (mentionTexts.length > 0) {
    const span = actions.captureInsertion()
    if (actions.insertText(`${mentionTexts.join(' ')} `, span)) {
      // mentionTexts 已在上面计进 degraded；这里只负责把文本真正插进草稿。
    } else {
      result.degraded = Math.max(0, result.degraded - mentionTexts.length)
      result.failures.push(t('refFailed', { reason: '插入点已失效' }))
    }
  }

  return result
}

/** 把一次引用的结果整理成一行可显示的中文提示。 */
export function describeResult(result: ReferenceResult): string {
  const parts: string[] = []
  if (result.attached > 0) parts.push(t('refAttached', { n: result.attached }))
  if (result.degraded > 0) parts.push(t('refDegraded', { n: result.degraded }))
  if (result.failures.length > 0) parts.push(result.failures.join('；'))
  return parts.length > 0 ? parts.join(' · ') : t('refFailed', { reason: '没有可引用的素材' })
}
