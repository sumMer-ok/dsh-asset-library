/**
 * 素材库的界面文案字典。
 *
 * 为什么不接平台的 locale 服务：本插件的 zhen/en 文案量很小（几十条），而平台
 * locale 服务在不同 DSH 版本里的注入面不一致（0.1 与 0.2 的差异已在同类插件上
 * 踩过坑）。这里改为「每次调用时读一次当前语言」，因此宿主切换语言后下一次重渲染
 * 就会取到新文案，不需要重新装载插件。
 *
 * @module dsh-asset-library/client/locales
 */

/** 一份完整的界面文案。 */
export interface Dictionary {
  /** 标签栏「+」菜单里的那一行。 */
  commandAdd: string
  /** 选择器标题。 */
  pickerTitle: string
  /** 选择器确认按钮（{n} 为已选数量）。 */
  pickerConfirm: string
  pickerCancel: string
  pickerSearchPlaceholder: string
  /** 选择器空态。 */
  pickerEmpty: string
  /** 库面板标题与副标题。 */
  libraryTitle: string
  librarySubtitle: string
  /** 导入区。 */
  dropHint: string
  dropActive: string
  pickFiles: string
  /** 导入进度里每一种状态。 */
  phaseQueued: string
  phaseHashing: string
  phaseThumb: string
  phaseWriting: string
  phaseDone: string
  phaseFailed: string
  phaseDuplicate: string
  /** 重复项对话框。 */
  dupTitle: string
  dupSkip: string
  dupKeep: string
  dupReplace: string
  dupApplyAll: string
  /** 三态。 */
  emptyTitle: string
  emptyHint: string
  loading: string
  errorTitle: string
  retry: string
  detail: string
  /** 工具条。 */
  searchPlaceholder: string
  filterKind: string
  filterTime: string
  filterTags: string
  filterFavorite: string
  filterRating: string
  sortImported: string
  sortName: string
  sortSize: string
  sortRating: string
  sortDesc: string
  timeToday: string
  timeWeek: string
  timeMonth: string
  timeOlder: string
  all: string
  /** 卡片与详情。 */
  reference: string
  favorite: string
  unfavorite: string
  remove: string
  rename: string
  editTags: string
  relocate: string
  openWithSystem: string
  missing: string
  missingHint: string
  selectedCount: string
  clearSelection: string
  /** 引用结果提示。 */
  refAttached: string
  refDegraded: string
  refFailed: string
}

const zh: Dictionary = {
  commandAdd: '添加素材库',
  pickerTitle: '从素材库添加',
  pickerConfirm: '加入对话（{n}）',
  pickerCancel: '取消',
  pickerSearchPlaceholder: '搜索素材…',
  pickerEmpty: '素材库还是空的，先拖入一些文件',
  libraryTitle: '素材库',
  librarySubtitle: '拖入本机文件即可入库',
  dropHint: '把文件拖到这里，或',
  dropActive: '松手即可入库',
  pickFiles: '选择文件',
  phaseQueued: '排队中',
  phaseHashing: '计算指纹',
  phaseThumb: '生成缩略图',
  phaseWriting: '写入索引',
  phaseDone: '完成',
  phaseFailed: '失败',
  phaseDuplicate: '重复',
  dupTitle: '已经存在相同的素材',
  dupSkip: '跳过这一份',
  dupKeep: '保留两份',
  dupReplace: '替换旧的',
  dupApplyAll: '对其余重复项都这么做',
  emptyTitle: '素材库还是空的',
  emptyHint: '把图片、视频或文档拖进来，它们会一直留在这里',
  loading: '正在读取素材库…',
  errorTitle: '素材库打不开了',
  retry: '重试',
  detail: '详情',
  searchPlaceholder: '搜索名称、标签、扩展名…',
  filterKind: '类型',
  filterTime: '时间',
  filterTags: '标签',
  filterFavorite: '只看收藏',
  filterRating: '最低评分',
  sortImported: '导入时间',
  sortName: '名称',
  sortSize: '大小',
  sortRating: '评分',
  sortDesc: '倒序',
  timeToday: '今天',
  timeWeek: '本周',
  timeMonth: '本月',
  timeOlder: '更早',
  all: '全部',
  reference: '引用到对话',
  favorite: '收藏',
  unfavorite: '取消收藏',
  remove: '删除',
  rename: '重命名',
  editTags: '编辑标签',
  relocate: '重新定位',
  openWithSystem: '用系统默认应用打开',
  missing: '原文件已失效',
  missingHint: '文件被移动或删除了，点「重新定位」指认新位置',
  selectedCount: '已选 {n} 项',
  clearSelection: '清空选择',
  refAttached: '已加入 {n} 个附件',
  refDegraded: '其中 {n} 项超过读取上限，已改为插入路径文本',
  refFailed: '引用失败：{reason}',
}

