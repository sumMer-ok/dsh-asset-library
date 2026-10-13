/**
 * 往对话框左下角「+」的菜单里加一行「添加素材库」。
 *
 * 那个「+」与键入 `/` 打开的是同一个菜单，条目来自宿主的命令注册表；业务包的加法是
 * `ctx.commandUi.register({ name, label, icon, available, ui: { kind: "action", run } })`
 * （运行实例里的官方「文件」行就是这么注册的：
 * asar @deepseek-ai/dsh-client-ui-conversation/lib/client.js:18112）。
 *
 * ⚠️ 菜单分区由宿主内部常量 `SECTION_ROWS` 决定（同版本 ui-commands 的
 * presentation 段：`add: ["file","goal","plan","feedback"]`，
 * `commands: ["compact","permission","model","export"]`），**未列出的行一律落在
 * 「指令」分区末尾**。第三方无法把自己塞进「添加」分区，除非改宿主内核那一行常量。
 *
 * @module dsh-asset-library/client/command
 */

import { IconBrowseOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { t } from './locales.ts'

/** 宿主交到 `run`/`available` 手里的会话上下文（只列出本模块用到的成员）。 */
export interface HostSession {
  /** 目标会话身份。 */
  sessionId: string
}

/** 一条客户端自有命令的注册规格（宿主契约的子集）。 */
export interface AssetCommandContribution {
  /** 命令行名字，去掉前导斜杠；与宿主同名会在候选合成时明确报错。 */
  name: string
  /** 菜单行标题；宿主每次生成候选项都会重新读取，因此语言切换即时生效。 */
  label: () => string
  /** 菜单行说明。 */
  description: () => string
  /** 行图标（宿主按组件渲染）。 */
  icon: unknown
  /** 裸调用可用性。 */
  available: (session: HostSession) => boolean
  /** 行为：一次动作，消费触发 token 后运行回调，不提交消息。 */
  ui: { kind: 'action'; run: (session: HostSession) => void }
}

/** 宿主 `ctx.commandUi` 服务里本模块用到的那一面。 */
export interface CommandUiFace {
  /**
   * 注册一条客户端命令。
   * @param contribution - 命令规格。
   * @returns 注销器。
   */
  register(contribution: AssetCommandContribution): () => void
}

/** 命令名。 */
export const ASSET_COMMAND_NAME = 'assets'

/**
 * 构造「添加素材库」这一行。
 * @param options - 打开选择器的回调，收到目标会话 id。
 * @returns 可直接交给 `ctx.commandUi.register` 的规格。
 */
export function createAssetCommand(options: { open: (sessionId: string) => void }): AssetCommandContribution {
  return {
    name: ASSET_COMMAND_NAME,
    label: () => t('commandAdd'),
    description: () => t('pickerTitle'),
    icon: IconBrowseOutlineRegular,
    available: () => true,
    ui: {
      kind: 'action',
      run: (session: HostSession) => {
        options.open(session.sessionId)
      },
    },
  }
}

/**
 * 把这一行注册进菜单。
 * @param commands - `ctx.commandUi` 服务。
 * @param open - 打开选择器的回调。
 * @returns 注销器；同名重复注册由宿主抛出。
 */
export function registerAssetCommand(
  commands: CommandUiFace,
  open: (sessionId: string) => void,
): () => void {
  return commands.register(createAssetCommand({ open }))
}