const en: Dictionary = {
  commandAdd: 'Add from assets',
  pickerTitle: 'Add from the asset library',
  pickerConfirm: 'Add to chat ({n})',
  pickerCancel: 'Cancel',
  pickerSearchPlaceholder: 'Search assets…',
  pickerEmpty: 'The library is empty — drop some files in first',
  libraryTitle: 'Assets',
  librarySubtitle: 'Drop local files to add them',
  dropHint: 'Drop files here, or',
  dropActive: 'Release to add',
  pickFiles: 'Choose files',
  phaseQueued: 'Queued',
  phaseHashing: 'Hashing',
  phaseThumb: 'Thumbnailing',
  phaseWriting: 'Indexing',
  phaseDone: 'Done',
  phaseFailed: 'Failed',
  phaseDuplicate: 'Duplicate',
  dupTitle: 'An identical asset already exists',
  dupSkip: 'Skip this one',
  dupKeep: 'Keep both',
  dupReplace: 'Replace the old one',
  dupApplyAll: 'Do this for the remaining duplicates',
  emptyTitle: 'The library is empty',
  emptyHint: 'Drop images, videos or documents here — they stay put',
  loading: 'Opening the library…',
  errorTitle: 'The library could not be opened',
  retry: 'Retry',
  detail: 'Details',
  searchPlaceholder: 'Search names, tags, extensions…',
  filterKind: 'Type',
  filterTime: 'Time',
  filterTags: 'Tags',
  filterFavorite: 'Favourites only',
  filterRating: 'Minimum rating',
  sortImported: 'Imported',
  sortName: 'Name',
  sortSize: 'Size',
  sortRating: 'Rating',
  sortDesc: 'Descending',
  timeToday: 'Today',
  timeWeek: 'This week',
  timeMonth: 'This month',
  timeOlder: 'Earlier',
  all: 'All',
  reference: 'Reference in chat',
  favorite: 'Favourite',
  unfavorite: 'Unfavourite',
  remove: 'Delete',
  rename: 'Rename',
  editTags: 'Edit tags',
  relocate: 'Relocate',
  openWithSystem: 'Open with the default app',
  missing: 'Source file is gone',
  missingHint: 'The file was moved or deleted — use Relocate to point at the new path',
  selectedCount: '{n} selected',
  clearSelection: 'Clear selection',
  refAttached: 'Added {n} attachment(s)',
  refDegraded: '{n} exceeded the read limit and were inserted as paths instead',
  refFailed: 'Reference failed: {reason}',
}

/** 当前语言是否为中文；每次调用都重新判定，宿主切语言后下一次渲染即生效。 */
function prefersChinese(): boolean {
  const lang = typeof document !== 'undefined' && document.documentElement.lang !== ''
    ? document.documentElement.lang
    : (typeof navigator !== 'undefined' ? navigator.language : '')
  return lang.toLowerCase().startsWith('zh')
}

/**
 * 取一条文案并按 `{name}` 占位符做替换。
 * @param key - 字典键。
 * @param params - 占位符取值；缺省时原样保留占位符。
 * @returns 当前语言下的文案。
 */
export function t(key: keyof Dictionary, params?: Record<string, string | number>): string {
  const dict = prefersChinese() ? zh : en
  const raw = dict[key] ?? en[key] ?? String(key)
  if (params === undefined) return raw
  return raw.replace(/\{(\w+)\}/gu, (whole, name: string) => {
    const value = params[name]
    return value === undefined ? whole : String(value)
  })
}
