window.__ModuleLoader__.load({ id: "dsh-asset-library",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let react = require("react");
let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/client/data/route.ts
/**
* The one wire constant the browser half and the host half must agree on.
*
* The host registers exactly this pathname on `ctx.connection.fetch`, and every
* browser-side read — thumbnail verification, original preview, video playback,
* and the byte fetch behind "reference in chat" — goes through it. It lives in
* the data layer so `store.ts` can use it without importing presentation code.
* `tests/route.spec.ts` asserts the host's `ROUTE_PATH` equals this string, so
* the two halves cannot drift apart silently.
*
* The path must stay under `/api/`: that is the single bridge the connection
* owns, and any other pathname is unclaimed and answers 404.
*
* @module dsh-asset-library/client/data/route
*/
/** Absolute pathname of this plugin's host file route. */
const FILE_ROUTE = "/api/plugins/dsh-asset-library/file";
/**
* Build the read URL for one asset path.
* @param path - Absolute host path of the asset.
* @returns A same-origin URL for `fetch`, `<img>`, `<video>`, or a HEAD probe.
*/
function fileUrl(path) {
	return `${FILE_ROUTE}?path=${encodeURIComponent(path)}`;
}
//#endregion
//#region src/client/locales.ts
const zh = {
	commandAdd: "添加素材库",
	pickerTitle: "从素材库添加",
	pickerConfirm: "加入对话（{n}）",
	pickerCancel: "取消",
	pickerSearchPlaceholder: "搜索素材…",
	pickerEmpty: "素材库还是空的，先拖入一些文件",
	libraryTitle: "素材库",
	librarySubtitle: "拖入本机文件即可入库",
	dropHint: "把文件拖到这里，或",
	dropActive: "松手即可入库",
	pickFiles: "选择文件",
	phaseQueued: "排队中",
	phaseHashing: "计算指纹",
	phaseThumb: "生成缩略图",
	phaseWriting: "写入索引",
	phaseDone: "完成",
	phaseFailed: "失败",
	phaseDuplicate: "重复",
	dupTitle: "已经存在相同的素材",
	dupSkip: "跳过这一份",
	dupKeep: "保留两份",
	dupReplace: "替换旧的",
	dupApplyAll: "对其余重复项都这么做",
	emptyTitle: "素材库还是空的",
	emptyHint: "把图片、视频或文档拖进来，它们会一直留在这里",
	loading: "正在读取素材库…",
	errorTitle: "素材库打不开了",
	retry: "重试",
	detail: "详情",
	searchPlaceholder: "搜索名称、标签、扩展名…",
	filterKind: "类型",
	filterTime: "时间",
	filterTags: "标签",
	filterFavorite: "只看收藏",
	filterRating: "最低评分",
	sortImported: "导入时间",
	sortName: "名称",
	sortSize: "大小",
	sortRating: "评分",
	sortDesc: "倒序",
	timeToday: "今天",
	timeWeek: "本周",
	timeMonth: "本月",
	timeOlder: "更早",
	all: "全部",
	reference: "引用到对话",
	favorite: "收藏",
	unfavorite: "取消收藏",
	remove: "删除",
	rename: "重命名",
	editTags: "编辑标签",
	relocate: "重新定位",
	openWithSystem: "用系统默认应用打开",
	missing: "原文件已失效",
	missingHint: "文件被移动或删除了，点「重新定位」指认新位置",
	selectedCount: "已选 {n} 项",
	clearSelection: "清空选择",
	refAttached: "已加入 {n} 个附件",
	refDegraded: "其中 {n} 项超过读取上限，已改为插入路径文本",
	refFailed: "引用失败：{reason}"
};
const en = {
	commandAdd: "Add from assets",
	pickerTitle: "Add from the asset library",
	pickerConfirm: "Add to chat ({n})",
	pickerCancel: "Cancel",
	pickerSearchPlaceholder: "Search assets…",
	pickerEmpty: "The library is empty — drop some files in first",
	libraryTitle: "Assets",
	librarySubtitle: "Drop local files to add them",
	dropHint: "Drop files here, or",
	dropActive: "Release to add",
	pickFiles: "Choose files",
	phaseQueued: "Queued",
	phaseHashing: "Hashing",
	phaseThumb: "Thumbnailing",
	phaseWriting: "Indexing",
	phaseDone: "Done",
	phaseFailed: "Failed",
	phaseDuplicate: "Duplicate",
	dupTitle: "An identical asset already exists",
	dupSkip: "Skip this one",
	dupKeep: "Keep both",
	dupReplace: "Replace the old one",
	dupApplyAll: "Do this for the remaining duplicates",
	emptyTitle: "The library is empty",
	emptyHint: "Drop images, videos or documents here — they stay put",
	loading: "Opening the library…",
	errorTitle: "The library could not be opened",
	retry: "Retry",
	detail: "Details",
	searchPlaceholder: "Search names, tags, extensions…",
	filterKind: "Type",
	filterTime: "Time",
	filterTags: "Tags",
	filterFavorite: "Favourites only",
	filterRating: "Minimum rating",
	sortImported: "Imported",
	sortName: "Name",
	sortSize: "Size",
	sortRating: "Rating",
	sortDesc: "Descending",
	timeToday: "Today",
	timeWeek: "This week",
	timeMonth: "This month",
	timeOlder: "Earlier",
	all: "All",
	reference: "Reference in chat",
	favorite: "Favourite",
	unfavorite: "Unfavourite",
	remove: "Delete",
	rename: "Rename",
	editTags: "Edit tags",
	relocate: "Relocate",
	openWithSystem: "Open with the default app",
	missing: "Source file is gone",
	missingHint: "The file was moved or deleted — use Relocate to point at the new path",
	selectedCount: "{n} selected",
	clearSelection: "Clear selection",
	refAttached: "Added {n} attachment(s)",
	refDegraded: "{n} exceeded the read limit and were inserted as paths instead",
	refFailed: "Reference failed: {reason}"
};
/** 当前语言是否为中文；每次调用都重新判定，宿主切语言后下一次渲染即生效。 */
function prefersChinese() {
	return (typeof document !== "undefined" && document.documentElement.lang !== "" ? document.documentElement.lang : typeof navigator !== "undefined" ? navigator.language : "").toLowerCase().startsWith("zh");
}
/**
* 取一条文案并按 `{name}` 占位符做替换。
* @param key - 字典键。
* @param params - 占位符取值；缺省时原样保留占位符。
* @returns 当前语言下的文案。
*/
function t(key, params) {
	const raw = (prefersChinese() ? zh : en)[key] ?? en[key] ?? String(key);
	if (params === void 0) return raw;
	return raw.replace(/\{(\w+)\}/gu, (whole, name) => {
		const value = params[name];
		return value === void 0 ? whole : String(value);
	});
}
//#endregion
//#region src/client/attachment.ts
let capturedActions = null;
/**
* 记录（或清除）宿主交到输入区槽位手里的动作面。
* @param actions - 槽位 props 里的 `inputActions`；组件卸载时传 null。
*/
function captureInputActions(actions) {
	capturedActions = actions;
}
/**
* 把一条绝对路径格式化成宿主认识的文件提及文本。
* @param path - 素材的绝对路径。
* @param cwd - 会话工作区根；路径落在其内时去掉该前缀。
* @returns `@path` 或（含空白时）`@"path"`。
*/
function mentionFor(path, cwd) {
	let text = path;
	if (cwd !== void 0 && cwd !== "") {
		const root = cwd.replace(/[/\\]+$/u, "");
		if (text.startsWith(`${root}/`) || text.startsWith(`${root}\\`)) text = text.slice(root.length + 1);
	}
	if (/[\u0000-\u001f\u007f-\u009f"]/u.test(text)) return void 0;
	return /\s/u.test(text) ? `@"${text}"` : `@${text}`;
}
/**
* 经本插件路由取回素材字节并包装成 `File`。
* @param asset - 目标素材。
* @returns 浏览器 `File`。
* @throws 路由拒绝（403/404/413）或网络失败时抛出带状态码的错误。
*/
async function readAsFile(asset) {
	const response = await fetch(fileUrl(asset.path), { credentials: "same-origin" });
	if (!response.ok) throw new Error(`${response.status} ${response.statusText || "read failed"}`);
	const blob = await response.blob();
	return new File([blob], asset.name, { type: asset.mediaType || blob.type || "application/octet-stream" });
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
async function referenceAssets(options) {
	const actions = options.actions ?? capturedActions;
	const result = {
		attached: 0,
		degraded: 0,
		failures: []
	};
	if (actions === null || actions === void 0) {
		result.failures.push(t("refFailed", { reason: "输入区尚未就绪" }));
		return result;
	}
	const files = [];
	const mentionTexts = [];
	for (const asset of options.assets) try {
		files.push(await readAsFile(asset));
		continue;
	} catch (error) {
		const mention = mentionFor(asset.path, options.cwd);
		if (mention === void 0) {
			result.failures.push(`${asset.name}: ${error instanceof Error ? error.message : String(error)}（且路径无法被编辑器文法表达）`);
			continue;
		}
		mentionTexts.push(mention);
		result.degraded += 1;
	}
	if (files.length > 0) {
		if (options.conversation === void 0) result.failures.push(t("refFailed", { reason: "附件服务不可用" }));
		else try {
			const drafts = options.conversation.createDrafts(options.sessionId, files);
			if (actions.addAttachments(drafts.map((draft) => draft.id))) result.attached = drafts.length;
			else result.failures.push(t("refFailed", { reason: "草稿正在提交" }));
		} catch (error) {
			result.failures.push(t("refFailed", { reason: error instanceof Error ? error.message : String(error) }));
		}
	}
	if (mentionTexts.length > 0) {
		const span = actions.captureInsertion();
		if (actions.insertText(`${mentionTexts.join(" ")} `, span)) {} else {
			result.degraded = Math.max(0, result.degraded - mentionTexts.length);
			result.failures.push(t("refFailed", { reason: "插入点已失效" }));
		}
	}
	return result;
}
/** 把一次引用的结果整理成一行可显示的中文提示。 */
function describeResult(result) {
	const parts = [];
	if (result.attached > 0) parts.push(t("refAttached", { n: result.attached }));
	if (result.degraded > 0) parts.push(t("refDegraded", { n: result.degraded }));
	if (result.failures.length > 0) parts.push(result.failures.join("；"));
	return parts.length > 0 ? parts.join(" · ") : t("refFailed", { reason: "没有可引用的素材" });
}
//#endregion
//#region src/client/command.ts
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
/** 命令名。 */
const ASSET_COMMAND_NAME = "assets";
/**
* 构造「添加素材库」这一行。
* @param options - 打开选择器的回调，收到目标会话 id。
* @returns 可直接交给 `ctx.commandUi.register` 的规格。
*/
function createAssetCommand(options) {
	return {
		name: ASSET_COMMAND_NAME,
		label: () => t("commandAdd"),
		description: () => t("pickerTitle"),
		icon: _deepseek_ai_dsh_client_ui_primitives.IconBrowseOutlineRegular,
		available: () => true,
		ui: {
			kind: "action",
			run: (session) => {
				options.open(session.sessionId);
			}
		}
	};
}
/**
* 把这一行注册进菜单。
* @param commands - `ctx.commandUi` 服务。
* @param open - 打开选择器的回调。
* @returns 注销器；同名重复注册由宿主抛出。
*/
function registerAssetCommand(commands, open) {
	return commands.register(createAssetCommand({ open }));
}
//#endregion
//#region src/client/data/settings.ts
/** 设置默认值（计划 §4）；`readSettings()` 用它补齐 `meta.settings` 的缺失项。 */
const DEFAULT_SETTINGS = {
	thumbMaxEdge: 512,
	thumbQuality: .85,
	maxImportBytes: 2147483648,
	routeMaxBytes: 67108864,
	videoSeekRatio: .1,
	videoTimeoutMs: 4e3,
	wallpaperKey: null,
	wallpaperMask: 35,
	curationOpen: false
};
//#endregion
//#region src/client/data/db.ts
/**
* IndexedDB 持久层（DB 名 `dsh-asset-library`，版本 2）。
* 原始素材字节不入库；只有元数据与缩略图 Blob，外加一张可选的自定义壁纸。
*/
const DB_NAME = "dsh-asset-library";
/** 版本 2 新增 `wallpaper` store；升级块按 `contains` 幂等判断，老库数据原地保留。 */
const DB_VERSION = 2;
const STORE_ASSETS = "assets";
const STORE_META = "meta";
const STORE_WALLPAPER = "wallpaper";
/** 自定义壁纸固定占这一条记录（全局唯一，不随会话变化）。 */
const WALLPAPER_KEY = "current";
/** 待删除批次（撤销窗口内）在 `meta` 里的键。 */
const PENDING_DELETE_KEY = "pendingDelete";
/** 整批重放的退避间隔；第 3 次失败后不再重试。 */
const RETRY_DELAYS_MS = [
	100,
	300,
	900
];
/** 打开连接本身的重试上限与退避。 */
const OPEN_RETRY_DELAYS_MS = [
	100,
	300,
	900
];
/** 把底层异常折成一句可读中文，不做静默吞掉。 */
function describeError(e) {
	try {
		if (e instanceof Error) return `${e.name}: ${e.message}`;
		if (typeof e === "string") return e;
		return JSON.stringify(e) ?? String(e);
	} catch {
		return String(e);
	}
}
/** 构造带中文原因的 DomainError，保留原始异常为 `cause`。 */
function fail(message, e) {
	return new Error(`${message}（原因：${describeError(e)}）`, { cause: e });
}
/** 以 `transaction.oncomplete` 判定提交成功，否则取 abort/error 的原因。 */
function runTransaction(db, stores, mode, body) {
	return new Promise((resolve) => {
		let tx;
		try {
			tx = db.transaction(stores, mode);
		} catch (e) {
			resolve({
				ok: false,
				error: e
			});
			return;
		}
		let settled = false;
		let value;
		const finish = (result) => {
			if (settled) return;
			settled = true;
			resolve(result);
		};
		tx.oncomplete = () => finish({
			ok: true,
			value
		});
		tx.onabort = () => finish({
			ok: false,
			error: tx.error ?? /* @__PURE__ */ new Error("事务被中止")
		});
		tx.onerror = () => finish({
			ok: false,
			error: tx.error ?? /* @__PURE__ */ new Error("事务出错")
		});
		try {
			Promise.resolve(body(tx)).then((v) => {
				value = v;
			}, (e) => {
				try {
					tx.abort();
				} catch {}
				finish({
					ok: false,
					error: e
				});
			});
		} catch (e) {
			try {
				tx.abort();
			} catch {}
			finish({
				ok: false,
				error: e
			});
		}
	});
}
/** 请求 Promise 化；错误信息由调用方补中文原因。 */
function toPromise(req) {
	return new Promise((resolve, reject) => {
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error ?? /* @__PURE__ */ new Error("请求失败"));
	});
}
/** 等待若干毫秒（重放退避）。 */
function delay(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
let dbPromise;
/** 打开（并首次建库）连接；同一进程内复用，失败后不缓存被拒的连接。 */
function openDb() {
	if (dbPromise) return dbPromise;
	const attempt = (triesLeft) => {
		return new Promise((resolve, reject) => {
			let req;
			try {
				req = indexedDB.open(DB_NAME, DB_VERSION);
			} catch (e) {
				reject(fail("打开素材库数据库失败（无法发起 open）", e));
				return;
			}
			req.onupgradeneeded = () => {
				const db = req.result;
				if (!db.objectStoreNames.contains(STORE_ASSETS)) {
					const assets = db.createObjectStore(STORE_ASSETS, { keyPath: "id" });
					assets.createIndex("kind", "kind", { unique: false });
					assets.createIndex("importedAt", "importedAt", { unique: false });
					assets.createIndex("hash", "hash", { unique: false });
					assets.createIndex("cheap", "cheap", { unique: false });
					assets.createIndex("favorite", "favorite", { unique: false });
					assets.createIndex("tags", "tags", {
						unique: false,
						multiEntry: true
					});
				}
				if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META, { keyPath: "key" });
				if (!db.objectStoreNames.contains(STORE_WALLPAPER)) db.createObjectStore(STORE_WALLPAPER, { keyPath: "key" });
			};
			req.onsuccess = () => {
				const db = req.result;
				db.onversionchange = () => db.close();
				resolve(db);
			};
			req.onerror = () => reject(req.error ?? /* @__PURE__ */ new Error("打开数据库失败"));
			req.onblocked = () => reject(/* @__PURE__ */ new Error("数据库被其它标签页阻塞（请关闭其它素材库标签页后重试）"));
		}).catch(async (e) => {
			if (triesLeft > 0) {
				const idx = OPEN_RETRY_DELAYS_MS.length - triesLeft;
				await delay(OPEN_RETRY_DELAYS_MS[idx] ?? 900);
				return attempt(triesLeft - 1);
			}
			throw fail("打开素材库数据库失败（已重试 3 次）", e);
		});
	};
	dbPromise = attempt(OPEN_RETRY_DELAYS_MS.length).catch((e) => {
		dbPromise = void 0;
		throw e;
	});
	return dbPromise;
}
/**
* 单事务写入一批（≤10 条）；失败整批重放，退避 100/300/900ms。
* @param list 同一事务内的记录；调用方负责保证 ≤ BATCH_SIZE。
* @returns 仍然失败的记录（空数组表示全部成功）。
*/
function putBatch(db, list) {
	const attempt = async (round) => {
		if ((await runTransaction(db, STORE_ASSETS, "readwrite", (tx) => {
			const store = tx.objectStore(STORE_ASSETS);
			for (const a of list) store.put(a);
		})).ok) return [];
		if (round >= RETRY_DELAYS_MS.length) return list;
		await delay(RETRY_DELAYS_MS[round] ?? 900);
		return attempt(round + 1);
	};
	return attempt(0);
}
/**
* 写入单条素材（写入前校验缩略图为非空 Blob）。
* @param a 完整记录；`thumb` 必须是 image/* 的非空 Blob。
* @throws 记录非法或写入失败（重放 3 次后）时抛中文原因。
*/
async function putAsset(a) {
	verifyThumb(a);
	if ((await putBatch(await openDb(), [a])).length > 0) throw fail(`写入素材「${a.name}」失败（已重放 3 次）`, /* @__PURE__ */ new Error("事务未提交"));
}
/**
* 读取单条素材，并校验缩略图 Blob 未损坏。
* @param id 素材 id。
* @throws 读取失败或 Blob 与其 size/type 不符（视为缩略图损坏，需重新导入）。
*/
async function getAsset(id) {
	const db = await openDb();
	let record;
	try {
		record = await toPromise(db.transaction(STORE_ASSETS, "readonly").objectStore(STORE_ASSETS).get(id));
	} catch (e) {
		throw fail(`读取素材 ${id} 失败`, e);
	}
	if (record) verifyThumb(record);
	return record;
}
/** 校验缩略图 Blob 合法：类型为 image/*、尺寸非负且字节数大于 0。 */
function verifyThumb(record) {
	const t = record.thumb;
	if (!(t instanceof Blob)) throw new Error(`素材「${record.name}」的缩略图已损坏（不是 Blob，需重新导入）`);
	if (t.size <= 0) throw new Error(`素材「${record.name}」的缩略图已损坏（字节数为 0，需重新导入）`);
	if (!t.type.startsWith("image/")) throw new Error(`素材「${record.name}」的缩略图已损坏（类型 ${t.type || "(空)"} 不是图片，需重新导入）`);
}
/**
* 读取全部素材，逐条校验缩略图；损坏条目以 `thumbnail-error` 事件可见，不中断整表读取。
* @returns 未损坏的记录（损坏条目由 host 侧 store 标记，见 store.init）。
*/
async function getAllAssets() {
	const db = await openDb();
	let all;
	try {
		all = await toPromise(db.transaction(STORE_ASSETS, "readonly").objectStore(STORE_ASSETS).getAll());
	} catch (e) {
		throw fail("读取素材列表失败", e);
	}
	const good = [];
	for (const record of all) try {
		verifyThumb(record);
		good.push(record);
	} catch (e) {
		reportThumbError(record, e);
	}
	return good;
}
/** 缩略图损坏的可见上报通道；S3 可订阅后展示「需重新导入」。 */
const thumbErrorListeners = /* @__PURE__ */ new Set();
/**
* 订阅缩略图损坏事件。
* @param listener 收到损坏记录与中文原因。
* @returns 取消订阅函数。
*/
function onThumbError(listener) {
	thumbErrorListeners.add(listener);
	return () => {
		thumbErrorListeners.delete(listener);
	};
}
function reportThumbError(record, e) {
	const message = e instanceof Error ? e.message : describeError(e);
	for (const listener of thumbErrorListeners) try {
		listener(record, message);
	} catch {}
}
/**
* 删除若干素材（单事务；ids 为空时直接返回）。
* @param ids 素材 id 列表。
* @throws 删除失败时抛中文原因。
*/
async function deleteAssets(ids) {
	if (ids.length === 0) return;
	const result = await runTransaction(await openDb(), STORE_ASSETS, "readwrite", (tx) => {
		const store = tx.objectStore(STORE_ASSETS);
		for (const id of ids) store.delete(id);
	});
	if (!result.ok) throw fail(`删除 ${ids.length} 条素材失败`, result.error);
}
/**
* 局部更新一条素材（先读后写；读-写之间不做事务持有，避免跨 await 的事务生命周期问题）。
* @param id 素材 id。
* @param patch 只覆盖给出的字段。
* @throws 素材不存在或写入失败时抛中文原因。
*/
async function patchAsset(id, patch) {
	const current = await getAsset(id);
	if (!current) throw new Error(`更新素材 ${id} 失败：素材不存在`);
	await putAsset({
		...current,
		...patch,
		id: current.id
	});
}
/**
* 按完整内容哈希查重。
* @param hash sha256 hex。
* @returns 同哈希的记录；索引不可用时回退全表过滤。
*/
async function findByHash(hash) {
	const db = await openDb();
	try {
		return await toPromise(db.transaction(STORE_ASSETS, "readonly").objectStore(STORE_ASSETS).index("hash").getAll(hash));
	} catch {
		return (await getAllAssets()).filter((a) => a.hash === hash);
	}
}
/**
* 读取 meta 键。
* @param key 键名。
* @throws 读取失败时抛中文原因。
*/
async function readMeta(key) {
	const db = await openDb();
	try {
		return (await toPromise(db.transaction(STORE_META, "readonly").objectStore(STORE_META).get(key)))?.value;
	} catch (e) {
		throw fail(`读取配置项「${key}」失败`, e);
	}
}
/**
* 写入 meta 键。
* @param key 键名。
* @param value 任意可结构化克隆的值。
* @throws 写入失败时抛中文原因。
*/
async function writeMeta(key, value) {
	const result = await runTransaction(await openDb(), STORE_META, "readwrite", (tx) => {
		tx.objectStore(STORE_META).put({
			key,
			value
		});
	});
	if (!result.ok) throw fail(`写入配置项「${key}」失败`, result.error);
}
/**
* 写入（或覆盖）唯一那张自定义壁纸。
* @param blob 壁纸图片字节。
* @param meta 展示与配额核对用的元信息。
* @throws 参数非法或写入失败时抛中文原因。
*/
async function putWallpaper(blob, meta) {
	if (!(blob instanceof Blob) || blob.size <= 0) throw new Error("保存壁纸失败：图片内容为空");
	const db = await openDb();
	const row = {
		key: WALLPAPER_KEY,
		blob,
		name: meta.name,
		type: meta.type,
		bytes: meta.bytes,
		updatedAt: Date.now()
	};
	const result = await runTransaction(db, STORE_WALLPAPER, "readwrite", (tx) => {
		tx.objectStore(STORE_WALLPAPER).put(row);
	});
	if (!result.ok) throw fail("保存壁纸失败", result.error);
}
/**
* 读取自定义壁纸。
* @returns 已保存的图片字节；没有壁纸时返回 `undefined`。
* @throws 读取失败或记录损坏（不是非空 Blob）时抛中文原因——损坏要让用户看见并重新选择，不能静默当成"没有壁纸"。
*/
async function getWallpaper() {
	const db = await openDb();
	let row;
	try {
		row = await toPromise(db.transaction(STORE_WALLPAPER, "readonly").objectStore(STORE_WALLPAPER).get(WALLPAPER_KEY));
	} catch (e) {
		throw fail("读取壁纸失败", e);
	}
	if (row === void 0) return void 0;
	const blob = row.blob;
	if (!(blob instanceof Blob) || blob.size <= 0) throw new Error("已保存的壁纸已损坏（内容为空或不是图片），请重新选择壁纸");
	return blob;
}
/**
* 删除自定义壁纸（没有壁纸时也是成功）。
* @throws 删除失败时抛中文原因。
*/
async function clearWallpaper() {
	const result = await runTransaction(await openDb(), STORE_WALLPAPER, "readwrite", (tx) => {
		tx.objectStore(STORE_WALLPAPER).delete(WALLPAPER_KEY);
	});
	if (!result.ok) throw fail("恢复默认壁纸失败", result.error);
}
/**
* 读取待删除批次（撤销窗口内）。
* @returns 写入时的原值；没有待删除批次时返回 `undefined`。
* @throws 读取失败时抛中文原因。
*/
async function readPendingDelete() {
	return readMeta(PENDING_DELETE_KEY);
}
/**
* 写入待删除批次。
* @param value 由调用方定义结构（store 侧负责校验）。
* @throws 写入失败时抛中文原因。
*/
async function writePendingDelete(value) {
	await writeMeta(PENDING_DELETE_KEY, value);
}
/**
* 清空待删除批次（撤销成功、或删除已真正执行）。
* @throws 写入失败时抛中文原因。
*/
async function clearPendingDelete() {
	const result = await runTransaction(await openDb(), STORE_META, "readwrite", (tx) => {
		tx.objectStore(STORE_META).delete(PENDING_DELETE_KEY);
	});
	if (!result.ok) throw fail("清理待删除记录失败", result.error);
}
/** `PluginSettings` 里合法的遮罩强度区间（百分比）。 */
const WALLPAPER_MASK_RANGE = {
	min: 0,
	max: 90
};
/** 把遮罩强度钳制进合法区间并取整。 */
function clampMask$1(value) {
	return Math.min(WALLPAPER_MASK_RANGE.max, Math.max(WALLPAPER_MASK_RANGE.min, Math.round(value)));
}
/**
* 逐字段校验并补齐设置默认值；非法值回退默认，数值型越界项按各自规则钳制。
*
* 三类字段分别处理：数值（`wallpaperMask` 额外钳制）、`wallpaperKey`（`null` 或非空字符串）、
* 布尔（`curationOpen`）。**这里新增分支时，`tests/data/settings.spec.ts` 的
* 「每个默认字段都能往返」用例会同时检查到——漏登记一个字段会被那条用例抓住**，不靠注释自觉。
*/
function mergeSettings(raw) {
	const merged = { ...DEFAULT_SETTINGS };
	if (!raw || typeof raw !== "object") return merged;
	const source = raw;
	const numbers = {};
	for (const key of Object.keys(DEFAULT_SETTINGS)) {
		if (key === "wallpaperMask") continue;
		if (typeof DEFAULT_SETTINGS[key] !== "number") continue;
		const value = source[key];
		if (typeof value === "number" && Number.isFinite(value)) numbers[key] = value;
	}
	Object.assign(merged, numbers);
	const mask = source.wallpaperMask;
	merged.wallpaperMask = clampMask$1(typeof mask === "number" && Number.isFinite(mask) ? mask : merged.wallpaperMask);
	const wallpaperKey = source.wallpaperKey;
	if (wallpaperKey === null) merged.wallpaperKey = null;
	else if (typeof wallpaperKey === "string" && wallpaperKey !== "") merged.wallpaperKey = wallpaperKey;
	if (typeof source.curationOpen === "boolean") merged.curationOpen = source.curationOpen;
	return merged;
}
/**
* 读取设置：默认值与 `meta.settings` 合并（后者优先）。
* @returns 完整的 PluginSettings，绝不出现缺字段。
* @throws 读取失败时抛中文原因（不回退默认，避免用户设置被静默覆盖）。
*/
async function readSettings() {
	return mergeSettings(await readMeta("settings"));
}
/**
* 局部写入设置并返回合并后的完整设置。
* @param patch 只覆盖给出的字段。
* @returns 写入后的完整设置。
* @throws 读写失败时抛中文原因。
*/
async function writeSettings(patch) {
	const next = mergeSettings({
		...await readSettings(),
		...patch
	});
	await writeMeta("settings", next);
	return next;
}
/**
* 标记数据库 schema 版本（首次建库时写入）。
* @throws 写入失败时抛中文原因。
*/
async function ensureSchemaVersion() {
	if (await readMeta("schemaVersion") === DB_VERSION) return;
	await writeMeta("schemaVersion", DB_VERSION);
}
//#endregion
//#region src/client/data/filters.ts
/**
* 筛选、排序、高亮与自动标签（计划 §4/§10）。
* 扩展名分类表按计划 §10 的清单写全（图片/视频/音频/文档/压缩包）。
*/
/** 扩展名 → 素材类型。 */
const EXT_KIND = {
	png: "image",
	jpg: "image",
	jpeg: "image",
	webp: "image",
	gif: "image",
	svg: "image",
	bmp: "image",
	avif: "image",
	heic: "image",
	ico: "image",
	mp4: "video",
	webm: "video",
	mov: "video",
	m4v: "video",
	avi: "video",
	mkv: "video",
	mp3: "audio",
	wav: "audio",
	m4a: "audio",
	aac: "audio",
	flac: "audio",
	ogg: "audio",
	pdf: "document",
	doc: "document",
	docx: "document",
	xls: "document",
	xlsx: "document",
	ppt: "document",
	pptx: "document",
	md: "document",
	txt: "document",
	csv: "document",
	json: "document",
	rtf: "document",
	zip: "archive",
	tar: "archive",
	gz: "archive",
	tgz: "archive",
	bz2: "archive",
	xz: "archive",
	"7z": "archive",
	rar: "archive"
};
/** 扩展名 → MIME（不依赖 mime-types 包，客户端只有这张表）。 */
const EXT_MEDIA_TYPE = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	webp: "image/webp",
	gif: "image/gif",
	svg: "image/svg+xml",
	bmp: "image/bmp",
	avif: "image/avif",
	heic: "image/heic",
	ico: "image/x-icon",
	mp4: "video/mp4",
	webm: "video/webm",
	mov: "video/quicktime",
	m4v: "video/x-m4v",
	avi: "video/x-msvideo",
	mkv: "video/x-matroska",
	mp3: "audio/mpeg",
	wav: "audio/wav",
	m4a: "audio/mp4",
	aac: "audio/aac",
	flac: "audio/flac",
	ogg: "audio/ogg",
	pdf: "application/pdf",
	doc: "application/msword",
	docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	xls: "application/vnd.ms-excel",
	xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	ppt: "application/vnd.ms-powerpoint",
	pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
	md: "text/markdown",
	txt: "text/plain",
	csv: "text/csv",
	json: "application/json",
	rtf: "application/rtf",
	zip: "application/zip",
	tar: "application/x-tar",
	gz: "application/gzip",
	tgz: "application/gzip",
	bz2: "application/x-bzip2",
	xz: "application/x-xz",
	"7z": "application/x-7z-compressed",
	rar: "application/vnd.rar"
};
/** 取小写、无点的扩展名（无扩展名返回空串）。 */
function extOf(name) {
	const dot = name.lastIndexOf(".");
	if (dot <= 0 || dot === name.length - 1) return "";
	return name.slice(dot + 1).toLowerCase();
}
/**
* 按扩展名判定素材类型。
* @param name 文件名（大小写不敏感）。
* @returns 无扩展名或未收录的扩展名一律 `other`。
*/
function kindForName(name) {
	return EXT_KIND[extOf(name)] ?? "other";
}
/**
* 按扩展名给出 MIME。
* @param name 文件名。
* @param fallback 未收录时的兜底（默认 `application/octet-stream`）。
* @returns MIME 字符串。
*/
function mediaTypeFor(name, fallback = "application/octet-stream") {
	return EXT_MEDIA_TYPE[extOf(name)] ?? fallback;
}
/** 文本命中判定：名称、标签、扩展名（大小写不敏感）。 */
function matchesText(asset, needle) {
	if (!needle) return true;
	const q = needle.toLowerCase();
	if (asset.name.toLowerCase().includes(q)) return true;
	if ((asset.ext || "").toLowerCase().includes(q)) return true;
	return asset.tags.some((tag) => tag.toLowerCase().includes(q));
}
/** 时间范围归一化：`from`/`to` 均为闭区间毫秒时间戳。 */
function inTimeRange(asset, from, to) {
	if (from !== null && asset.importedAt < from) return false;
	if (to !== null && asset.importedAt > to) return false;
	return true;
}
/**
* 单条素材是否满足查询（文本 × 类型 × 时间 × 标签 × 收藏 × 评分）。
* @param a 素材记录。
* @param q 查询条件。
* @returns 命中为 true。
*/
function matchAsset(a, q) {
	if (!matchesText(a, q.text.trim())) return false;
	if (q.kinds.length > 0 && !q.kinds.includes(a.kind)) return false;
	if (q.tags.length > 0 && !q.tags.some((tag) => a.tags.includes(tag))) return false;
	if (q.favoriteOnly && !a.favorite) return false;
	if (a.rating < q.minRating) return false;
	return inTimeRange(a, q.from, q.to);
}
/** 名称排序用：带数字的自然序（`图2` 排在 `图10` 前）。 */
const collator = new Intl.Collator("zh-Hans-CN", {
	numeric: true,
	sensitivity: "base"
});
/** 比较两条素材，返回升序结果。 */
function compare(a, b, sort) {
	switch (sort) {
		case "name": return collator.compare(a.name, b.name);
		case "size": return a.size - b.size;
		case "rating": return a.rating - b.rating;
		default: return a.importedAt - b.importedAt;
	}
}
/**
* 过滤 + 排序；返回新数组，不改动入参。
* @param list 素材列表。
* @param q 查询条件；`desc` 为 true 时反转排序。
* @returns 排序后的命中列表。
*/
function applyQuery(list, q) {
	const hits = list.filter((a) => matchAsset(a, q));
	hits.sort((a, b) => q.desc ? -compare(a, b, q.sort) : compare(a, b, q.sort));
	return hits;
}
/**
* 找出 `query` 在 `text` 中的所有命中区间（大小写不敏感、中文按 code unit 计数）。
* 区间为 `[start, end)`，按起点升序，互不重叠；重叠命中会合并为较大区间。
* @param text 待高亮文本（通常是文件名或标签）。
* @param query 搜索词；空串返回空数组。
* @returns 命中区间数组。
*/
function highlightRanges(text, query) {
	const needle = query.trim();
	if (!needle || !text) return [];
	const haystack = text.toLowerCase();
	const lowerNeedle = needle.toLowerCase();
	const ranges = [];
	let from = 0;
	let cursor = 0;
	for (;;) {
		const found = haystack.indexOf(lowerNeedle, from);
		if (found < 0) break;
		const end = found + lowerNeedle.length;
		if (found >= cursor) {
			ranges.push([found, end]);
			cursor = end;
		}
		from = found + 1;
	}
	return ranges;
}
//#endregion
//#region src/client/data/hash.ts
/**
* 内容指纹与完整哈希（计划 §4）。
* 只用 `crypto.subtle`（桌面渲染进程 origin `dsh-app://app` 为 secure context）。
*/
/** 廉价指纹取首尾各 1MB。 */
const CHEAP_EDGE_BYTES = 1048576;
/** 完整哈希的分块读取粒度，兼顾内存与进度回调密度。 */
const HASH_CHUNK_BYTES = 4194304;
/** 取 subtle 实现；缺失时给出可读原因而非静默降级。 */
function subtle() {
	const c = globalThis.crypto;
	if (!c?.subtle) throw new Error("当前环境不支持 crypto.subtle，无法计算素材哈希");
	return c.subtle;
}
/** 字节数组转小写十六进制。 */
function toHex(buffer) {
	const bytes = new Uint8Array(buffer);
	let out = "";
	for (const b of bytes) out += b.toString(16).padStart(2, "0");
	return out;
}
/**
* 廉价指纹：`size` 与「首 1MB + 尾 1MB」的 SHA-256。
* 用于导入时的快速预判；小文件（≤2MB）等价于完整哈希。
* @param file 待取指纹的 Blob/File。
* @returns `size + '-' + hex`。
* @throws 读取失败或环境缺 crypto.subtle 时抛中文原因。
*/
async function cheapFingerprint(file) {
	const size = file.size;
	const edge = Math.min(CHEAP_EDGE_BYTES, size);
	const head = file.slice(0, edge);
	const tail = size > edge ? file.slice(size - edge, size) : file.slice(0, 0);
	try {
		const parts = await Promise.all([head.arrayBuffer(), tail.arrayBuffer()]);
		const total = parts[0].byteLength + parts[1].byteLength;
		const merged = new Uint8Array(total);
		merged.set(new Uint8Array(parts[0]), 0);
		merged.set(new Uint8Array(parts[1]), parts[0].byteLength);
		return `${size}-${toHex(await subtle().digest("SHA-256", merged))}`;
	} catch (e) {
		throw new Error(`计算廉价指纹失败（${file.size} 字节）：${e instanceof Error ? e.message : String(e)}`, { cause: e });
	}
}
/**
* 完整内容 SHA-256（hex），分块顺序读取。
* @param file 待哈希的 Blob/File。
* @param onProgress 每读完一块回调一次已完成比例（0..1），最后必调一次 1。
* @returns 小写 hex 摘要。
* @throws 读取失败或环境缺 crypto.subtle 时抛中文原因。
*/
async function sha256Hex(file, onProgress) {
	const size = file.size;
	if (size === 0) {
		const digest = await subtle().digest("SHA-256", /* @__PURE__ */ new Uint8Array(0));
		onProgress?.(1);
		return toHex(digest);
	}
	try {
		const chunks = [];
		let offset = 0;
		while (offset < size) {
			const end = Math.min(offset + HASH_CHUNK_BYTES, size);
			chunks.push(new Uint8Array(await file.slice(offset, end).arrayBuffer()));
			offset = end;
			onProgress?.(offset / size);
		}
		const merged = new Uint8Array(size);
		let cursor = 0;
		for (const chunk of chunks) {
			merged.set(chunk, cursor);
			cursor += chunk.byteLength;
		}
		const digest = await subtle().digest("SHA-256", merged);
		onProgress?.(1);
		return toHex(digest);
	} catch (e) {
		throw new Error(`计算完整哈希失败（${size} 字节）：${e instanceof Error ? e.message : String(e)}`, { cause: e });
	}
}
/**
* 同时取得廉价指纹与完整哈希（导入去重的两个凭据）。
* @param file 待识别的文件。
* @returns `{ cheap, hash }`；两者并发计算。
* @throws 任一计算失败时抛中文原因（整文件失败，不静默降级）。
*/
async function identify(file) {
	const [cheap, hash] = await Promise.all([cheapFingerprint(file), sha256Hex(file)]);
	return {
		cheap,
		hash
	};
}
//#endregion
//#region src/client/data/thumb.ts
/**
* 缩略图生成（计划 §4/§5）。
* 所有 ObjectURL 均在 finally 中 revoke；`fallbackCover` 永不抛错。
*/
/** 视频封面各类型的主题色（与 DSH 主题无关的固定色，用于占位卡）。 */
const KIND_COLORS = {
	image: "#3b82f6",
	video: "#8b5cf6",
	audio: "#ec4899",
	document: "#f59e0b",
	archive: "#14b8a6",
	other: "#64748b"
};
/** 各类型封面卡正面的类型字样。 */
const KIND_GLYPH$1 = {
	image: "图片",
	video: "视频",
	audio: "音频",
	document: "文档",
	archive: "压缩包",
	other: "文件"
};
/** 取不到宽高时的兜底边长。 */
const FALLBACK_EDGE = 512;
/** 媒体类错误：`event.type` = error/loadedmetadata/seeked 等，`detail` 为 MediaError 摘要。 */
var MediaThumbError = class extends Error {
	/** 触发失败的事件类型。 */
	eventType;
	/** 触发失败的补充信息（如 MediaError 描述）。 */
	detail;
	/**
	* @param message 中文原因。
	* @param eventType 事件类型。
	* @param detail 补充信息。
	*/
	constructor(message, eventType, detail = "") {
		super(message);
		this.name = "MediaThumbError";
		this.eventType = eventType;
		this.detail = detail;
	}
};
/** 超时错误，携带阶段名以便进度里标注原因。 */
var ThumbTimeoutError = class extends Error {
	/** 超时阶段。 */
	stage;
	/**
	* @param stage 超时阶段。
	* @param timeoutMs 配置的超时毫秒数。
	*/
	constructor(stage, timeoutMs) {
		super(`生成缩略图超时（阶段：${stage}，上限 ${timeoutMs}ms）`);
		this.name = "ThumbTimeoutError";
		this.stage = stage;
	}
};
/** 图片解码错误。 */
var ImageDecodeError = class extends Error {
	/**
	* @param message 中文原因。
	*/
	constructor(message) {
		super(message);
		this.name = "ImageDecodeError";
	}
};
/** 让出一次宏任务，避免长任务阻塞主线程 > 50ms（计划 §9）。 */
function yieldToMain() {
	return new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
}
/** 创建一个画布上下文：优先 OffscreenCanvas，回退 DOM canvas。 */
function createContext(width, height) {
	const w = Math.max(1, Math.round(width));
	const h = Math.max(1, Math.round(height));
	if (typeof OffscreenCanvas !== "undefined") {
		const ctx = new OffscreenCanvas(w, h).getContext("2d");
		if (ctx) return ctx;
	}
	if (typeof document !== "undefined") {
		const canvas = document.createElement("canvas");
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext("2d");
		if (ctx) return ctx;
	}
	throw new Error("当前环境没有可用的 2D 画布，无法生成缩略图");
}
/** 把画布导出为 WebP Blob。 */
async function toWebpBlob(ctx, quality) {
	const canvas = ctx.canvas;
	if (typeof canvas.convertToBlob === "function") {
		const blob = await canvas.convertToBlob({
			type: "image/webp",
			quality
		});
		if (blob.size > 0) return blob;
	}
	const html = canvas;
	if (typeof html.toBlob === "function") {
		const blob = await new Promise((resolve) => {
			html.toBlob(resolve, "image/webp", quality);
		});
		if (blob && blob.size > 0) return blob;
	}
	throw new Error("画布未能导出 WebP（convertToBlob/toBlob 均不可用或返回空）");
}
/** rgba 分量转 `#rrggbb`（四舍五入，不用位运算以免截断）。 */
function rgbToHex(r, g, b) {
	const part = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
	return `#${part(r)}${part(g)}${part(b)}`;
}
/** 读取指定像素的 rgba；越界或读取失败返回 null。 */
function readPixel(ctx, x, y) {
	const data = ctx.getImageData(x, y, 1, 1).data;
	const r = data[0];
	const g = data[1];
	const b = data[2];
	const a = data[3];
	if (r === void 0 || g === void 0 || b === void 0 || a === void 0) return null;
	return [
		r,
		g,
		b,
		a
	];
}
/** 主色量化调色板（红/橙/黄/绿/青/蓝/紫/粉/白/灰/黑）。 */
const PALETTE = [
	[
		244,
		67,
		54
	],
	[
		255,
		152,
		0
	],
	[
		255,
		235,
		59
	],
	[
		76,
		175,
		80
	],
	[
		0,
		188,
		212
	],
	[
		33,
		150,
		243
	],
	[
		156,
		39,
		176
	],
	[
		233,
		30,
		99
	],
	[
		255,
		255,
		255
	],
	[
		158,
		158,
		158
	],
	[
		33,
		33,
		33
	]
];
/** 主色量化的采样网格边长。 */
const QUANT_GRID = 8;
/**
* 主色：优先 1x1 缩放的均值；透明或失败时量化到最近调色板色。
* 该函数保证返回 `#rrggbb`。
*/
function dominatedColor(ctx, w, h) {
	try {
		const sample = createContext(1, 1);
		sample.drawImage(ctx.canvas, 0, 0, Math.max(1, w), Math.max(1, h), 0, 0, 1, 1);
		const px = readPixel(sample, 0, 0);
		if (px && px[3] >= 8) return rgbToHex(px[0], px[1], px[2]);
	} catch {}
	try {
		const grid = QUANT_GRID;
		const sample = createContext(grid, grid);
		sample.drawImage(ctx.canvas, 0, 0, Math.max(1, w), Math.max(1, h), 0, 0, grid, grid);
		let best = PALETTE[0];
		let bestDistance = Number.POSITIVE_INFINITY;
		for (let y = 0; y < grid; y += 1) for (let x = 0; x < grid; x += 1) {
			const px = readPixel(sample, x, y);
			if (!px || px[3] < 8) continue;
			for (const color of PALETTE) {
				const dr = px[0] - color[0];
				const dg = px[1] - color[1];
				const db = px[2] - color[2];
				const distance = dr * dr + dg * dg + db * db;
				if (distance < bestDistance) {
					bestDistance = distance;
					best = color;
				}
			}
		}
		return rgbToHex(best[0], best[1], best[2]);
	} catch {
		return "#888888";
	}
}
/** 按长边 maxEdge 等比缩放，至少 1px。 */
function fitWithin(width, height, maxEdge) {
	const safeEdge = Number.isFinite(maxEdge) && maxEdge > 0 ? maxEdge : FALLBACK_EDGE;
	const longest = Math.max(width, height);
	const ratio = longest > safeEdge ? safeEdge / longest : 1;
	return {
		width: Math.max(1, Math.round(width * ratio)),
		height: Math.max(1, Math.round(height * ratio))
	};
}
/** 把源（ImageBitmap/视频）按长边上限画进 WebP Blob。 */
async function drawToThumb(source, sourceWidth, sourceHeight, maxEdge, quality) {
	const w = Math.max(1, Math.round(sourceWidth));
	const h = Math.max(1, Math.round(sourceHeight));
	const ctx = createContext(w, h);
	ctx.drawImage(source, 0, 0, w, h);
	const dominantColor = dominatedColor(ctx, w, h);
	const fitted = fitWithin(w, h, maxEdge);
	const outCtx = createContext(fitted.width, fitted.height);
	outCtx.drawImage(ctx.canvas, 0, 0, w, h, 0, 0, fitted.width, fitted.height);
	return {
		blob: await toWebpBlob(outCtx, quality),
		width: w,
		height: h,
		dominantColor
	};
}
/**
* 图片缩略图：`createImageBitmap` → 画布 → `image/webp`。
* @param file 图片 Blob/File。
* @param maxEdge 长边上限（px）。
* @param quality WebP 质量（0..1）。
* @returns 缩略图、原始宽高与主色。
* @throws 解码失败或画布不可用时抛 {@link ImageDecodeError}（中文原因）。
*/
async function imageThumb(file, maxEdge, quality) {
	let bitmap;
	try {
		bitmap = await createImageBitmap(file);
	} catch (e) {
		throw new ImageDecodeError(`图片解码失败（${file.type || "未知类型"}，${file.size} 字节）：${e instanceof Error ? e.message : String(e)}`);
	}
	try {
		const width = bitmap.width;
		const height = bitmap.height;
		if (width <= 0 || height <= 0) throw new ImageDecodeError(`图片解码结果尺寸非法（${width}x${height}）`);
		return await drawToThumb(bitmap, width, height, maxEdge, quality);
	} finally {
		bitmap.close();
	}
}
/**
* 等到 DOM 事件触发；同时监听 `error`，让加载失败立刻以可读原因失败而不是干等超时。
* @param target 事件目标（video 元素）。
* @param type 期望事件名。
* @param timeoutMs 超时上限。
* @param stage 阶段名，用于错误与超时文案。
*/
function waitForEvent(target, type, timeoutMs, stage) {
	return new Promise((resolve, reject) => {
		let timer;
		const cleanup = () => {
			target.removeEventListener(type, onEvent);
			target.removeEventListener("error", onError);
			if (timer !== void 0) clearTimeout(timer);
		};
		const onEvent = (event) => {
			cleanup();
			resolve(event);
		};
		const onError = (event) => {
			cleanup();
			const mediaError = event.target?.error;
			reject(new MediaThumbError(`视频加载失败（阶段：${stage}）`, "error", mediaError ? `MediaError code=${mediaError.code}` : ""));
		};
		target.addEventListener(type, onEvent);
		target.addEventListener("error", onError);
		timer = setTimeout(() => {
			cleanup();
			reject(new ThumbTimeoutError(stage, timeoutMs));
		}, timeoutMs);
	});
}
/**
* 视频首帧缩略图：`URL.createObjectURL` + muted/playsInline 的 `<video>`，
* 等 `loadedmetadata` → `currentTime = min(seekRatio * duration, 1s)` → 等 `seeked` → 抓帧。
* @param file 视频 Blob/File。
* @param opts 长边上限、WebP 质量、定位比例与超时上限。
* @returns 缩略图、视频像素宽高、时长（秒）与主色。
* @throws 元数据/定位超时或加载失败时抛出（含超时阶段）；调用方据此回退封面卡。
*/
async function videoThumb(file, opts) {
	if (typeof document === "undefined") throw new MediaThumbError("当前环境没有 document，无法创建 video 元素", "create");
	const url = URL.createObjectURL(file);
	const video = document.createElement("video");
	video.muted = true;
	video.playsInline = true;
	video.preload = "metadata";
	video.src = url;
	try {
		await waitForEvent(video, "loadedmetadata", opts.timeoutMs, "loadedmetadata");
		await yieldToMain();
		const duration = Number.isFinite(video.duration) ? video.duration : 0;
		const ratio = Number.isFinite(opts.seekRatio) ? opts.seekRatio : 0;
		video.currentTime = Math.max(0, Math.min(ratio * duration, 1));
		await waitForEvent(video, "seeked", opts.timeoutMs, "seeked");
		const width = video.videoWidth;
		const height = video.videoHeight;
		if (width <= 0 || height <= 0) throw new MediaThumbError(`视频尺寸不可用（${width}x${height}）`, "seeked");
		return {
			...await drawToThumb(video, width, height, opts.maxEdge, opts.quality),
			durationMs: Math.round(duration * 1e3)
		};
	} finally {
		video.removeAttribute("src");
		try {
			video.load();
		} catch {}
		URL.revokeObjectURL(url);
	}
}
/**
* 类型封面卡（图片/视频失败时的兜底，文档/音频/压缩包的默认封面）。
* 用 canvas 绘制类型色背景 + 扩展名大字；**永不抛错**，画布不可用时返回内联 SVG Blob。
* @param kind 素材类型。
* @param name 文件名（用于取扩展名大字）。
* @returns 缩略图结果；`width`/`height` 为 512×512 的正方形占位。
* @throws 不抛错。
*/
async function fallbackCover(kind, name) {
	const color = KIND_COLORS[kind] ?? KIND_COLORS.other;
	const label = extractExtLabel(name);
	try {
		const ctx = createContext(FALLBACK_EDGE, FALLBACK_EDGE);
		ctx.fillStyle = color;
		ctx.fillRect(0, 0, FALLBACK_EDGE, FALLBACK_EDGE);
		try {
			ctx.fillStyle = "rgba(255,255,255,0.16)";
			ctx.fillRect(0, 392, FALLBACK_EDGE, 120);
			ctx.fillStyle = "#ffffff";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.font = "bold 96px system-ui, -apple-system, \"PingFang SC\", sans-serif";
			ctx.fillText(label, FALLBACK_EDGE / 2, FALLBACK_EDGE / 2 - 40);
			ctx.font = "40px system-ui, -apple-system, \"PingFang SC\", sans-serif";
			ctx.fillText(KIND_GLYPH$1[kind] ?? KIND_GLYPH$1.other, FALLBACK_EDGE / 2, 452);
		} catch {}
		let dominantColor = color;
		try {
			const px = readPixel(ctx, 0, 0);
			if (px && px[3] > 0) dominantColor = rgbToHex(px[0], px[1], px[2]);
		} catch {}
		return {
			blob: await toWebpBlob(ctx, .9),
			width: FALLBACK_EDGE,
			height: FALLBACK_EDGE,
			dominantColor
		};
	} catch {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${FALLBACK_EDGE}" height="${FALLBACK_EDGE}" viewBox="0 0 ${FALLBACK_EDGE} ${FALLBACK_EDGE}"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" fill="#ffffff" font-family="sans-serif" font-size="96" font-weight="bold" text-anchor="middle" dominant-baseline="middle">${escapeXml(label)}</text></svg>`;
		return {
			blob: new Blob([svg], { type: "image/svg+xml" }),
			width: FALLBACK_EDGE,
			height: FALLBACK_EDGE,
			dominantColor: color
		};
	}
}
/** 取扩展名大字（无扩展名时用类型首字）。 */
function extractExtLabel(name) {
	const dot = name.lastIndexOf(".");
	return ((dot > 0 ? name.slice(dot + 1).trim() : "") || "?").slice(0, 4).toUpperCase();
}
/** 转义 SVG 文本节点中的特殊字符。 */
function escapeXml(text) {
	return text.replace(/[&<>"']/g, (ch) => {
		switch (ch) {
			case "&": return "&amp;";
			case "<": return "&lt;";
			case ">": return "&gt;";
			case "\"": return "&quot;";
			default: return "&apos;";
		}
	});
}
/**
* 按类型分派缩略图生成，并按计划 §13.5 在图片/视频失败时回退封面卡。
* @param file 源文件。
* @param kind 已判定的类型。
* @param s 设置（长边/质量/定位比例/超时）。
* @returns 一定成功返回一个缩略图结果（失败路径走封面卡，不抛错）。
*/
async function thumbnailFor(file, kind, s) {
	if (kind === "image") try {
		return await imageThumb(file, s.thumbMaxEdge, s.thumbQuality);
	} catch {
		return fallbackCover(kind, file.name);
	}
	if (kind === "video") try {
		return await videoThumb(file, {
			maxEdge: s.thumbMaxEdge,
			quality: s.thumbQuality,
			seekRatio: s.videoSeekRatio,
			timeoutMs: s.videoTimeoutMs
		});
	} catch {
		return fallbackCover(kind, file.name);
	}
	return fallbackCover(kind, file.name);
}
//#endregion
//#region src/client/data/store.ts
/** 默认查询：无筛选、按导入时间倒序。 */
const DEFAULT_QUERY = {
	text: "",
	kinds: [],
	tags: [],
	favoriteOnly: false,
	minRating: 0,
	from: null,
	to: null,
	sort: "importedAt",
	desc: true
};
/** 哈希与缩略图的并发上限（计划 §9）。 */
const IMPORT_CONCURRENCY = 2;
/** HEAD 探测的超时上限。 */
const RECHECK_TIMEOUT_MS = 5e3;
/** 移出素材库后的撤销窗口（Q9/Q15/Q20）。 */
const UNDO_WINDOW_MS = 8e3;
/** 自定义壁纸的单张上限（Q16）。 */
const WALLPAPER_MAX_BYTES$1 = 20971520;
/** 校验从库里读回的结构（旧版本或损坏数据一律视为没有待删除批次，不抛错卡住初始化）。 */
function isPendingDelete(value) {
	if (value === null || typeof value !== "object") return false;
	const candidate = value;
	return Array.isArray(candidate.ids) && candidate.ids.every((id) => typeof id === "string") && Array.isArray(candidate.records) && typeof candidate.expiresAt === "number" && Number.isFinite(candidate.expiresAt);
}
/** 把字节数折成 MB 文案（错误提示用；数据层不依赖 UI 的格式化模块）。 */
function megabytes(bytes) {
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
let pathResolver;
/**
* 注入宿主路径解析器。
* @param resolver 返回文件绝对路径；返回 undefined 表示取不到。
*/
function setPathResolver(resolver) {
	pathResolver = resolver;
}
/** 记录「取不到真实路径」的差文件，导入时给出可见告警而不是静默使用文件名。 */
const unresolvedPaths = /* @__PURE__ */ new WeakSet();
/** 把异常折成可读中文。 */
function describe(e) {
	if (e instanceof AggregateError) return e.message;
	if (e instanceof Error) return e.message;
	return String(e);
}
/** 生成素材 id；优先 crypto.randomUUID，缺失时用随机回退。 */
function newId() {
	const c = globalThis.crypto;
	if (c?.randomUUID) return c.randomUUID();
	return `${Date.now().toString(16)}-${Math.floor(Math.random() * 4294967295).toString(16)}`;
}
/** 冻结快照的各层容器，避免 UI 侧意外改动。 */
function freezeState(s) {
	Object.freeze(s.assets);
	Object.freeze(s.filtered);
	Object.freeze(s.query.kinds);
	Object.freeze(s.query.tags);
	Object.freeze(s.query);
	Object.freeze(s.settings);
	Object.freeze(s.imports);
	Object.freeze(s.selected);
	if (s.pendingUndo) {
		Object.freeze(s.pendingUndo.ids);
		Object.freeze(s.pendingUndo);
	}
	return Object.freeze(s);
}
/** 并发上限固定的任务池；支持等待整批结束。 */
var TaskPool = class {
	limit;
	queue = [];
	active = 0;
	total = 0;
	settled = 0;
	waiters = [];
	/**
	* @param limit 同时运行的任务数上限。
	*/
	constructor(limit) {
		this.limit = Math.max(1, limit);
	}
	/**
	* 入队一个任务。
	* @param task 任务体；reject 由 `onError` 交付，不产生未处理拒绝。
	* @param onError 失败回调。
	*/
	add(task, onError) {
		this.total += 1;
		this.queue.push(async () => {
			try {
				await task();
			} catch (e) {
				onError(e);
			}
		});
		this.pump();
	}
	/** 等待当前已入队的全部任务结束（在途 `add` 不计入）。 */
	wait() {
		if (this.settled >= this.total) return Promise.resolve();
		return new Promise((resolve) => {
			this.waiters.push(resolve);
		});
	}
	settle() {
		this.settled += 1;
		if (this.settled >= this.total) {
			const waiters = this.waiters;
			this.waiters = [];
			for (const resolve of waiters) resolve();
		}
	}
	pump() {
		while (this.active < this.limit) {
			const next = this.queue.shift();
			if (!next) return;
			this.active += 1;
			next().finally(() => {
				this.active -= 1;
				this.settle();
				this.pump();
			});
		}
	}
};
/**
* 创建独立的 store 实例。
* @param options.autoInit 是否在创建时立即 `init()`（默认 true，UI 直接可用；测试可关掉）。
*/
function createStore(options = {}) {
	let state = {
		loading: true,
		error: null,
		assets: [],
		filtered: [],
		query: {
			...DEFAULT_QUERY,
			kinds: [],
			tags: []
		},
		settings: { ...DEFAULT_SETTINGS },
		imports: [],
		importRunning: false,
		selected: [],
		pendingUndo: null,
		wallpaper: void 0
	};
	const listeners = /* @__PURE__ */ new Set();
	let initPromise;
	/** 撤销窗口到期定时器（每个实例一个）。 */
	let undoTimer;
	/** 取消当前的撤销到期定时器。 */
	const clearUndoTimer = () => {
		if (undoTimer === void 0) return;
		clearTimeout(undoTimer);
		undoTimer = void 0;
	};
	/**
	* 同步通知订阅者（React `useSyncExternalStore` 允许在写入后同步调用）。
	* 必须同步：否则共享同一个 `state` 变量的订阅者会跳过中间快照
	* （例如 importFiles 的 `queued` 态会在首次 await 前就被 hashing 覆盖）。
	*/
	const notify = () => {
		for (const listener of [...listeners]) listener();
	};
	const setState = (patch) => {
		const next = {
			...state,
			...patch
		};
		if (next.assets !== state.assets || next.query !== state.query) next.filtered = applyQuery(next.assets, next.query);
		state = freezeState(next);
		notify();
	};
	/** 追加导入进度事件。 */
	const pushEvent = (event) => {
		setState({ imports: [...state.imports, event] });
	};
	/** 更新单条素材（整表替换为新数组）。 */
	const replaceAsset = (id, patch) => {
		setState({ assets: state.assets.map((a) => a.id === id ? {
			...a,
			...patch
		} : a) });
	};
	/** HEAD 探测宿主 Range 路由：200/206 → ok，404/403 → missing。 */
	const probe = async (path) => {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), RECHECK_TIMEOUT_MS);
		try {
			const res = await fetch(fileUrl(path), {
				method: "HEAD",
				signal: controller.signal
			});
			if (res.status === 200 || res.status === 206) return "ok";
			if (res.status === 404 || res.status === 403) return "missing";
			return "ok";
		} catch {
			return "missing";
		} finally {
			clearTimeout(timer);
		}
	};
	/** 读取待删除批次；结构不符（旧版本/损坏）一律当作没有，不让初始化卡住。 */
	const readPending = async () => {
		const raw = await readPendingDelete();
		return isPendingDelete(raw) ? raw : void 0;
	};
	/**
	* 立即真删待删除批次并清空 pending。
	* @returns 错误文案；`null` 表示成功或本来就没有待删除批次。
	*/
	const purgeNow = async () => {
		const pending = await readPending();
		clearUndoTimer();
		if (pending === void 0) {
			setState({ pendingUndo: null });
			return null;
		}
		try {
			await deleteAssets(pending.ids);
			await clearPendingDelete();
			setState({ pendingUndo: null });
			return null;
		} catch (e) {
			const message = `移出素材库失败（待删除记录已保留，将自动重试）：${describe(e)}`;
			setState({ error: message });
			return message;
		}
	};
	/** 安排撤销窗口到期时的真删。 */
	const scheduleUndoPurge = (delayMs) => {
		clearUndoTimer();
		undoTimer = setTimeout(() => {
			undoTimer = void 0;
			purgeNow();
		}, Math.max(0, delayMs));
	};
	const store = {
		getSnapshot: () => state,
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		async init() {
			if (initPromise) return initPromise;
			initPromise = (async () => {
				/** 不阻断加载的失败（壁纸读取、到期清理）；最后一次性挂到 `state.error` 上。 */
				const failures = [];
				try {
					await openDb();
					await ensureSchemaVersion();
					const settings = await readSettings();
					setState({ settings });
					try {
						setState({ wallpaper: await getWallpaper() });
					} catch (e) {
						failures.push(`读取壁纸失败：${describe(e)}`);
					}
					const pending = await readPending();
					if (pending !== void 0 && pending.expiresAt > Date.now()) {
						const assets = await getAllAssets();
						const hidden = new Set(pending.ids);
						setState({
							assets: assets.filter((a) => !hidden.has(a.id)),
							loading: false,
							pendingUndo: {
								ids: pending.ids,
								expiresAt: pending.expiresAt
							},
							error: failures.length > 0 ? failures.join("；") : null
						});
						scheduleUndoPurge(pending.expiresAt - Date.now());
						return;
					}
					if (pending !== void 0) {
						const failed = await purgeNow();
						if (failed !== null) failures.push(failed);
					}
					const assets = await getAllAssets();
					setState({
						assets,
						loading: false,
						error: failures.length > 0 ? failures.join("；") : null
					});
				} catch (e) {
					setState({
						loading: false,
						error: `素材库初始化失败：${describe(e)}`
					});
				}
			})();
			return initPromise;
		},
		setQuery(patch) {
			setState({ query: {
				...state.query,
				...patch
			} });
		},
		async importFiles(files, onDuplicate) {
			if (files.length === 0) return;
			/** 每个文件的稳定事件键（同批内唯一，且不受路径解析成功与否影响）。 */
			const keyOf = (file) => `${file.name}#${file.size}#${file.lastModified}`;
			/** 事件键 → 展示信息；状态机推进时用最新值覆盖同名事件。 */
			const ctxByKey = /* @__PURE__ */ new Map();
			setState({
				importRunning: true,
				imports: files.map((f) => {
					const key = keyOf(f);
					ctxByKey.set(key, {
						name: f.name,
						path: f.name
					});
					return {
						path: f.name,
						name: f.name,
						phase: "queued"
					};
				})
			});
			const advance = (key, phase, error) => {
				const ctx = ctxByKey.get(key);
				const next = {
					path: ctx?.path ?? key,
					name: ctx?.name ?? key,
					phase
				};
				if (error !== void 0) next.error = error;
				const idx = state.imports.findIndex((e) => e.path === next.path && e.name === next.name);
				const imports = idx >= 0 ? state.imports.map((e, i) => i === idx ? next : e) : [...state.imports, next];
				ctxByKey.set(key, {
					name: ctx?.name ?? next.name,
					path: next.path
				});
				setState({ imports });
			};
			const pool = new TaskPool(IMPORT_CONCURRENCY);
			/** 单个文件的完整状态机；任何失败都只影响该文件。 */
			const importOne = async (file) => {
				const key = keyOf(file);
				const name = file.name;
				const kind = kindForName(name);
				const ext = extOf(name);
				try {
					let path = name;
					if (pathResolver) {
						const resolved = pathResolver(file);
						if (resolved) path = resolved;
						else unresolvedPaths.add(file);
					}
					if (unresolvedPaths.has(file)) pushEvent({
						path,
						name,
						phase: "queued",
						error: "取不到磁盘真实路径，暂以文件名代替；引用到对话前必须重新定位"
					});
					ctxByKey.set(key, {
						name,
						path
					});
					advance(key, "hashing");
					const { cheap, hash } = await identify(file);
					const duplicates = await findByHash(hash);
					if (duplicates.length > 0) {
						advance(key, "duplicate");
						const existing = duplicates[0];
						const choice = await onDuplicate(existing, file);
						if (choice === "skip") {
							advance(key, "done");
							return;
						}
						if (choice === "replace") {
							await deleteAssets([existing.id]);
							setState({ assets: state.assets.filter((a) => a.id !== existing.id) });
						}
					}
					advance(key, "thumb");
					let thumb;
					try {
						thumb = await thumbnailFor(file, kind, state.settings);
					} catch (e) {
						const reason = describe(e);
						thumb = await fallbackCover(kind, name);
						pushEvent({
							path,
							name,
							phase: "thumb",
							error: `缩略图生成失败，已用封面卡替代：${reason}`
						});
					}
					const record = {
						id: newId(),
						path,
						name,
						ext,
						kind,
						mediaType: file.type || mediaTypeFor(name),
						size: file.size,
						hash,
						cheap,
						thumb: thumb.blob,
						thumbWidth: thumb.width,
						thumbHeight: thumb.height,
						dominantColor: thumb.dominantColor,
						tags: [],
						favorite: false,
						rating: 0,
						status: "ok",
						importedAt: Date.now(),
						lastCheckedAt: Date.now()
					};
					if (thumb.durationMs !== void 0) record.durationMs = thumb.durationMs;
					if (thumb.width > 0) record.width = thumb.width;
					if (thumb.height > 0) record.height = thumb.height;
					advance(key, "writing");
					await putAsset(record);
					setState({ assets: [...state.assets, record] });
					advance(key, "done");
				} catch (e) {
					advance(key, "failed", describe(e));
				}
			};
			for (const file of files) pool.add(() => importOne(file), (e) => {
				pushEvent({
					path: file.name,
					name: file.name,
					phase: "failed",
					error: describe(e)
				});
			});
			await pool.wait();
			setState({ importRunning: false });
		},
		async remove(ids) {
			if (ids.length === 0) return;
			await deleteAssets(ids);
			const gone = new Set(ids);
			setState({
				assets: state.assets.filter((a) => !gone.has(a.id)),
				selected: state.selected.filter((id) => !gone.has(id))
			});
		},
		async patch(id, patch) {
			await patchAsset(id, patch);
			replaceAsset(id, patch);
		},
		toggleFavorite(id) {
			const current = state.assets.find((a) => a.id === id);
			if (!current) return;
			const favorite = !current.favorite;
			replaceAsset(id, { favorite });
			patchAsset(id, { favorite }).catch((e) => {
				setState({ error: `收藏状态保存失败：${describe(e)}` });
			});
		},
		setRating(id, rating) {
			replaceAsset(id, { rating });
			patchAsset(id, { rating }).catch((e) => {
				setState({ error: `评分保存失败：${describe(e)}` });
			});
		},
		async setSettings(patch) {
			const previous = state.settings;
			setState({ settings: {
				...previous,
				...patch
			} });
			try {
				await writeSettings(patch);
			} catch (e) {
				setState({
					settings: previous,
					error: `设置保存失败：${describe(e)}`
				});
			}
		},
		async setWallpaper(file) {
			if (!file.type.startsWith("image/")) {
				const message = `壁纸必须是图片文件（收到 ${file.type || "未知类型"}）`;
				setState({ error: message });
				throw new Error(message);
			}
			if (file.size > WALLPAPER_MAX_BYTES$1) {
				const message = `壁纸图片过大（${megabytes(file.size)}），上限 ${megabytes(WALLPAPER_MAX_BYTES$1)}`;
				setState({ error: message });
				throw new Error(message);
			}
			try {
				await putWallpaper(file, {
					name: file.name,
					type: file.type,
					bytes: file.size
				});
				const settings = await writeSettings({ wallpaperKey: WALLPAPER_KEY });
				setState({
					wallpaper: file,
					settings,
					error: null
				});
			} catch (e) {
				const message = `保存壁纸失败：${describe(e)}`;
				setState({ error: message });
				throw new Error(message, { cause: e });
			}
		},
		async clearWallpaper() {
			try {
				await clearWallpaper();
				const settings = await writeSettings({ wallpaperKey: null });
				setState({
					wallpaper: void 0,
					settings,
					error: null
				});
			} catch (e) {
				const message = `恢复默认壁纸失败：${describe(e)}`;
				setState({ error: message });
				throw new Error(message, { cause: e });
			}
		},
		async removeWithUndo(ids) {
			if (ids.length === 0) return;
			const gone = new Set(ids);
			const records = state.assets.filter((a) => gone.has(a.id));
			if (records.length === 0) return;
			try {
				const existing = await readPending();
				const mergedIds = existing === void 0 ? [...gone] : [.../* @__PURE__ */ new Set([...existing.ids, ...gone])];
				const mergedRecords = existing === void 0 ? records : [...existing.records.filter((record) => !gone.has(record.id)), ...records];
				const expiresAt = Date.now() + UNDO_WINDOW_MS;
				await writePendingDelete({
					ids: mergedIds,
					records: mergedRecords,
					expiresAt
				});
				setState({
					assets: state.assets.filter((a) => !gone.has(a.id)),
					selected: state.selected.filter((id) => !gone.has(id)),
					pendingUndo: {
						ids: mergedIds,
						expiresAt
					},
					error: null
				});
				scheduleUndoPurge(UNDO_WINDOW_MS);
			} catch (e) {
				setState({ error: `移出素材库失败：${describe(e)}` });
			}
		},
		async undoRemove() {
			const pending = await readPending();
			clearUndoTimer();
			if (pending === void 0) {
				setState({ pendingUndo: null });
				return;
			}
			if (pending.expiresAt <= Date.now()) {
				if (await purgeNow() === null) setState({ error: "撤销窗口已过，这些素材已移出素材库（磁盘原文件未动）" });
				return;
			}
			try {
				await clearPendingDelete();
				const present = new Set(state.assets.map((a) => a.id));
				const restored = pending.records.filter((record) => !present.has(record.id));
				setState({
					assets: [...state.assets, ...restored],
					pendingUndo: null,
					error: null
				});
			} catch (e) {
				setState({ error: `撤销失败：${describe(e)}` });
			}
		},
		async purgePendingDelete() {
			await purgeNow();
		},
		async toggleTag(ids, tag) {
			if (!tag) return;
			const touched = [];
			for (const id of ids) {
				const current = state.assets.find((a) => a.id === id);
				if (!current) continue;
				const tags = current.tags.includes(tag) ? current.tags.filter((t) => t !== tag) : [...current.tags, tag];
				touched.push({
					...current,
					tags
				});
			}
			if (touched.length === 0) return;
			for (const record of touched) await patchAsset(record.id, { tags: record.tags });
			const byId = new Map(touched.map((r) => [r.id, r.tags]));
			setState({ assets: state.assets.map((a) => byId.has(a.id) ? {
				...a,
				tags: byId.get(a.id)
			} : a) });
		},
		async relocate(id, nextPath) {
			if (!nextPath) throw new Error("重新定位失败：新路径为空");
			const lastCheckedAt = Date.now();
			await patchAsset(id, {
				path: nextPath,
				status: "ok",
				lastCheckedAt
			});
			replaceAsset(id, {
				path: nextPath,
				status: "ok",
				lastCheckedAt
			});
		},
		async recheck(ids) {
			const targets = ids.length > 0 ? ids : state.assets.map((a) => a.id);
			const snapshot = state.assets;
			const results = await Promise.all(targets.map(async (id) => {
				const asset = snapshot.find((a) => a.id === id);
				if (!asset) return null;
				return {
					id,
					status: await probe(asset.path),
					lastCheckedAt: Date.now()
				};
			}));
			const patchById = new Map(results.filter((r) => r !== null).map((r) => [r.id, r]));
			if (patchById.size === 0) return;
			await Promise.all([...patchById.entries()].map(([id, patch]) => patchAsset(id, {
				status: patch.status,
				lastCheckedAt: patch.lastCheckedAt
			})));
			setState({ assets: state.assets.map((a) => {
				const patch = patchById.get(a.id);
				return patch ? {
					...a,
					status: patch.status,
					lastCheckedAt: patch.lastCheckedAt
				} : a;
			}) });
		},
		select(ids) {
			setState({ selected: [...ids] });
		},
		dispose() {
			clearUndoTimer();
			if (activeThumbErrorOff) {
				activeThumbErrorOff();
				activeThumbErrorOff = void 0;
			}
		}
	};
	activeThumbErrorOff?.();
	activeThumbErrorOff = onThumbError((record, message) => {
		pushEvent({
			path: record.path,
			name: record.name,
			phase: "failed",
			error: `缩略图损坏：${message}`
		});
	});
	if (options.autoInit !== false) store.init();
	return store;
}
/** 当前实例注册的缩略图错误订阅（见 createStore 内的说明）。 */
let activeThumbErrorOff;
/** 全局单例。 */
const store = createStore();
//#endregion
//#region src/client/ui/hooks.ts
/**
* Small presentation hooks shared by the gallery components.
*
* Each hook owns exactly one browser resource or timing concern so components
* stay free of manual listener and object-URL bookkeeping.
*/
/**
* Delay propagating a fast-changing value.
*
* Used by the search field so typing does not re-filter the library on every
* keystroke.
* @param value - The live value.
* @param delayMs - Quiet period before the returned value catches up.
* @returns The value as of `delayMs` ago.
*/
function useDebouncedValue(value, delayMs) {
	const [settled, setSettled] = (0, react.useState)(value);
	(0, react.useEffect)(() => {
		const timer = setTimeout(() => setSettled(value), delayMs);
		return () => clearTimeout(timer);
	}, [value, delayMs]);
	return settled;
}
/**
* Manage an object URL for a blob for exactly as long as it is needed.
*
* The URL is created once per blob identity and revoked on identity change and
* on unmount, which is what keeps `URL.createObjectURL` allocation paired with
* `revokeObjectURL` while the gallery scrolls.
* @param blob - The blob to expose, or `undefined`/`null` for no URL.
* @returns The object URL, or `undefined` when there is nothing to show.
*/
function useObjectUrl(blob) {
	const [url, setUrl] = (0, react.useState)(void 0);
	(0, react.useEffect)(() => {
		if (blob === void 0 || blob === null) {
			setUrl(void 0);
			return;
		}
		const next = URL.createObjectURL(blob);
		setUrl(next);
		return () => {
			URL.revokeObjectURL(next);
		};
	}, [blob]);
	return url;
}
//#endregion
//#region src/client/ui/format.ts
/**
* Pure presentation helpers shared by the gallery, cards, and overlays.
*
* Everything here is a total function over persisted values: asset records are
* read back from IndexedDB and may carry fields written by an older build, so
* no helper may throw or return `undefined` for an unexpected input.
*/
/**
* Format a byte count for display.
* @param bytes - Size in bytes; negative or non-finite input renders as `—`.
* @returns A compact string such as `1.4 MB`.
*/
function formatBytes(bytes) {
	if (!Number.isFinite(bytes) || bytes < 0) return "—";
	if (bytes < 1024) return `${bytes} B`;
	const units = [
		"KB",
		"MB",
		"GB",
		"TB"
	];
	let value = bytes / 1024;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}
/**
* Format an import timestamp as a local calendar date.
* @param ms - Epoch milliseconds.
* @returns A `YYYY-MM-DD` string, or `—` when the value is not a finite number.
*/
function formatDate(ms) {
	if (!Number.isFinite(ms)) return "—";
	const date = new Date(ms);
	if (Number.isNaN(date.getTime())) return "—";
	const pad = (n) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
/**
* Format a media duration.
* @param ms - Duration in milliseconds.
* @returns `m:ss` (or `h:mm:ss`), or `—` when absent or not finite.
*/
function formatDuration(ms) {
	if (ms === void 0 || !Number.isFinite(ms) || ms < 0) return "—";
	const total = Math.round(ms / 1e3);
	const seconds = total % 60;
	const minutes = Math.floor(total / 60) % 60;
	const hours = Math.floor(total / 3600);
	const pad = (n) => String(n).padStart(2, "0");
	return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
/**
* Describe an asset's pixel dimensions.
* @param width - Pixel width when known.
* @param height - Pixel height when known.
* @returns `1920 × 1080`, `1920 × ?`, or `—` when neither side is known.
*/
function formatDimensions(width, height) {
	const w = Number.isFinite(width) ? width : void 0;
	const h = Number.isFinite(height) ? height : void 0;
	if (w === void 0 && h === void 0) return "—";
	return `${w ?? "?"} × ${h ?? "?"}`;
}
/**
* Compute the media box a card reserves for one aspect ratio.
*
* This is the single clamp shared by the card, the layout, and the grid
* fallback: a second implementation would let the reserved height drift from the
* rendered height and reflow the masonry as thumbnails decode.
* @param columnWidth - Width the card occupies in CSS pixels.
* @param aspect - Width divided by height; non-positive input falls back to 4:3.
* @returns The media box height in CSS pixels.
*/
function mediaBoxHeight(columnWidth, aspect) {
	const height = Math.round(columnWidth / (Number.isFinite(aspect) && aspect > 0 ? aspect : 4 / 3));
	if (!Number.isFinite(height) || height <= 0) return Math.round(columnWidth * .75);
	return Math.min(Math.max(height, 96), 640);
}
/**
* Parse a hexadecimal colour into an `rgb()` string usable behind a thumbnail.
* @param color - A `#rrggbb` / `#rgb` string from the thumbnail pipeline.
* @returns An `rgb(r, g, b)` string, or `transparent` when unparseable.
*/
function placeholderColor(color) {
	if (typeof color !== "string") return "transparent";
	const hex = color.trim().replace(/^#/, "");
	const full = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex;
	if (!/^[0-9a-fA-F]{6}$/.test(full)) return "transparent";
	const value = Number.parseInt(full, 16);
	return `rgb(${value >> 16 & 255}, ${value >> 8 & 255}, ${value & 255})`;
}
/**
* Build the origin-relative URL of the host's Range file route.
*
* The route is registered by the plugin's host half on the connection's `/api`
* bridge, which the desktop carrier reaches from the renderer without knowing
* the port. One constant lives in the data layer so the panel, the lightbox,
* the store's HEAD probe, and the chat reference all read the same path.
* @param path - Host absolute path of the referenced file.
* @returns A relative URL carrying the encoded path in its `path` query.
*/
function fileRouteUrl(path) {
	return fileUrl(path);
}
//#endregion
//#region src/client/ui/Overlay.module.css
var Overlay_module_default = {
	"al-card-in": "LKmtGG_al-card-in",
	"al-lightbox-in": "LKmtGG_al-lightbox-in",
	"al-lightbox-zoom": "LKmtGG_al-lightbox-zoom",
	"al-shimmer": "LKmtGG_al-shimmer",
	"compare": "LKmtGG_compare",
	"compareCard": "LKmtGG_compareCard",
	"compareLabel": "LKmtGG_compareLabel",
	"compareMeta": "LKmtGG_compareMeta",
	"compareName": "LKmtGG_compareName",
	"compareThumb": "LKmtGG_compareThumb",
	"dropHint": "LKmtGG_dropHint",
	"field": "LKmtGG_field",
	"fieldError": "LKmtGG_fieldError",
	"fieldInput": "LKmtGG_fieldInput",
	"fieldRow": "LKmtGG_fieldRow",
	"fieldValue": "LKmtGG_fieldValue",
	"ghostButton": "LKmtGG_ghostButton",
	"lightboxBackdrop": "LKmtGG_lightboxBackdrop",
	"lightboxCounter": "LKmtGG_lightboxCounter",
	"lightboxFooter": "LKmtGG_lightboxFooter",
	"lightboxFooterActions": "LKmtGG_lightboxFooterActions",
	"lightboxFrame": "LKmtGG_lightboxFrame",
	"lightboxMedia": "LKmtGG_lightboxMedia",
	"lightboxName": "LKmtGG_lightboxName",
	"lightboxNav": "LKmtGG_lightboxNav",
	"lightboxNavNext": "LKmtGG_lightboxNavNext",
	"lightboxNavPrev": "LKmtGG_lightboxNavPrev",
	"lightboxNotice": "LKmtGG_lightboxNotice",
	"lightboxPlaceholder": "LKmtGG_lightboxPlaceholder",
	"lightboxStage": "LKmtGG_lightboxStage",
	"lightboxTitle": "LKmtGG_lightboxTitle",
	"lightboxVideo": "LKmtGG_lightboxVideo",
	"modal": "LKmtGG_modal",
	"modalActions": "LKmtGG_modalActions",
	"modalActionsSpacer": "LKmtGG_modalActionsSpacer",
	"modalBackdrop": "LKmtGG_modalBackdrop",
	"modalBody": "LKmtGG_modalBody",
	"modalCheckbox": "LKmtGG_modalCheckbox",
	"modalTitle": "LKmtGG_modalTitle",
	"popover": "LKmtGG_popover",
	"popoverTitle": "LKmtGG_popoverTitle",
	"progressError": "LKmtGG_progressError",
	"progressHead": "LKmtGG_progressHead",
	"progressList": "LKmtGG_progressList",
	"progressName": "LKmtGG_progressName",
	"progressPanel": "LKmtGG_progressPanel",
	"progressPhase": "LKmtGG_progressPhase",
	"progressPhaseFailed": "LKmtGG_progressPhaseFailed",
	"progressRow": "LKmtGG_progressRow",
	"progressRowFailed": "LKmtGG_progressRowFailed",
	"progressTitle": "LKmtGG_progressTitle",
	"progressToggle": "LKmtGG_progressToggle",
	"range": "LKmtGG_range",
	"skeletonCard": "LKmtGG_skeletonCard",
	"skeletonColumn": "LKmtGG_skeletonColumn",
	"skeletonFooter": "LKmtGG_skeletonFooter",
	"skeletonGrid": "LKmtGG_skeletonGrid",
	"skeletonLine": "LKmtGG_skeletonLine",
	"skeletonLineShort": "LKmtGG_skeletonLineShort",
	"skeletonMedia": "LKmtGG_skeletonMedia",
	"stateActions": "LKmtGG_stateActions",
	"stateBody": "LKmtGG_stateBody",
	"stateDetails": "LKmtGG_stateDetails",
	"stateDetailsPre": "LKmtGG_stateDetailsPre",
	"stateDetailsSummary": "LKmtGG_stateDetailsSummary",
	"stateGlyph": "LKmtGG_stateGlyph",
	"stateTitle": "LKmtGG_stateTitle",
	"stateWrap": "LKmtGG_stateWrap",
	"visuallyHidden": "LKmtGG_visuallyHidden",
	"wallpaperActions": "LKmtGG_wallpaperActions"
};
//#endregion
//#region src/client/ui/App.module.css
var App_module_default = {
	"al-undo-in": "nHXo_W_al-undo-in",
	"body": "nHXo_W_body",
	"chip": "nHXo_W_chip",
	"chipActive": "nHXo_W_chipActive",
	"chipGlyph": "nHXo_W_chipGlyph",
	"chipGroup": "nHXo_W_chipGroup",
	"chipGroupLabel": "nHXo_W_chipGroupLabel",
	"countLabel": "nHXo_W_countLabel",
	"curation": "nHXo_W_curation",
	"dangerButton": "nHXo_W_dangerButton",
	"dateInput": "nHXo_W_dateInput",
	"ghostButton": "nHXo_W_ghostButton",
	"iconButton": "nHXo_W_iconButton",
	"iconButtonFlagged": "nHXo_W_iconButtonFlagged",
	"importBar": "nHXo_W_importBar",
	"mark": "nHXo_W_mark",
	"primaryButton": "nHXo_W_primaryButton",
	"root": "nHXo_W_root",
	"searchClear": "nHXo_W_searchClear",
	"searchIcon": "nHXo_W_searchIcon",
	"searchInput": "nHXo_W_searchInput",
	"searchWrap": "nHXo_W_searchWrap",
	"select": "nHXo_W_select",
	"settingsAnchor": "nHXo_W_settingsAnchor",
	"spacer": "nHXo_W_spacer",
	"tagChipCount": "nHXo_W_tagChipCount",
	"toolbar": "nHXo_W_toolbar",
	"toolbarRow": "nHXo_W_toolbarRow",
	"undoBar": "nHXo_W_undoBar",
	"visuallyHidden": "nHXo_W_visuallyHidden"
};
//#endregion
//#region src/client/ui/DuplicateDialog.tsx
/**
* Duplicate-resolution dialog for the import pipeline.
*
* The store reports a content-hash collision and waits for a verdict, so this
* dialog is the only place that decides between skipping the new file, keeping
* both copies, and replacing the stored one. A verdict is required: dismissing
* the dialog resolves the pending item as `skip` rather than stalling the queue.
*/
/**
* Render the duplicate dialog.
* @param props - The collision and its resolver.
* @returns The modal overlay.
*/
function DuplicateDialog(props) {
	const { existing, incoming } = props.request;
	const [applyToAll, setApplyToAll] = (0, react.useState)(false);
	const existingThumb = useObjectUrl(existing.thumb instanceof Blob ? existing.thumb : void 0);
	const resolve = (0, react.useCallback)((choice) => {
		props.onResolve(choice, applyToAll);
	}, [props.onResolve, applyToAll]);
	(0, react.useEffect)(() => {
		const onKey = (event) => {
			if (event.key !== "Escape") return;
			event.preventDefault();
			resolve("skip");
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [resolve]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		className: Overlay_module_default.modalBackdrop,
		role: "dialog",
		"aria-modal": "true",
		"aria-label": "发现重复素材",
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: Overlay_module_default.modal,
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
					className: Overlay_module_default.modalTitle,
					children: "发现重复素材"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: Overlay_module_default.modalBody,
					children: "新文件与库中已有素材内容一致（SHA-256 相同）。你想怎么处理？"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: Overlay_module_default.compare,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Overlay_module_default.compareCard,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Overlay_module_default.compareLabel,
								children: "库中已有"
							}),
							existingThumb !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
								className: Overlay_module_default.compareThumb,
								src: existingThumb,
								alt: ""
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: Overlay_module_default.compareThumb }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Overlay_module_default.compareName,
								title: existing.name,
								children: existing.name
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: Overlay_module_default.compareMeta,
								children: [
									formatBytes(existing.size),
									" · 导入于 ",
									formatDate(existing.importedAt)
								]
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Overlay_module_default.compareCard,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Overlay_module_default.compareLabel,
								children: "正在导入"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: Overlay_module_default.compareThumb }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Overlay_module_default.compareName,
								title: incoming.name,
								children: incoming.name
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Overlay_module_default.compareMeta,
								children: formatBytes(incoming.size)
							})
						]
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
					className: Overlay_module_default.modalCheckbox,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: applyToAll,
							onChange: (event) => setApplyToAll(event.target.checked)
						}),
						"对本次剩余的 ",
						props.remaining,
						" 个重复文件都这样做"
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: Overlay_module_default.modalActions,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: App_module_default.ghostButton,
							onClick: () => resolve("skip"),
							children: "跳过"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: App_module_default.ghostButton,
							onClick: () => resolve("keep"),
							children: "保留两份"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Overlay_module_default.modalActionsSpacer }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: App_module_default.primaryButton,
							onClick: () => resolve("replace"),
							children: "替换已有"
						})
					]
				})
			]
		})
	});
}
//#endregion
//#region src/client/ui/Highlight.tsx
/**
* Search-hit rendering. The match ranges come from `highlightRanges` in the
* data layer, so this module owns only the presentation of a hit, never the
* matching rules.
*/
/**
* Render `text`, wrapping every query hit in `<mark>`.
*
* Ranges arrive non-overlapping and ascending by construction; each is still
* clamped to the string so a stale query cannot produce an out-of-range slice.
* @param props - Text, query, and the mark class.
* @returns A fragment of plain strings and `<mark>` elements.
*/
function Highlight({ text, query, markClassName }) {
	const ranges = query.trim() === "" ? [] : highlightRanges(text, query);
	if (ranges.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: text });
	const parts = [];
	let cursor = 0;
	ranges.forEach(([rawStart, rawEnd], index) => {
		const start = Math.max(cursor, Math.min(rawStart, text.length));
		const end = Math.max(start, Math.min(rawEnd, text.length));
		if (start > cursor) parts.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(react.Fragment, { children: text.slice(cursor, start) }, `t${index}`));
		if (end > start) parts.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("mark", {
			className: markClassName,
			children: text.slice(start, end)
		}, `m${index}`));
		cursor = end;
	});
	if (cursor < text.length) parts.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(react.Fragment, { children: text.slice(cursor) }, "tail"));
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: parts });
}
//#endregion
//#region src/client/ui/asset-kind.ts
/**
* Presentation metadata for {@link AssetKind} values.
*
* The kind union itself is owned by the frozen data contract in
* `../data/types.ts`; this module adds only the labels and glyphs the UI needs
* and exports a keyed list so components can iterate without naming kinds.
*/
/** Every `AssetKind` the data layer can produce, in toolbar order. */
const ASSET_KINDS = [
	"image",
	"video",
	"audio",
	"document",
	"archive",
	"other"
];
/** Short Chinese labels for the type chips and type badges. */
const KIND_LABEL = {
	image: "图片",
	video: "视频",
	audio: "音频",
	document: "文档",
	archive: "压缩包",
	other: "其它"
};
/** One glyph per kind, embedded as text so no icon font is required. */
const KIND_GLYPH = {
	image: "🖼",
	video: "🎬",
	audio: "🎵",
	document: "📄",
	archive: "🗜",
	other: "📦"
};
/**
* Read a kind's label.
* @param kind - Asset kind, or an unexpected string from persisted data.
* @returns The Chinese label, falling back to the raw kind.
*/
function kindLabel(kind) {
	return KIND_LABEL[kind] ?? kind;
}
/**
* Read a kind's badge glyph.
* @param kind - Asset kind, or an unexpected string from persisted data.
* @returns The glyph, falling back to the generic box.
*/
function kindGlyph(kind) {
	return KIND_GLYPH[kind] ?? "📦";
}
//#endregion
//#region src/client/ui/Gallery.module.css
var Gallery_module_default = {
	"al-card-in": "RugfnG_al-card-in",
	"al-select-pop": "RugfnG_al-select-pop",
	"al-shimmer": "RugfnG_al-shimmer",
	"card": "RugfnG_card",
	"cardMissing": "RugfnG_cardMissing",
	"cardReference": "RugfnG_cardReference",
	"cardSelected": "RugfnG_cardSelected",
	"cornerStack": "RugfnG_cornerStack",
	"durationBadge": "RugfnG_durationBadge",
	"footer": "RugfnG_footer",
	"gridSurface": "RugfnG_gridSurface",
	"kindBadge": "RugfnG_kindBadge",
	"media": "RugfnG_media",
	"mediaFallback": "RugfnG_mediaFallback",
	"mediaImage": "RugfnG_mediaImage",
	"mediaImageReady": "RugfnG_mediaImageReady",
	"mediaPlaceholder": "RugfnG_mediaPlaceholder",
	"mediaSkeleton": "RugfnG_mediaSkeleton",
	"missingBadge": "RugfnG_missingBadge",
	"moreButton": "RugfnG_moreButton",
	"name": "RugfnG_name",
	"ratingOverlay": "RugfnG_ratingOverlay",
	"ratingStars": "RugfnG_ratingStars",
	"ratingStarsEmpty": "RugfnG_ratingStarsEmpty",
	"scroller": "RugfnG_scroller",
	"selectTick": "RugfnG_selectTick",
	"sourceBadge": "RugfnG_sourceBadge",
	"stage": "RugfnG_stage",
	"statusStar": "RugfnG_statusStar",
	"veil": "RugfnG_veil",
	"veilAction": "RugfnG_veilAction",
	"veilActionOn": "RugfnG_veilActionOn",
	"veilActions": "RugfnG_veilActions",
	"veilGradient": "RugfnG_veilGradient",
	"veilMeta": "RugfnG_veilMeta",
	"veilMetaKey": "RugfnG_veilMetaKey",
	"veilMetaRow": "RugfnG_veilMetaRow",
	"veilMetaValue": "RugfnG_veilMetaValue",
	"veilPanel": "RugfnG_veilPanel",
	"veilTag": "RugfnG_veilTag",
	"veilTags": "RugfnG_veilTags",
	"wallpaper": "RugfnG_wallpaper",
	"wallpaperMask": "RugfnG_wallpaperMask"
};
//#endregion
//#region src/client/ui/AssetCard.tsx
/**
* One gallery cell: the picture itself, its corner marks, the always-visible
* reference action, and the hover control board.
*
* The card is purely presentational. It never touches IndexedDB or the store;
* every action arrives as a callback. Image assets are shown at full resolution
* (the host file route), with the stored thumbnail standing in as the
* placeholder and as the only source of card height — so the masonry layout
* never shifts, and a card that is out of view never requests the original.
*/
/** Star glyphs for one rating value. */
const STARS = [
	"",
	"★",
	"★★",
	"★★★",
	"★★★★",
	"★★★★★"
];
/** How far outside the viewport a card starts loading its original. */
const ORIGINAL_ROOT_MARGIN = "320px 0px";
/** Rating values the control board offers. */
const RATING_VALUES = [
	1,
	2,
	3,
	4,
	5
];
/**
* Paths whose full-resolution read already failed.
*
* Virtualisation unmounts and remounts cells as the wall scrolls, so without
* this memo every scroll back over an unreadable file would ask the host route
* for it again. The mark is per path, so relocating the asset retries.
*/
const failedOriginalPaths = /* @__PURE__ */ new Set();
/**
* Largest picture, in pixels, the card decodes at full resolution.
*
* The byte cap alone does not bound memory: a heavily compressed 64 MB JPEG can
* be a 12000x8000 bitmap, which decodes to roughly 380 MB per visible card. This
* guard reuses the same "原图过大" branch, so the card degrades to its thumbnail
* instead of risking the renderer. Photos up to roughly 40 MP still load.
*/
const MAX_ORIGINAL_PIXELS = 4e7;
/**
* Render one gallery cell.
* @param props - Asset, geometry, selection state, and action callbacks.
* @returns The card element.
*/
function AssetCard(props) {
	const { asset, width, index, selected, query, originalCap } = props;
	const [thumbFailed, setThumbFailed] = (0, react.useState)(false);
	const [heroReady, setHeroReady] = (0, react.useState)(false);
	const [originalFailed, setOriginalFailed] = (0, react.useState)(() => failedOriginalPaths.has(asset.path));
	const [nearViewport, setNearViewport] = (0, react.useState)(false);
	const mediaRef = (0, react.useRef)(null);
	const thumb = asset.thumb instanceof Blob && asset.thumb.size > 0 ? asset.thumb : void 0;
	const thumbUrl = useObjectUrl(thumbFailed ? void 0 : thumb);
	const missing = asset.status === "missing";
	const oversized = asset.size > originalCap || pixelCount(asset) > MAX_ORIGINAL_PIXELS;
	const wantsOriginal = asset.kind === "image" && !missing && !oversized && !failedOriginalPaths.has(asset.path);
	const originalUrl = wantsOriginal && nearViewport && !originalFailed ? fileRouteUrl(asset.path) : void 0;
	(0, react.useEffect)(() => {
		setThumbFailed(false);
		setHeroReady(false);
		setOriginalFailed(failedOriginalPaths.has(asset.path));
		setNearViewport(false);
	}, [asset.id, asset.path]);
	(0, react.useEffect)(() => {
		if (!wantsOriginal || nearViewport) return;
		const node = mediaRef.current;
		if (node === null || typeof IntersectionObserver === "undefined") {
			setNearViewport(true);
			return;
		}
		const observer = new IntersectionObserver((entries) => {
			if (entries.some((entry) => entry.isIntersecting)) {
				setNearViewport(true);
				observer.disconnect();
			}
		}, { rootMargin: ORIGINAL_ROOT_MARGIN });
		observer.observe(node);
		return () => observer.disconnect();
	}, [wantsOriginal, nearViewport]);
	const showingOriginal = originalUrl !== void 0;
	const placeholderUrl = showingOriginal ? thumbUrl : void 0;
	const heroUrl = originalUrl ?? thumbUrl;
	(0, react.useEffect)(() => {
		setHeroReady(false);
	}, [heroUrl]);
	const mediaHeight = (0, react.useMemo)(() => cardMediaHeight(asset, width), [asset, width]);
	const cardStyle = (0, react.useMemo)(() => ({
		"--al-media-height": `${mediaHeight}px`,
		"--al-stagger": `${Math.min(index, 40) * 12}ms`
	}), [mediaHeight, index]);
	const mediaBackground = (0, react.useMemo)(() => placeholderColor(asset.dominantColor), [asset.dominantColor]);
	const activate = (0, react.useCallback)((event) => {
		if (event.metaKey || event.ctrlKey || event.shiftKey) {
			props.onSelect(asset, {
				toggle: true,
				range: event.shiftKey
			});
			return;
		}
		props.onOpen(asset);
	}, [
		props.onSelect,
		props.onOpen,
		asset
	]);
	const onKeyDown = (0, react.useCallback)((event) => {
		if (event.key === "Enter") {
			event.preventDefault();
			props.onOpen(asset);
			return;
		}
		if (event.key === " ") {
			event.preventDefault();
			props.onSelect(asset, {
				toggle: true,
				range: event.shiftKey
			});
		}
	}, [
		props.onOpen,
		props.onSelect,
		asset
	]);
	const rating = STARS[asset.rating] ?? "";
	const showSkeleton = heroUrl !== void 0 && !heroReady && placeholderUrl === void 0;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: [
			Gallery_module_default.card,
			selected ? Gallery_module_default.cardSelected : "",
			missing ? Gallery_module_default.cardMissing : ""
		].filter(Boolean).join(" "),
		style: cardStyle,
		role: "button",
		tabIndex: 0,
		"aria-pressed": selected,
		"aria-label": `${asset.name}，${kindLabel(asset.kind)}`,
		"data-asset-id": asset.id,
		"data-selected": selected ? "true" : void 0,
		onClick: activate,
		onKeyDown,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: Gallery_module_default.media,
			style: { background: mediaBackground },
			ref: mediaRef,
			children: [
				placeholderUrl !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
					className: Gallery_module_default.mediaPlaceholder,
					src: placeholderUrl,
					alt: "",
					draggable: false,
					"data-al-placeholder": ""
				}) : null,
				heroUrl !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
					className: `${Gallery_module_default.mediaImage} ${heroReady ? Gallery_module_default.mediaImageReady : ""}`,
					src: heroUrl,
					alt: "",
					draggable: false,
					decoding: "async",
					"data-al-hero": showingOriginal ? "original" : "thumbnail",
					onLoad: () => setHeroReady(true),
					onError: () => {
						if (showingOriginal) {
							failedOriginalPaths.add(asset.path);
							setOriginalFailed(true);
						} else setThumbFailed(true);
					}
				}) : null,
				showSkeleton ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: Gallery_module_default.mediaSkeleton }) : null,
				placeholderUrl === void 0 && heroUrl === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: Gallery_module_default.mediaFallback,
					"aria-hidden": "true",
					children: kindLabel(asset.kind).slice(0, 1)
				}) : null,
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: Gallery_module_default.cornerStack,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Gallery_module_default.kindBadge,
							children: kindLabel(asset.kind)
						}),
						missing ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Gallery_module_default.missingBadge,
							"data-al-badge": "missing",
							children: "文件缺失"
						}) : null,
						oversized && asset.kind === "image" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Gallery_module_default.sourceBadge,
							"data-al-badge": "oversized",
							children: "原图过大"
						}) : null,
						originalFailed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Gallery_module_default.sourceBadge,
							"data-al-badge": "unreadable",
							children: "原图不可用"
						}) : null
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: Gallery_module_default.moreButton,
					"aria-label": "更多操作",
					"aria-haspopup": "menu",
					onClick: (event) => {
						event.stopPropagation();
						props.onMore(asset, event.currentTarget);
					},
					children: "⋯"
				}),
				selected ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: Gallery_module_default.selectTick,
					"aria-hidden": "true",
					children: "✓"
				}) : asset.favorite ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: Gallery_module_default.statusStar,
					"aria-hidden": "true",
					children: "★"
				}) : null,
				rating !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: Gallery_module_default.ratingOverlay,
					"aria-hidden": "true",
					children: rating
				}) : null,
				asset.durationMs !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: Gallery_module_default.durationBadge,
					children: formatDuration(asset.durationMs)
				}) : null,
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: Gallery_module_default.veil,
					"data-al-veil": "",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Gallery_module_default.veilGradient,
						"aria-hidden": "true"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Gallery_module_default.veilPanel,
						"data-al-veil-panel": "",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Gallery_module_default.veilMeta,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: Gallery_module_default.veilMetaRow,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Gallery_module_default.veilMetaKey,
											children: "尺寸"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Gallery_module_default.veilMetaValue,
											children: formatDimensions(asset.width, asset.height)
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: Gallery_module_default.veilMetaRow,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Gallery_module_default.veilMetaKey,
											children: "大小"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Gallery_module_default.veilMetaValue,
											children: formatBytes(asset.size)
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: Gallery_module_default.veilMetaRow,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Gallery_module_default.veilMetaKey,
											children: "导入"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Gallery_module_default.veilMetaValue,
											children: formatDate(asset.importedAt)
										})]
									})
								]
							}),
							asset.tags.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Gallery_module_default.veilTags,
								children: asset.tags.slice(0, 8).map((tag) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: Gallery_module_default.veilTag,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Highlight, {
										text: tag,
										query
									})
								}, tag))
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Gallery_module_default.veilActions,
								role: "group",
								"aria-label": "评分",
								onClick: (event) => event.stopPropagation(),
								children: RATING_VALUES.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: `${Gallery_module_default.veilAction} ${asset.rating >= value ? Gallery_module_default.veilActionOn : ""}`,
									"aria-label": `评为 ${value} 星`,
									"aria-pressed": asset.rating === value,
									onClick: () => props.onRate(asset, asset.rating === value ? 0 : value),
									children: asset.rating >= value ? "★" : "☆"
								}, value))
							})
						]
					})]
				})
			]
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: Gallery_module_default.footer,
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: Gallery_module_default.name,
				title: asset.name,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Highlight, {
					text: asset.name,
					query
				})
			}), props.onReference !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: Gallery_module_default.cardReference,
				"data-al-reference": "",
				onClick: (event) => {
					event.stopPropagation();
					props.onReference?.(asset);
				},
				children: "引用到对话"
			}) : null]
		})]
	});
}
/**
* Card media height for one asset at one column width.
*
* The height comes from stored metadata only, so it is identical before and
* after a picture decodes and the masonry layout never reflows.
* @param asset - Asset whose aspect ratio is reserved.
* @param width - Rendered card width in CSS pixels.
* @returns Media box height in CSS pixels.
*/
function cardMediaHeight(asset, width) {
	return mediaBoxHeight(width, aspectOf(asset));
}
/**
* Stored pixel count of one asset, or 0 when the dimensions are unknown.
* @param asset - Asset whose stored dimensions are read.
* @returns Width times height, or 0 when either side is missing.
*/
function pixelCount(asset) {
	const { width, height } = asset;
	if (typeof width !== "number" || typeof height !== "number") return 0;
	if (!(width > 0) || !(height > 0)) return 0;
	return width * height;
}
/** Aspect ratio from the most trustworthy stored numbers. */
function aspectOf(asset) {
	const { width, height, thumbWidth, thumbHeight } = asset;
	if (typeof width === "number" && typeof height === "number" && width > 0 && height > 0) return width / height;
	if (typeof thumbWidth === "number" && typeof thumbHeight === "number" && thumbWidth > 0 && thumbHeight > 0) return thumbWidth / thumbHeight;
	return 4 / 3;
}
//#endregion
//#region src/client/ui/CardMenu.module.css
var CardMenu_module_default = {
	"empty": "_3Xsdoq_empty",
	"inlineConfirm": "_3Xsdoq_inlineConfirm",
	"inlineForm": "_3Xsdoq_inlineForm",
	"inlineInput": "_3Xsdoq_inlineInput",
	"item": "_3Xsdoq_item",
	"itemDanger": "_3Xsdoq_itemDanger",
	"menu": "_3Xsdoq_menu",
	"section": "_3Xsdoq_section",
	"sectionLabel": "_3Xsdoq_sectionLabel",
	"tag": "_3Xsdoq_tag",
	"tagList": "_3Xsdoq_tagList"
};
//#endregion
//#region src/client/ui/CardMenu.tsx
/**
* Per-card overflow menu.
*
* Anchored to the button that opened it and positioned in viewport coordinates,
* because the gallery scrolls inside its own pane and an absolutely positioned
* child of a card would be clipped by the card's own overflow.
*/
/** Gap between the anchor button and the menu. */
const ANCHOR_GAP = 6;
/** Minimum distance the menu keeps from the viewport edge. */
const VIEWPORT_MARGIN = 8;
/**
* Render the overflow menu for one asset.
* @param props - Asset and action callbacks.
* @returns The menu element.
*/
function CardMenu(props) {
	const { asset, anchor, onClose } = props;
	const ref = (0, react.useRef)(null);
	const [position, setPosition] = (0, react.useState)(() => anchorPosition(anchor));
	const [renaming, setRenaming] = (0, react.useState)(false);
	const [draftName, setDraftName] = (0, react.useState)(asset.name);
	const [relocating, setRelocating] = (0, react.useState)(false);
	const [draftPath, setDraftPath] = (0, react.useState)(asset.path);
	const [tagDraft, setTagDraft] = (0, react.useState)("");
	(0, react.useLayoutEffect)(() => {
		const element = ref.current;
		if (element === null) return;
		const place = () => {
			const box = element.getBoundingClientRect();
			const anchorBox = anchor.getBoundingClientRect();
			const left = Math.min(Math.max(anchorBox.right - box.width, VIEWPORT_MARGIN), window.innerWidth - box.width - VIEWPORT_MARGIN);
			const below = anchorBox.bottom + ANCHOR_GAP;
			const top = below + box.height > window.innerHeight - VIEWPORT_MARGIN ? Math.max(VIEWPORT_MARGIN, anchorBox.top - box.height - ANCHOR_GAP) : below;
			setPosition({
				left,
				top
			});
		};
		place();
		window.addEventListener("resize", place);
		return () => window.removeEventListener("resize", place);
	}, [
		anchor,
		renaming,
		relocating
	]);
	(0, react.useEffect)(() => {
		const onKey = (event) => {
			if (event.key === "Escape") onClose();
		};
		const onPointer = (event) => {
			const target = event.target;
			if (!(target instanceof Node)) return;
			if (ref.current?.contains(target) === true || anchor.contains(target)) return;
			onClose();
		};
		const onScroll = () => onClose();
		document.addEventListener("keydown", onKey);
		document.addEventListener("pointerdown", onPointer, true);
		window.addEventListener("scroll", onScroll, true);
		return () => {
			document.removeEventListener("keydown", onKey);
			document.removeEventListener("pointerdown", onPointer, true);
			window.removeEventListener("scroll", onScroll, true);
		};
	}, [anchor, onClose]);
	const run = (action) => {
		action();
		onClose();
	};
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: CardMenu_module_default.menu,
		ref,
		role: "menu",
		"aria-label": `${asset.name} 的操作`,
		style: {
			left: position.left,
			top: position.top
		},
		children: [
			renaming ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
				className: CardMenu_module_default.inlineForm,
				onSubmit: (event) => {
					event.preventDefault();
					const next = draftName.trim();
					if (next !== "" && next !== asset.name) run(() => props.onRename(asset, next));
					else onClose();
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					className: CardMenu_module_default.inlineInput,
					value: draftName,
					autoFocus: true,
					"aria-label": "新名称",
					onChange: (event) => setDraftName(event.target.value)
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "submit",
					className: CardMenu_module_default.inlineConfirm,
					children: "确定"
				})]
			}) : null,
			props.onReference !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				role: "menuitem",
				className: CardMenu_module_default.item,
				onClick: () => run(() => props.onReference?.(asset)),
				children: "引用到对话"
			}) : null,
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				role: "menuitem",
				className: CardMenu_module_default.item,
				onClick: () => run(() => props.onToggleFavorite(asset)),
				children: asset.favorite ? "取消收藏" : "收藏"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				role: "menuitem",
				className: CardMenu_module_default.item,
				onClick: () => setRenaming(true),
				children: "重命名"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: CardMenu_module_default.section,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: CardMenu_module_default.sectionLabel,
						children: "标签"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: CardMenu_module_default.tagList,
						children: [asset.tags.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: CardMenu_module_default.empty,
							children: "暂无标签"
						}) : null, asset.tags.map((tag) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: CardMenu_module_default.tag,
							title: "移除标签",
							onClick: () => props.onToggleTag(asset, tag),
							children: [tag, " ✕"]
						}, tag))]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
						className: CardMenu_module_default.inlineForm,
						onSubmit: (event) => {
							event.preventDefault();
							const tag = tagDraft.trim();
							if (tag !== "") props.onToggleTag(asset, tag);
							setTagDraft("");
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: CardMenu_module_default.inlineInput,
							value: tagDraft,
							placeholder: "添加标签…",
							"aria-label": "添加标签",
							onChange: (event) => setTagDraft(event.target.value)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "submit",
							className: CardMenu_module_default.inlineConfirm,
							children: "添加"
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				role: "menuitem",
				className: CardMenu_module_default.item,
				onClick: () => run(() => props.onRecheck(asset)),
				children: "重新检查文件"
			}),
			relocating ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
				className: CardMenu_module_default.inlineForm,
				onSubmit: (event) => {
					event.preventDefault();
					const next = draftPath.trim();
					if (next !== "" && next !== asset.path) run(() => props.onRelocate(asset, next));
					else onClose();
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					className: CardMenu_module_default.inlineInput,
					value: draftPath,
					autoFocus: true,
					"aria-label": "新的文件路径",
					placeholder: "/绝对路径/文件.ext",
					onChange: (event) => setDraftPath(event.target.value)
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "submit",
					className: CardMenu_module_default.inlineConfirm,
					children: "确定"
				})]
			}) : null,
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				role: "menuitem",
				className: CardMenu_module_default.item,
				onClick: () => {
					if (props.onRequestRelocate !== void 0) {
						run(() => props.onRequestRelocate?.(asset));
						return;
					}
					setRelocating(true);
				},
				children: "重新定位…"
			}),
			props.onOpenSystem !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				role: "menuitem",
				className: CardMenu_module_default.item,
				onClick: () => run(() => props.onOpenSystem?.(asset)),
				children: "用系统默认应用打开"
			}) : null,
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				role: "menuitem",
				className: `${CardMenu_module_default.item} ${CardMenu_module_default.itemDanger}`,
				title: "只从素材库移除，磁盘上的原文件保留",
				onClick: () => run(() => props.onDelete(asset)),
				children: "移出素材库"
			})
		]
	});
}
/**
* Initial menu position, before the menu has been measured.
* @param anchor - The button the menu hangs from.
* @returns Viewport coordinates for the menu's top-left corner.
*/
function anchorPosition(anchor) {
	const box = anchor.getBoundingClientRect();
	return {
		left: box.right,
		top: box.bottom + ANCHOR_GAP
	};
}
//#endregion
//#region src/client/ui/Lightbox.tsx
/**
* Full-surface preview for one asset.
*
* Images and videos stream from the host's Range file route so playback and
* seeking work without loading the whole file into memory. When the route
* cannot serve the original, the image view falls back to the stored thumbnail
* and says so, rather than showing a broken frame.
*/
/**
* Decide how an asset should be previewed.
* @param asset - Asset under preview.
* @returns The media mode, or `none` for a type-only placeholder.
*/
function mediaModeFor(asset) {
	if (asset.kind === "image") return "image";
	if (asset.kind === "video") return "video";
	return "none";
}
/**
* Render the lightbox.
* @param props - Asset, navigation, and close callbacks.
* @returns The lightbox overlay.
*/
function Lightbox(props) {
	const { asset, position, total } = props;
	const mode = mediaModeFor(asset);
	const dialogRef = (0, react.useRef)(null);
	const restoreFocusRef = (0, react.useRef)(null);
	const routeUrl = (0, react.useMemo)(() => asset.status === "missing" ? void 0 : fileRouteUrl(asset.path), [asset.path, asset.status]);
	const [routeFailed, setRouteFailed] = (0, react.useState)(false);
	const [mediaLoaded, setMediaLoaded] = (0, react.useState)(false);
	const fallbackUrl = useObjectUrl(routeFailed || mode === "none" ? asset.thumb : void 0);
	const keyDown = (0, react.useCallback)((event) => {
		if (event.key === "Escape") {
			event.preventDefault();
			props.onClose();
			return;
		}
		if (event.key === "ArrowLeft" && props.onPrevious !== void 0) {
			event.preventDefault();
			props.onPrevious();
			return;
		}
		if (event.key === "ArrowRight" && props.onNext !== void 0) {
			event.preventDefault();
			props.onNext();
		}
	}, [
		props.onClose,
		props.onPrevious,
		props.onNext
	]);
	(0, react.useEffect)(() => {
		restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		dialogRef.current?.focus();
		return () => restoreFocusRef.current?.focus();
	}, []);
	(0, react.useEffect)(() => {
		document.addEventListener("keydown", keyDown);
		return () => document.removeEventListener("keydown", keyDown);
	}, [keyDown]);
	(0, react.useEffect)(() => {
		setRouteFailed(false);
		setMediaLoaded(false);
	}, [asset.id]);
	const showVideo = mode === "video" && !routeFailed && asset.status !== "missing";
	const imageUnavailable = mode === "image" && (routeFailed || asset.status === "missing");
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: Overlay_module_default.lightboxBackdrop,
		ref: dialogRef,
		role: "dialog",
		"aria-modal": "true",
		"aria-label": `预览 ${asset.name}`,
		tabIndex: -1,
		onClick: (event) => {
			if (event.target === event.currentTarget) props.onClose();
		},
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Overlay_module_default.lightboxFrame,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: Overlay_module_default.lightboxTitle,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: Overlay_module_default.lightboxName,
						children: asset.name
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: Overlay_module_default.lightboxCounter,
						children: [
							position,
							" / ",
							total
						]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: Overlay_module_default.lightboxNav,
					style: {
						position: "static",
						transform: "none",
						width: 30,
						height: 30
					},
					"aria-label": "关闭预览",
					onClick: props.onClose,
					children: "✕"
				})]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Overlay_module_default.lightboxStage,
				children: [
					props.onPrevious !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: `${Overlay_module_default.lightboxNav} ${Overlay_module_default.lightboxNavPrev}`,
						"aria-label": "上一个",
						onClick: props.onPrevious,
						children: "‹"
					}) : null,
					imageUnavailable ? fallbackUrl !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
						className: Overlay_module_default.lightboxMedia,
						src: fallbackUrl,
						alt: asset.name
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Overlay_module_default.lightboxPlaceholder,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Overlay_module_default.stateGlyph,
							"aria-hidden": "true",
							children: kindGlyph(asset.kind)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "缩略图不可用" })]
					}) : showVideo ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("video", {
						className: `${Overlay_module_default.lightboxMedia} ${Overlay_module_default.lightboxVideo}`,
						src: routeUrl,
						controls: true,
						preload: "metadata",
						onLoadedData: () => setMediaLoaded(true),
						onError: () => setRouteFailed(true)
					}) : mode === "image" && routeUrl !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
						className: Overlay_module_default.lightboxMedia,
						src: routeUrl,
						alt: asset.name,
						onLoad: () => setMediaLoaded(true),
						onError: () => setRouteFailed(true)
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Overlay_module_default.lightboxPlaceholder,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Overlay_module_default.stateGlyph,
								"aria-hidden": "true",
								children: kindGlyph(asset.kind)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
								kindLabel(asset.kind),
								"文件 · ",
								asset.ext.toUpperCase() || "未知格式"
							] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Overlay_module_default.lightboxNotice,
								children: asset.status === "missing" ? "原始文件已不在磁盘上，仅能显示已保存的缩略图。" : "此类型无法在库内预览，可用系统默认应用打开。"
							})
						]
					}),
					props.onNext !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: `${Overlay_module_default.lightboxNav} ${Overlay_module_default.lightboxNavNext}`,
						"aria-label": "下一个",
						onClick: props.onNext,
						children: "›"
					}) : null
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Overlay_module_default.lightboxFooter,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
						formatDimensions(asset.width, asset.height),
						" · ",
						formatBytes(asset.size),
						asset.durationMs !== void 0 ? ` · ${formatDuration(asset.durationMs)}` : ""
					] }),
					routeFailed && mode === "image" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: Overlay_module_default.lightboxNotice,
						children: "原图读取失败，已回退到缩略图。"
					}) : null,
					routeFailed && mode === "video" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: Overlay_module_default.lightboxNotice,
						children: "视频流读取失败，无法在库内播放。"
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: Overlay_module_default.lightboxFooterActions,
						children: [props.onReference !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: Overlay_module_default.veilActionPrimary,
							onClick: () => props.onReference?.(asset),
							children: "引用到对话"
						}) : null, props.onOpenSystem !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: Overlay_module_default.ghostButton,
							onClick: () => props.onOpenSystem?.(asset),
							children: "用系统应用打开"
						}) : null]
					})
				]
			}),
			!mediaLoaded && (mode === "image" || mode === "video") && !routeFailed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				"aria-live": "polite",
				style: {
					position: "absolute",
					left: -9999
				},
				children: "正在加载原图"
			}) : null
		]
	});
}
//#endregion
//#region src/client/ui/States.tsx
/**
* The gallery's three non-content states: empty, loading, and error.
*
* Loading shows skeleton cards shaped like real cards rather than a spinner, so
* the layout the user is waiting for is already legible.
*/
/**
* Render the empty-library guidance.
* @param props - Picker and query-reset callbacks.
* @returns The empty-state element.
*/
function EmptyState(props) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: Overlay_module_default.stateWrap,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: Overlay_module_default.stateGlyph,
				"aria-hidden": "true",
				children: "🖼"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
				className: Overlay_module_default.stateTitle,
				children: props.filtered ? "没有匹配的素材" : "素材库还是空的"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: Overlay_module_default.stateBody,
				children: props.filtered ? "当前筛选条件没有命中任何素材。放宽条件或清空筛选即可看到全部内容。" : "把图片、视频、音频或文档拖进这个窗口，插件会生成缩略图并把元数据存到本机；原始文件始终留在磁盘原位。"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: Overlay_module_default.stateActions,
				children: props.filtered ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: App_module_default.primaryButton,
					onClick: props.onClearQuery,
					children: "清空筛选"
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: App_module_default.primaryButton,
					onClick: props.onPickFiles,
					children: "选择文件"
				})
			}),
			!props.filtered ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: Overlay_module_default.dropHint,
				children: "也可以直接把文件拖到窗口任意位置"
			}) : null
		]
	});
}
/**
* Render skeleton cards while the library loads.
* @param props - Column count and gutter.
* @returns The skeleton element.
*/
function LoadingState(props) {
	const columnCount = Math.max(1, props.columnCount);
	const columns = Array.from({ length: columnCount }, (_, columnIndex) => columnIndex);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: Overlay_module_default.stateWrap,
		"aria-busy": "true",
		"aria-live": "polite",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: Overlay_module_default.skeletonGrid,
			style: { gap: props.gutter },
			children: columns.map((columnIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: Overlay_module_default.skeletonColumn,
				style: { gap: props.gutter },
				children: [
					0,
					1,
					2
				].map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: Overlay_module_default.skeletonCard,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Overlay_module_default.skeletonMedia,
						style: { height: 120 + (columnIndex + row) % 3 * 54 }
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Overlay_module_default.skeletonFooter,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: Overlay_module_default.skeletonLine }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: `${Overlay_module_default.skeletonLine} ${Overlay_module_default.skeletonLineShort}` })]
					})]
				}, row))
			}, columnIndex))
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			className: App_module_default.visuallyHidden,
			children: "正在载入素材库"
		})]
	});
}
/**
* Render the library error with an expandable detail block.
* @param props - Message, optional detail, and the retry callback.
* @returns The error element.
*/
function ErrorState(props) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: Overlay_module_default.stateWrap,
		role: "alert",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: Overlay_module_default.stateGlyph,
				"aria-hidden": "true",
				children: "⚠"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
				className: Overlay_module_default.stateTitle,
				children: "素材库加载失败"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: Overlay_module_default.stateBody,
				children: props.message
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: Overlay_module_default.stateActions,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: App_module_default.primaryButton,
					onClick: props.onRetry,
					children: "重试"
				})
			}),
			props.detail !== void 0 && props.detail !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
				className: Overlay_module_default.stateDetails,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", {
					className: Overlay_module_default.stateDetailsSummary,
					children: "查看详情"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
					className: Overlay_module_default.stateDetailsPre,
					children: props.detail
				})]
			}) : null
		]
	});
}
//#endregion
//#region src/client/ui/masonryLayout.ts
/** Smallest container width the gallery lays out. */
const MIN_LAYOUT_WIDTH = 120;
let cachedMasonry;
let masonryPromise;
/**
* Resolve `masonic` once per process, tolerating its absence.
* @returns The module, or `null` when the optional dependency is not installed.
*/
async function loadMasonry() {
	if (cachedMasonry !== void 0) return cachedMasonry;
	masonryPromise ??= (async () => {
		try {
			const module = await import("masonic");
			if (typeof module.useMasonry !== "function" || typeof module.usePositioner !== "function" || typeof module.useResizeObserver !== "function") return null;
			return module;
		} catch {
			return null;
		}
	})();
	cachedMasonry = await masonryPromise;
	return cachedMasonry;
}
/**
* Read the cached `masonic` verdict without triggering a load.
* @returns `undefined` while undecided, otherwise the module or `null`.
*/
function peekMasonry() {
	return cachedMasonry;
}
/**
* Split a container width into equal columns.
*
* Exported because the height calculation and the virtualised renderer must
* agree exactly on the column width; a second implementation would drift.
* @param width - Container content width in CSS pixels.
* @param minColumnWidth - Preferred minimum column width.
* @param gutter - Horizontal gap between columns.
* @param maxColumnCount - Upper bound on column count.
* @returns The column count and the resulting column width.
*/
function splitColumns(width, minColumnWidth, gutter, maxColumnCount) {
	if (!Number.isFinite(width) || width <= 0) return {
		columnCount: 1,
		columnWidth: Math.max(MIN_LAYOUT_WIDTH, minColumnWidth)
	};
	const desired = Math.floor((width + gutter) / (Math.max(minColumnWidth, 1) + gutter));
	const columnCount = Math.max(1, Math.min(desired, Math.max(1, maxColumnCount)));
	const columnWidth = Math.floor((width - gutter * (columnCount - 1)) / columnCount);
	return {
		columnCount,
		columnWidth: Math.max(1, columnWidth)
	};
}
/**
* Reserve scroll height for a virtualised grid before it has measured itself.
*
* The renderer replaces this with its own measured height, so this value only has
* to be close enough to keep the scrollbar from jumping.
* @param heights - One card height per item, already including the footer.
* @param columnCount - Column count.
* @param gutter - Vertical gap between cards.
* @returns The tallest column's height in CSS pixels.
*/
function estimateTotalHeight(heights, columnCount, gutter) {
	if (heights.length === 0) return 0;
	const columns = Math.max(1, columnCount);
	const totals = new Array(columns).fill(0);
	heights.forEach((height, index) => {
		const column = index % columns;
		totals[column] = (totals[column] ?? 0) + height + gutter;
	});
	return Math.max(0, Math.max(...totals) - gutter);
}
//#endregion
//#region src/client/ui/MasonryGrid.tsx
/**
* Masonry renderers: a `masonic`-virtualised grid and the dependency-free
* equal-width CSS grid fallback, behind one `useMasonryLayout` entry point.
*
* `VirtualMasonryGrid` is mounted only once `masonic` has resolved, so the
* hooks it calls run on every one of its renders and no renderer branch can
* perturb hook order.
*
* Card height comes from the caller's stored aspect ratio, never from a decoded
* bitmap, so a card occupies its final box while its thumbnail is still loading.
*/
/**
* Present a nullable ref as the non-nullable form React's `ref` attribute wants.
*
* A single cast at the boundary, instead of sprinkling `as` through every
* consumer that attaches the gallery's scroll ref.
* @param ref - The nullable ref created by `useRef`.
* @returns The same ref, typed for the `ref` attribute.
*/
function asRef(ref) {
	return ref;
}
/**
* Observe a container's content width and height.
*
* Width chooses the column count; height tells the virtualised renderer how many
* rows are visible.
* @param ref - Ref to the observed element.
* @returns The latest measured size, both `0` before the first measurement.
*/
function useContainerSize(ref) {
	const [size, setSize] = (0, react.useState)({
		width: 0,
		height: 0
	});
	(0, react.useEffect)(() => {
		const element = ref.current;
		if (element === null) return;
		const measure = () => {
			const width = element.clientWidth;
			const height = element.clientHeight;
			setSize((previous) => previous.width === width && previous.height === height ? previous : {
				width,
				height
			});
		};
		measure();
		if (typeof ResizeObserver === "undefined") {
			window.addEventListener("resize", measure);
			return () => window.removeEventListener("resize", measure);
		}
		const observer = new ResizeObserver(measure);
		observer.observe(element);
		return () => observer.disconnect();
	}, [ref]);
	return size;
}
/**
* Subscribe to the resolved `masonic` channel.
* @returns `undefined` while undecided, otherwise the module or `null`.
*/
function useMasonryModule() {
	const [module, setModule] = (0, react.useState)(() => peekMasonry());
	(0, react.useEffect)(() => {
		let live = true;
		loadMasonry().then((resolved) => {
			if (live) setModule(resolved);
		});
		return () => {
			live = false;
		};
	}, []);
	return module;
}
/**
* Render items through `masonic`'s virtualised grid.
* @param props - Items, geometry, and the card renderer.
* @returns The virtualised grid element, or `null` while the module is missing.
*/
function VirtualMasonryGrid(props) {
	const module = useMasonryModule();
	const { scrollRef, items, itemKey, itemRevision, columnCount, columnWidth, gutter, cardHeightAt } = props;
	const { height: viewportHeight } = useContainerSize(scrollRef);
	const [scrollTop, setScrollTop] = (0, react.useState)(0);
	(0, react.useEffect)(() => {
		const element = scrollRef.current;
		if (element === null) return;
		const onScroll = () => setScrollTop(element.scrollTop);
		onScroll();
		element.addEventListener("scroll", onScroll, { passive: true });
		return () => element.removeEventListener("scroll", onScroll);
	}, [scrollRef]);
	const positioner = module?.usePositioner({
		width: Math.max(columnWidth * columnCount + gutter * (columnCount - 1), columnWidth),
		columnWidth,
		columnGutter: gutter,
		rowGutter: gutter,
		columnCount
	});
	const resizeObserver = module == null || positioner === void 0 ? void 0 : module.useResizeObserver(positioner);
	const renderCard = (0, react.useRef)(props.renderCard);
	renderCard.current = props.renderCard;
	const render = (0, react.useCallback)((cell) => renderCard.current({
		item: cell.data,
		index: cell.index,
		width: cell.width
	}), []);
	const key = (0, react.useCallback)((item, index) => `${itemKey(item, index)}#${itemRevision(item, index)}`, [itemKey, itemRevision]);
	const reservedHeight = estimateTotalHeight(items.map((_, index) => cardHeightAt(index, columnWidth)), columnCount, gutter);
	const onTotalHeight = props.onTotalHeight;
	const previousHeight = (0, react.useRef)(-1);
	(0, react.useEffect)(() => {
		if (previousHeight.current === reservedHeight) return;
		previousHeight.current = reservedHeight;
		onTotalHeight(reservedHeight);
	}, [reservedHeight, onTotalHeight]);
	if (module == null || positioner === void 0 || resizeObserver === void 0) return null;
	return module.useMasonry({
		positioner,
		resizeObserver,
		items,
		height: viewportHeight,
		scrollTop,
		itemKey: key,
		overscanBy: 2,
		itemHeightEstimate: cardHeightAt(props.estimateIndex, columnWidth) + 64,
		render
	});
}
/**
* Lay items into balanced columns without virtualisation.
*
* Each item joins the column with the fewest items, which reproduces the ragged
* masonry rhythm with no measurement at all.
* @param props - Column count, gutter, and one element per item.
* @returns A flex row of column stacks.
*/
function CssMasonryGrid(props) {
	const columnCount = Math.max(1, props.columnCount);
	const columns = (0, react.useMemo)(() => {
		const buckets = Array.from({ length: columnCount }, () => []);
		(props.children ?? []).forEach((child, index) => {
			buckets[index % columnCount]?.push(child);
		});
		return buckets;
	}, [props.children, columnCount]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		style: {
			display: "flex",
			alignItems: "flex-start",
			gap: props.gutter
		},
		children: columns.map((column, columnIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			style: {
				display: "flex",
				flexDirection: "column",
				gap: props.gutter,
				flex: "1 1 0",
				minWidth: 0
			},
			children: column
		}, columnIndex))
	});
}
/**
* Own the gallery's scroll ref, geometry, and renderer choice.
* @param itemCount - Number of items, used to seed the reserved scroll height.
* @param options - Column, gutter, card-height, key, and card-render settings.
* @returns A handle exposing the scroll ref, geometry, and item renderer.
*/
function useMasonryLayout(itemCount, options) {
	const scrollRef = (0, react.useRef)(null);
	const { minColumnWidth, gutter, maxColumnCount = 4, cardHeightAt, itemKey, itemRevision, renderCard } = options;
	const estimateIndex = options.estimateIndex ?? 0;
	const { width } = useContainerSize(scrollRef);
	const module = useMasonryModule();
	const [measuredHeight, setMeasuredHeight] = (0, react.useState)(0);
	const { columnCount, columnWidth } = splitColumns(width, minColumnWidth, gutter, maxColumnCount);
	const variant = module != null && typeof ResizeObserver !== "undefined" && width > 0 ? "virtualized" : "grid";
	const estimatedHeight = (0, react.useMemo)(() => {
		const heights = [];
		for (let index = 0; index < itemCount; index += 1) heights.push(cardHeightAt(index, columnWidth));
		return estimateTotalHeight(heights, columnCount, gutter);
	}, [
		itemCount,
		cardHeightAt,
		columnWidth,
		columnCount,
		gutter
	]);
	const totalHeight = variant === "virtualized" ? measuredHeight || estimatedHeight : 0;
	const renderCardRef = (0, react.useRef)(renderCard);
	renderCardRef.current = renderCard;
	const onMeasured = (0, react.useCallback)((height) => {
		setMeasuredHeight((previous) => previous === height ? previous : height);
	}, []);
	const renderItems = (0, react.useCallback)((items) => {
		if (variant === "virtualized") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VirtualMasonryGrid, {
			scrollRef,
			items,
			itemKey,
			itemRevision,
			columnCount,
			columnWidth,
			gutter,
			cardHeightAt,
			estimateIndex,
			renderCard: (cell) => renderCardRef.current(cell),
			onTotalHeight: onMeasured
		}, `al-grid:${items.length}:${columnCount}:${columnWidth}`);
		return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CssMasonryGrid, {
			columnCount,
			gutter,
			children: items.map((item, index) => renderCardRef.current({
				item,
				index,
				width: columnWidth
			}))
		});
	}, [
		variant,
		itemKey,
		itemRevision,
		columnCount,
		columnWidth,
		gutter,
		cardHeightAt,
		estimateIndex,
		onMeasured
	]);
	(0, react.useEffect)(() => {
		setMeasuredHeight(0);
	}, [
		columnWidth,
		columnCount,
		itemCount
	]);
	return {
		scrollRef: asRef(scrollRef),
		geometry: {
			variant,
			columnCount,
			columnWidth,
			gutter,
			totalHeight
		},
		renderItems
	};
}
/** Height a card adds below its media box: border, padding, and the footer row. */
const FOOTER_HEIGHT = 40;
/** Mask bounds, in percent. */
const MASK_MIN = 0;
const MASK_MAX = 90;
/**
* Render the gallery.
* @param props - Assets, selection, and every action the gallery can raise.
* @returns The gallery surface with its card-level overlays.
*/
function Gallery(props) {
	const { assets, loading, error, query, selected } = props;
	const [menu, setMenu] = (0, react.useState)(null);
	const originalCap = props.originalCap ?? 67108864;
	const wallpaperUrl = props.wallpaperUrl;
	const wallpaperMask = clampMask(props.wallpaperMask ?? 35);
	const selectedSet = (0, react.useMemo)(() => new Set(selected), [selected]);
	const selectionRef = (0, react.useRef)(selected);
	selectionRef.current = selected;
	const anchorRef = (0, react.useRef)(null);
	const indexOf = (0, react.useMemo)(() => {
		const map = /* @__PURE__ */ new Map();
		assets.forEach((asset, index) => map.set(asset.id, index));
		return map;
	}, [assets]);
	const indexOfRef = (0, react.useRef)(indexOf);
	indexOfRef.current = indexOf;
	const selectRef = props.onSelect;
	const openRef = props.onOpen;
	const handleSelect = (0, react.useCallback)((asset, modifiers) => {
		const index = indexOfRef.current.get(asset.id) ?? 0;
		if (modifiers.range && anchorRef.current !== null) {
			const from = Math.min(anchorRef.current, index);
			const to = Math.max(anchorRef.current, index);
			const ids = selectionRef.current.slice();
			for (let cursor = from; cursor <= to; cursor += 1) {
				const id = assets[cursor]?.id;
				if (id !== void 0 && !ids.includes(id)) ids.push(id);
			}
			selectRef(ids, anchorRef.current);
			return;
		}
		const next = selectionRef.current.includes(asset.id) ? selectionRef.current.filter((id) => id !== asset.id) : [...selectionRef.current, asset.id];
		anchorRef.current = index;
		selectRef(next, index);
	}, [assets, selectRef]);
	const handleMore = (0, react.useCallback)((asset, anchor) => {
		setMenu({
			asset,
			anchor
		});
	}, []);
	const cardHeightAt = (0, react.useCallback)((index, columnWidth) => {
		const asset = assets[index];
		if (asset === void 0) return columnWidth;
		return cardMediaHeight(asset, columnWidth) + FOOTER_HEIGHT;
	}, [assets]);
	const itemRevision = (0, react.useCallback)((item) => {
		const asset = item;
		return [
			selectedSet.has(asset.id) ? "s1" : "s0",
			query.text,
			asset.favorite ? "f1" : "f0",
			asset.rating,
			asset.status,
			asset.name,
			asset.tags.join(","),
			asset.lastCheckedAt
		].join("|");
	}, [selectedSet, query.text]);
	const itemKey = (0, react.useCallback)((item, index) => {
		return item?.id ?? `al-item-${index}`;
	}, []);
	const renderCard = (0, react.useCallback)((cell) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AssetCard, {
		asset: cell.item,
		width: cell.width,
		index: cell.index,
		selected: selectedSet.has(cell.item.id),
		query: query.text,
		originalCap,
		onOpen: openRef,
		onSelect: handleSelect,
		onToggleFavorite: props.onToggleFavorite,
		onRate: props.onRate,
		onReference: props.onReference,
		onMore: handleMore
	}), [
		selectedSet,
		query.text,
		originalCap,
		openRef,
		handleSelect,
		handleMore,
		props.onToggleFavorite,
		props.onRate,
		props.onReference
	]);
	const layout = useMasonryLayout(assets.length, {
		minColumnWidth: 220,
		gutter: 22,
		maxColumnCount: 4,
		estimateIndex: 0,
		cardHeightAt,
		itemKey,
		itemRevision,
		renderCard
	});
	const closeMenu = (0, react.useCallback)(() => setMenu(null), []);
	const openAsset = props.openId === null ? void 0 : assets.find((item) => item.id === props.openId);
	const openIndex = openAsset === void 0 ? -1 : indexOf.get(openAsset.id) ?? -1;
	if (loading) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		className: Gallery_module_default.scroller,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LoadingState, {
			columnCount: 4,
			gutter: 22
		})
	});
	if (error !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		className: Gallery_module_default.scroller,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ErrorState, {
			message: error,
			detail: props.errorDetail,
			onRetry: props.onRetry
		})
	});
	if (assets.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		className: Gallery_module_default.scroller,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, {
			filtered: props.hasAnyAssets,
			onPickFiles: props.onPickFiles,
			onClearQuery: () => props.onQueryPatch({
				text: "",
				kinds: [],
				tags: [],
				from: null,
				to: null,
				favoriteOnly: false,
				minRating: 0
			})
		})
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: Gallery_module_default.stage,
			children: [wallpaperUrl === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: Gallery_module_default.wallpaper,
				"aria-hidden": "true",
				style: { "--al-wallpaper": `url("${wallpaperUrl}")` }
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: Gallery_module_default.wallpaperMask,
				"aria-hidden": "true",
				style: { "--al-wallpaper-mask": String(wallpaperMask / 100) }
			})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: Gallery_module_default.scroller,
				ref: layout.scrollRef,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: Gallery_module_default.gridSurface,
					style: { minHeight: layout.geometry.totalHeight > 0 ? layout.geometry.totalHeight : void 0 },
					children: layout.geometry.variant === "grid" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CssMasonryGrid, {
						columnCount: layout.geometry.columnCount,
						gutter: 22,
						children: assets.map((asset, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: renderCard({
							item: asset,
							index,
							width: layout.geometry.columnWidth
						}) }, asset.id))
					}) : layout.renderItems(assets)
				})
			})]
		}),
		menu !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardMenu, {
			asset: menu.asset,
			anchor: menu.anchor,
			onClose: closeMenu,
			onReference: props.onReference,
			onToggleFavorite: props.onToggleFavorite,
			onRename: props.onRename,
			onToggleTag: props.onToggleTag,
			onRecheck: props.onRecheck,
			onRelocate: props.onRelocate,
			onRequestRelocate: props.onRequestRelocate,
			onOpenSystem: props.onOpenSystem,
			onDelete: (asset) => props.onDelete([asset])
		}) : null,
		openAsset !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Lightbox, {
			asset: openAsset,
			position: openIndex + 1,
			total: assets.length,
			onPrevious: openIndex > 0 ? () => props.onOpenStep(assets[openIndex - 1]) : void 0,
			onNext: openIndex >= 0 && openIndex < assets.length - 1 ? () => props.onOpenStep(assets[openIndex + 1]) : void 0,
			onClose: props.onCloseLightbox,
			onReference: props.onReference,
			onOpenSystem: props.onOpenSystem
		}) : null
	] });
}
/**
* Clamp a wallpaper mask strength into the supported range.
* @param percent - Requested strength in percent, possibly out of range.
* @returns The strength in percent, between 0 and 90.
*/
function clampMask(percent) {
	if (!Number.isFinite(percent)) return 35;
	return Math.min(MASK_MAX, Math.max(MASK_MIN, Math.round(percent)));
}
//#endregion
//#region src/client/ui/ImportProgress.tsx
/**
* Per-file import progress.
*
* Every file the store is working on appears here with its current phase, and a
* failure stays visible with its reason instead of disappearing, so a silent
* import is never possible.
*/
/** Short Chinese labels for the store's import phases. */
const PHASE_LABEL = {
	queued: "排队",
	hashing: "校验",
	thumb: "缩略图",
	writing: "写入",
	done: "完成",
	duplicate: "重复",
	failed: "失败"
};
/**
* Render the import progress panel.
* @param props - Events, running flag, and the dismiss callback.
* @returns The progress panel, or `null` when there is nothing to show.
*/
function ImportProgress(props) {
	const [collapsed, setCollapsed] = (0, react.useState)(false);
	const { events, running } = props;
	if (events.length === 0) return null;
	const failed = events.filter((event) => event.phase === "failed").length;
	const done = events.filter((event) => event.phase === "done").length;
	const title = running ? `正在导入 ${events.length} 个文件…` : failed > 0 ? `导入结束：${done} 成功，${failed} 失败` : `已导入 ${done} 个文件`;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
		className: Overlay_module_default.progressPanel,
		"aria-live": "polite",
		"aria-label": "导入进度",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: Overlay_module_default.progressHead,
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: Overlay_module_default.progressTitle,
					children: title
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: Overlay_module_default.progressToggle,
					"aria-expanded": !collapsed,
					onClick: () => setCollapsed((value) => !value),
					children: collapsed ? "展开" : "收起"
				}),
				!running ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: Overlay_module_default.progressToggle,
					onClick: props.onDismiss,
					children: "关闭"
				}) : null
			]
		}), !collapsed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
			className: Overlay_module_default.progressList,
			children: events.map((event, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: `${Overlay_module_default.progressRow} ${event.phase === "failed" ? Overlay_module_default.progressRowFailed : ""}`,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `${Overlay_module_default.progressPhase} ${event.phase === "failed" ? Overlay_module_default.progressPhaseFailed : ""}`,
						children: PHASE_LABEL[event.phase] ?? event.phase
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: Overlay_module_default.progressName,
						title: event.path,
						children: event.name
					}),
					event.error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: Overlay_module_default.progressError,
						children: event.error
					}) : null
				]
			}, `${event.path}:${index}`))
		}) : null]
	});
}
//#endregion
//#region src/client/ui/ImportZone.tsx
/**
* Import affordances: the panel's call-to-action, the file picker, and the
* whole-window drop fallback.
*
* Files are only collected here. Hashing, thumbnailing, and persistence belong
* to the store, which the panel calls through `onFiles`.
*/
/**
* Render the import call-to-action and arm the window-wide drop target.
* @param props - Drop handler, busy flag, and library emptiness.
* @returns The import bar plus, while dragging, a full-window drop hint.
*/
function ImportZone(props) {
	const inputRef = (0, react.useRef)(null);
	const dragDepth = (0, react.useRef)(0);
	const [dragging, setDragging] = (0, react.useState)(false);
	const onFilesRef = (0, react.useRef)(props.onFiles);
	onFilesRef.current = props.onFiles;
	const accept = (0, react.useCallback)((list) => {
		if (list === null) return;
		const files = Array.isArray(list) ? list : Array.from(list);
		if (files.length === 0) return;
		onFilesRef.current(files);
	}, []);
	(0, react.useEffect)(() => {
		const onEnter = (event) => {
			if (!hasFiles(event)) return;
			dragDepth.current += 1;
			setDragging(true);
		};
		const onOver = (event) => {
			if (!hasFiles(event)) return;
			event.preventDefault();
			if (event.dataTransfer !== null) event.dataTransfer.dropEffect = "copy";
		};
		const onLeave = () => {
			dragDepth.current = Math.max(0, dragDepth.current - 1);
			if (dragDepth.current === 0) setDragging(false);
		};
		const onDrop = (event) => {
			if (!hasFiles(event)) return;
			event.preventDefault();
			dragDepth.current = 0;
			setDragging(false);
			accept(event.dataTransfer?.files ?? null);
		};
		window.addEventListener("dragenter", onEnter);
		window.addEventListener("dragover", onOver);
		window.addEventListener("dragleave", onLeave);
		window.addEventListener("drop", onDrop);
		return () => {
			window.removeEventListener("dragenter", onEnter);
			window.removeEventListener("dragover", onOver);
			window.removeEventListener("dragleave", onLeave);
			window.removeEventListener("drop", onDrop);
		};
	}, [accept]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: App_module_default.importBar,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: App_module_default.primaryButton,
				disabled: props.busy,
				onClick: () => inputRef.current?.click(),
				children: props.empty ? "选择文件" : "继续添加"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: App_module_default.countLabel,
				children: "或把文件拖到窗口任意位置"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
				ref: inputRef,
				className: App_module_default.visuallyHidden,
				type: "file",
				multiple: true,
				tabIndex: -1,
				"aria-hidden": "true",
				onChange: (event) => {
					accept(event.target.files);
					event.target.value = "";
				}
			})
		]
	}), dragging ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		style: {
			position: "absolute",
			inset: 0,
			zIndex: 55,
			display: "grid",
			placeItems: "center",
			pointerEvents: "none",
			background: "var(--dsw-alias-bg-mask-1)"
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			style: {
				padding: "18px 28px",
				border: "2px dashed var(--dsw-alias-state-business-primary)",
				borderRadius: 14,
				background: "var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-1))",
				color: "var(--dsw-alias-label-primary)",
				fontSize: "var(--dsw-font-s-14)"
			},
			children: "松开以导入素材"
		})
	}) : null] });
}
/**
* Whether a drag payload carries files, as opposed to text or a URL.
* @param event - The drag event.
* @returns True when the payload advertises at least one file.
*/
function hasFiles(event) {
	const types = event.dataTransfer?.types;
	if (types === void 0) return false;
	return Array.from(types).includes("Files");
}
//#endregion
//#region src/client/ui/SettingsPopover.tsx
/**
* Settings popover for the thumbnail and import knobs.
*
* Every field writes through `onChange` with a validated value, so a half-typed
* number never reaches the store: the field keeps its own text and only commits
* when the parsed result is a usable number.
*/
/** Largest wallpaper accepted locally, mirroring the store's own limit. */
const WALLPAPER_MAX_BYTES = 20971520;
/**
* Render the settings popover.
* @param props - Settings, patch callback, close callback, and cache stats.
* @returns The popover element.
*/
function SettingsPopover(props) {
	const ref = (0, react.useRef)(null);
	const fileRef = (0, react.useRef)(null);
	const [wallpaperNotice, setWallpaperNotice] = (0, react.useState)(null);
	const { onClose } = props;
	(0, react.useEffect)(() => {
		const onKey = (event) => {
			if (event.key === "Escape") onClose();
		};
		const onPointer = (event) => {
			if (event.target instanceof Node && ref.current !== null && !ref.current.contains(event.target)) onClose();
		};
		document.addEventListener("keydown", onKey);
		document.addEventListener("pointerdown", onPointer, true);
		return () => {
			document.removeEventListener("keydown", onKey);
			document.removeEventListener("pointerdown", onPointer, true);
		};
	}, [onClose]);
	/**
	* Validate one picked wallpaper before the store sees it.
	*
	* The same limits are enforced again in the store; checking here keeps the
	* failure next to the control the user just used.
	* @param file - The chosen local image.
	*/
	const acceptWallpaper = (0, react.useCallback)((file) => {
		if (file === void 0) return;
		if (!file.type.startsWith("image/")) {
			setWallpaperNotice(`只支持图片作为壁纸（收到 ${file.type || "未知类型"}）`);
			return;
		}
		if (file.size > WALLPAPER_MAX_BYTES) {
			setWallpaperNotice(`壁纸最大 20 MB，这张是 ${(file.size / 1024 / 1024).toFixed(1)} MB`);
			return;
		}
		setWallpaperNotice(null);
		props.onPickWallpaper(file);
	}, [props]);
	const commitNumber = (0, react.useCallback)((key, min, max, integer) => (raw) => {
		const parsed = Number(raw);
		if (!Number.isFinite(parsed)) return;
		const clamped = Math.min(Math.max(parsed, min), max);
		props.onChange({ [key]: integer ? Math.round(clamped) : clamped });
	}, [props.onChange, props]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: Overlay_module_default.popover,
		ref,
		role: "dialog",
		"aria-label": "设置",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: Overlay_module_default.popoverTitle,
				children: "画廊外观"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Overlay_module_default.field,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Overlay_module_default.fieldRow,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "展墙壁纸" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Overlay_module_default.fieldValue,
							children: props.hasWallpaper ? "已自定义" : "默认背景"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Overlay_module_default.wallpaperActions,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								ref: fileRef,
								className: Overlay_module_default.visuallyHidden,
								type: "file",
								accept: "image/*",
								tabIndex: -1,
								"aria-hidden": "true",
								onChange: (event) => {
									acceptWallpaper(event.target.files?.[0]);
									event.target.value = "";
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: Overlay_module_default.ghostButton,
								disabled: !props.editable,
								onClick: () => fileRef.current?.click(),
								children: "选择本机图片"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: Overlay_module_default.ghostButton,
								disabled: !props.editable || !props.hasWallpaper,
								onClick: () => {
									setWallpaperNotice(null);
									props.onClearWallpaper();
								},
								children: "恢复默认"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: Overlay_module_default.fieldValue,
						children: "单张 ≤ 20 MB，仅铺展墙、不挡住工具条。"
					})
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Overlay_module_default.field,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: Overlay_module_default.fieldRow,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "遮罩强度" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: Overlay_module_default.fieldValue,
						children: [Math.round(props.settings.wallpaperMask), "%"]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					className: Overlay_module_default.range,
					type: "range",
					min: 0,
					max: 90,
					step: 5,
					disabled: !props.editable,
					value: props.settings.wallpaperMask,
					"aria-label": "壁纸遮罩强度",
					onChange: (event) => props.onChange({ wallpaperMask: Number(event.target.value) })
				})]
			}),
			wallpaperNotice !== null || props.errorText !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: Overlay_module_default.fieldError,
				role: "alert",
				children: wallpaperNotice ?? props.errorText
			}) : null,
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: Overlay_module_default.popoverTitle,
				children: "导入与缩略图"
			}),
			!props.editable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: Overlay_module_default.fieldValue,
				children: "当前宿主未提供设置写入通道，以下数值为只读展示。"
			}) : null,
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Overlay_module_default.field,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: Overlay_module_default.fieldRow,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "缩略图长边" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: Overlay_module_default.fieldValue,
						children: [props.settings.thumbMaxEdge, " px"]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					className: Overlay_module_default.range,
					type: "range",
					min: 128,
					max: 1024,
					step: 32,
					disabled: !props.editable,
					value: props.settings.thumbMaxEdge,
					"aria-label": "缩略图长边",
					onChange: (event) => commitNumber("thumbMaxEdge", 128, 1024, true)(event.target.value)
				})]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Overlay_module_default.field,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: Overlay_module_default.fieldRow,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "缩略图质量" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: Overlay_module_default.fieldValue,
						children: props.settings.thumbQuality.toFixed(2)
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					className: Overlay_module_default.range,
					type: "range",
					min: .3,
					max: 1,
					step: .05,
					disabled: !props.editable,
					value: props.settings.thumbQuality,
					"aria-label": "缩略图质量",
					onChange: (event) => commitNumber("thumbQuality", .3, 1, false)(event.target.value)
				})]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberField, {
				label: "单文件导入上限",
				suffix: "MB",
				value: Math.round(props.settings.maxImportBytes / 1024 / 1024),
				min: 1,
				disabled: !props.editable,
				onCommit: (value) => props.onChange({ maxImportBytes: value * 1024 * 1024 })
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberField, {
				label: "单次响应上限",
				suffix: "MB",
				value: Math.round(props.settings.routeMaxBytes / 1024 / 1024),
				min: 1,
				disabled: !props.editable,
				onCommit: (value) => props.onChange({ routeMaxBytes: value * 1024 * 1024 })
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberField, {
				label: "视频取帧位置",
				suffix: `（${props.settings.videoSeekRatio.toFixed(2)}）`,
				value: Math.round(props.settings.videoSeekRatio * 100),
				min: 0,
				max: 100,
				disabled: !props.editable,
				onCommit: (value) => props.onChange({ videoSeekRatio: Math.min(Math.max(value / 100, 0), 1) })
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberField, {
				label: "视频取帧超时",
				suffix: "ms",
				value: props.settings.videoTimeoutMs,
				min: 200,
				disabled: !props.editable,
				onCommit: (value) => props.onChange({ videoTimeoutMs: Math.max(200, value) })
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: Overlay_module_default.popoverTitle,
				children: [
					"已存 ",
					props.assetCount,
					" 项缩略图，约 ",
					formatMegabytes(props.thumbBytes)
				]
			})
		]
	});
}
/**
* Render a labelled integer input that commits only validated values.
* @param props - Label, unit, value, bounds, and commit callback.
* @returns The field row.
*/
function NumberField(props) {
	const [text, setText] = (0, react.useState)(String(props.value));
	const focused = (0, react.useRef)(false);
	(0, react.useEffect)(() => {
		if (!focused.current) setText(String(props.value));
	}, [props.value]);
	const commit = () => {
		const parsed = Number(text);
		if (!Number.isFinite(parsed)) {
			setText(String(props.value));
			return;
		}
		const min = props.min ?? Number.NEGATIVE_INFINITY;
		const max = props.max ?? Number.POSITIVE_INFINITY;
		props.onCommit(Math.round(Math.min(Math.max(parsed, min), max)));
	};
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: Overlay_module_default.field,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: Overlay_module_default.fieldRow,
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: props.label }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: Overlay_module_default.fieldValue,
				children: props.suffix
			})]
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
			className: Overlay_module_default.fieldInput,
			type: "number",
			inputMode: "numeric",
			"aria-label": props.label,
			value: text,
			disabled: props.disabled,
			onFocus: () => {
				focused.current = true;
			},
			onChange: (event) => setText(event.target.value),
			onBlur: () => {
				focused.current = false;
				commit();
			},
			onKeyDown: (event) => {
				if (event.key === "Enter") commit();
			}
		})]
	});
}
/**
* Format a byte count as whole megabytes for the cache summary.
* @param bytes - Stored thumbnail bytes.
* @returns A string such as `4.2 MB`.
*/
function formatMegabytes(bytes) {
	if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
	const mb = bytes / 1024 / 1024;
	return mb < 1 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${mb.toFixed(1)} MB`;
}
/** Fixed time windows offered by the time-range chips. */
const TIME_RANGES = [
	"today",
	"week",
	"month",
	"earlier",
	"custom"
];
/** Labels for the time-range chips and the sort select. */
const TIME_LABEL = {
	today: "今天",
	week: "本周",
	month: "本月",
	earlier: "更早",
	custom: "自定义"
};
const SORT_LABEL = {
	importedAt: "导入时间",
	name: "名称",
	size: "大小",
	rating: "评分"
};
/**
* Render the control bar.
* @param props - Query state, counts, and change callbacks.
* @returns The toolbar element.
*/
function Toolbar(props) {
	const { query } = props;
	const [text, setText] = (0, react.useState)(query.text);
	const debouncedText = useDebouncedValue(text, 120);
	const [customFrom, setCustomFrom] = (0, react.useState)("");
	const [customTo, setCustomTo] = (0, react.useState)("");
	const lastPushed = (0, react.useRef)(query.text);
	(0, react.useEffect)(() => {
		if (query.text === lastPushed.current) return;
		lastPushed.current = query.text;
		setText(query.text);
	}, [query.text]);
	(0, react.useEffect)(() => {
		if (debouncedText === lastPushed.current) return;
		lastPushed.current = debouncedText;
		props.onQuery({ text: debouncedText });
	}, [debouncedText]);
	const toggleKind = (kind) => {
		const kinds = query.kinds.includes(kind) ? query.kinds.filter((item) => item !== kind) : [...query.kinds, kind];
		props.onQuery({ kinds });
	};
	const toggleTag = (tag) => {
		const tags = query.tags.includes(tag) ? query.tags.filter((item) => item !== tag) : [...query.tags, tag];
		props.onQuery({ tags });
	};
	const applyCustomRange = (next) => {
		const from = next.from ?? customFrom;
		const to = next.to ?? customTo;
		setCustomFrom(from);
		setCustomTo(to);
		props.onQuery({
			from: from === "" ? null : (/* @__PURE__ */ new Date(`${from}T00:00:00`)).getTime(),
			to: to === "" ? null : (/* @__PURE__ */ new Date(`${to}T23:59:59.999`)).getTime()
		});
	};
	const visibleTags = (0, react.useMemo)(() => props.allTags.slice(0, 24), [props.allTags]);
	const sorting = `${query.sort}:${query.desc ? "desc" : "asc"}`;
	const allKinds = query.kinds.length === 0;
	const curationOpen = props.curationOpen === true;
	const curationActive = props.activeTimeRange !== null || query.tags.length > 0 || query.favoriteOnly || query.minRating > 0;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: App_module_default.toolbar,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: App_module_default.toolbarRow,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: App_module_default.searchWrap,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: App_module_default.searchIcon,
								"aria-hidden": "true",
								children: "⌕"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: App_module_default.searchInput,
								type: "search",
								value: text,
								placeholder: "搜索名称与标签…",
								"aria-label": "搜索素材",
								onChange: (event) => setText(event.target.value)
							}),
							text !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: App_module_default.searchClear,
								"aria-label": "清空搜索",
								onClick: () => setText(""),
								children: "✕"
							}) : null
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: App_module_default.iconButton,
						"aria-pressed": props.selecting,
						onClick: props.onToggleSelecting,
						children: props.selecting ? `已选 ${props.selectedCount}` : "多选"
					}),
					props.selecting && props.selectedCount > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: App_module_default.iconButton,
						onClick: props.onClearSelection,
						children: "清空"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: App_module_default.dangerButton,
						onClick: props.onRequestRemoveSelected,
						children: "移出素材库"
					})] }) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: App_module_default.spacer }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: App_module_default.countLabel,
						children: props.matchCount === props.totalCount ? `${props.totalCount} 项` : `${props.matchCount} / ${props.totalCount} 项`
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: App_module_default.primaryButton,
						disabled: props.importing,
						onClick: props.onPickFiles,
						children: props.importing ? "导入中…" : "导入素材"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: App_module_default.settingsAnchor,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: App_module_default.iconButton,
							"aria-pressed": props.settingsOpen,
							"aria-label": "设置（含画廊外观）",
							onClick: props.onToggleSettings,
							children: "⚙"
						})
					})
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: App_module_default.toolbarRow,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: App_module_default.chipGroupLabel,
						children: "类型"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: App_module_default.chipGroup,
						role: "group",
						"aria-label": "按类型筛选",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: `${App_module_default.chip} ${allKinds ? App_module_default.chipActive : ""}`,
							"aria-pressed": allKinds,
							onClick: () => props.onQuery({ kinds: [] }),
							children: "全部"
						}), ASSET_KINDS.map((kind) => {
							const active = query.kinds.includes(kind);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: `${App_module_default.chip} ${active ? App_module_default.chipActive : ""}`,
								"aria-pressed": active,
								onClick: () => toggleKind(kind),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: App_module_default.chipGlyph,
									"aria-hidden": "true",
									children: kindGlyph(kind)
								}), kindLabel(kind)]
							}, kind);
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: App_module_default.spacer }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: `${App_module_default.iconButton} ${curationActive && !curationOpen ? App_module_default.iconButtonFlagged : ""}`,
						"aria-expanded": curationOpen,
						"aria-controls": "al-curation",
						onClick: props.onToggleCuration,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								children: curationOpen ? "▴" : "▾"
							}),
							" 策展筛选",
							curationActive && !curationOpen ? " •" : ""
						]
					})
				]
			}),
			curationOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: App_module_default.curation,
				id: "al-curation",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: App_module_default.toolbarRow,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: App_module_default.chipGroupLabel,
								children: "时间"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: App_module_default.chipGroup,
								role: "group",
								"aria-label": "按时间范围筛选",
								children: TIME_RANGES.map((range) => {
									const active = props.activeTimeRange === range;
									return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: `${App_module_default.chip} ${active ? App_module_default.chipActive : ""}`,
										"aria-pressed": active,
										onClick: () => props.onTimeRange(active ? null : range),
										children: TIME_LABEL[range]
									}, range);
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: App_module_default.spacer }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: `${App_module_default.chip} ${query.favoriteOnly ? App_module_default.chipActive : ""}`,
								"aria-pressed": query.favoriteOnly,
								onClick: () => props.onQuery({ favoriteOnly: !query.favoriteOnly }),
								children: "★ 仅收藏"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: App_module_default.chipGroupLabel,
								children: "评分"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: App_module_default.chipGroup,
								role: "group",
								"aria-label": "按最低评分筛选",
								children: [
									0,
									3,
									4,
									5
								].map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: `${App_module_default.chip} ${query.minRating === value ? App_module_default.chipActive : ""}`,
									"aria-pressed": query.minRating === value,
									onClick: () => props.onQuery({ minRating: value }),
									children: value === 0 ? "不限" : `${value}★+`
								}, value))
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: App_module_default.toolbarRow,
						children: [
							props.missingCount > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: App_module_default.chip,
								onClick: props.onRecheckMissing,
								children: [
									"重新检查 ",
									props.missingCount,
									" 个缺失文件"
								]
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: App_module_default.spacer }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								className: App_module_default.chipGroupLabel,
								htmlFor: "al-sort",
								children: "排序"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
								id: "al-sort",
								className: App_module_default.select,
								value: sorting,
								onChange: (event) => {
									const [sort, direction] = event.target.value.split(":");
									props.onQuery({
										sort,
										desc: direction === "desc"
									});
								},
								children: Object.keys(SORT_LABEL).flatMap((sort) => [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
									value: `${sort}:desc`,
									children: [SORT_LABEL[sort], " ↓"]
								}, `${sort}:desc`), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
									value: `${sort}:asc`,
									children: [SORT_LABEL[sort], " ↑"]
								}, `${sort}:asc`)])
							})
						]
					}),
					visibleTags.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: App_module_default.toolbarRow,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: App_module_default.chipGroupLabel,
							children: "标签"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: App_module_default.chipGroup,
							role: "group",
							"aria-label": "按标签筛选",
							children: visibleTags.map((tag) => {
								const active = query.tags.includes(tag);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: `${App_module_default.chip} ${active ? App_module_default.chipActive : ""}`,
									"aria-pressed": active,
									onClick: () => toggleTag(tag),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Highlight, {
										text: tag,
										query: query.text
									})
								}, tag);
							})
						})]
					}) : null,
					props.activeTimeRange === "custom" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: App_module_default.toolbarRow,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: App_module_default.chipGroupLabel,
								children: "自定义"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: App_module_default.dateInput,
								type: "date",
								"aria-label": "起始日期",
								value: customFrom,
								onChange: (event) => applyCustomRange({ from: event.target.value })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: App_module_default.chipGroupLabel,
								children: "至"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: App_module_default.dateInput,
								type: "date",
								"aria-label": "结束日期",
								value: customTo,
								onChange: (event) => applyCustomRange({ to: event.target.value })
							})
						]
					}) : null
				]
			}) : null
		]
	});
}
/**
* Rank the tags in use, most frequent first.
*
* Frequency ordering keeps the chips that actually partition the library at the
* front of a single-line strip; the name breaks ties deterministically.
* @param assets - Assets to collect from.
* @returns Tag names, most used first.
*/
function collectTags(assets) {
	const counts = /* @__PURE__ */ new Map();
	for (const asset of assets) for (const tag of asset.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
	return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).map(([tag]) => tag);
}
//#endregion
//#region src/client/ui/useDuplicateResolution.ts
/**
* Duplicate-resolution queue for the import pipeline.
*
* `store.importFiles` asks for a verdict through a callback that returns a
* promise, and it may ask again for a later file before the first verdict
* arrives. This hook keeps its own FIFO of pending collisions and exposes
* exactly one at a time, so a slow decision can never overwrite a pending prompt
* or lose a queued one.
*
* All ordering state lives in refs while the visible prompt lives in `useState`;
* the promise executors never touch state, which keeps the store's callbacks
* outside React's render phase.
*/
/**
* Manage duplicate prompts for one import run.
* @returns The pending prompt, its queue depth, and the store callback.
*/
function useDuplicateResolution() {
	const queue = (0, react.useRef)([]);
	const resolvers = (0, react.useRef)(/* @__PURE__ */ new Map());
	const nextId = (0, react.useRef)(1);
	const [version, setVersion] = (0, react.useState)(0);
	const settleHead = (0, react.useCallback)((choice) => {
		const entry = queue.current.shift();
		if (entry === void 0) return;
		const resolver = resolvers.current.get(entry.id);
		resolvers.current.delete(entry.id);
		resolver?.(choice);
	}, []);
	const onDuplicate = (0, react.useCallback)((asset, file) => {
		const id = nextId.current;
		nextId.current += 1;
		queue.current.push({
			id,
			request: {
				existing: asset,
				incoming: file
			}
		});
		const promise = new Promise((resolve) => {
			resolvers.current.set(id, resolve);
		});
		setVersion((value) => value + 1);
		return promise;
	}, []);
	const resolve = (0, react.useCallback)((choice, applyToAll) => {
		if (queue.current.length === 0) return;
		settleHead(choice);
		if (applyToAll) while (queue.current.length > 0) settleHead(choice);
		setVersion((value) => value + 1);
	}, [settleHead]);
	const reset = (0, react.useCallback)(() => {
		while (queue.current.length > 0) settleHead("skip");
		setVersion((value) => value + 1);
	}, [settleHead]);
	return {
		current: queue.current[0]?.request ?? null,
		remaining: Math.max(0, queue.current.length - 1),
		onDuplicate,
		resolve,
		reset
	};
}
//#endregion
//#region src/client/ui/useStoreState.ts
/**
* React binding for the library store.
*
* `store` exposes an external mutable snapshot with an explicit subscribe
* function, which is exactly the contract `useSyncExternalStore` expects. This
* hook is the only place in the UI that subscribes to it.
*/
/**
* Subscribe to the library store.
* @returns The current snapshot, or `null` before the store's first snapshot.
*/
function useStoreState() {
	return (0, react.useSyncExternalStore)((onStoreChange) => store.subscribe(onStoreChange), () => store.getSnapshot(), () => null);
}
//#endregion
//#region src/client/ui/AssetLibraryApp.tsx
/**
* The asset library panel: the only component in this directory that reads the
* data store.
*
* Every other component is controlled through props, so the store subscription,
* the query, and the import wiring live here and nowhere else.
*/
/** Fallback query used before the store's first snapshot arrives. */
const INITIAL_QUERY = {
	text: "",
	kinds: [],
	tags: [],
	favoriteOnly: false,
	minRating: 0,
	from: null,
	to: null,
	sort: "importedAt",
	desc: true
};
/** Fallback settings used before the store has loaded them from IndexedDB. */
const INITIAL_SETTINGS = {
	thumbMaxEdge: 512,
	thumbQuality: .85,
	maxImportBytes: 2147483648,
	routeMaxBytes: 67108864,
	videoSeekRatio: .1,
	videoTimeoutMs: 4e3,
	wallpaperKey: null,
	wallpaperMask: 35,
	curationOpen: false
};
/** How long a finished import run stays on screen before hiding itself. */
const PROGRESS_LINGER_MS = 4e3;
/**
* Render the asset library panel.
* @param props - Session identity and the host capabilities the panel may need.
* @returns The panel, from the loading shell through to the full gallery.
*/
function AssetLibraryApp(props) {
	const state = useStoreState();
	const ready = state !== null;
	const query = state?.query ?? INITIAL_QUERY;
	const settings = state?.settings ?? INITIAL_SETTINGS;
	const assets = (0, react.useMemo)(() => state?.assets ?? [], [state?.assets]);
	const filtered = (0, react.useMemo)(() => state?.filtered ?? [], [state?.filtered]);
	const imports = state?.imports ?? [];
	const selected = state?.selected ?? [];
	const pendingUndo = state?.pendingUndo ?? null;
	const [now, setNow] = (0, react.useState)(() => Date.now());
	(0, react.useEffect)(() => {
		if (pendingUndo === null) return;
		const timer = setInterval(() => setNow(Date.now()), 250);
		return () => clearInterval(timer);
	}, [pendingUndo]);
	const [removeConfirm, setRemoveConfirm] = (0, react.useState)(null);
	const [wallpaperError, setWallpaperError] = (0, react.useState)(void 0);
	const wallpaperUrl = useObjectUrl(state?.wallpaper);
	const removeSelected = (0, react.useCallback)(() => {
		setRemoveConfirm([...selected]);
	}, [selected]);
	const confirmRemove = (0, react.useCallback)(() => {
		const ids = removeConfirm ?? [];
		setRemoveConfirm(null);
		if (ids.length === 0) return;
		store.removeWithUndo(ids);
	}, [removeConfirm]);
	const duplicates = useDuplicateResolution();
	const [openId, setOpenId] = (0, react.useState)(null);
	const [settingsOpen, setSettingsOpen] = (0, react.useState)(false);
	const [timeRange, setTimeRange] = (0, react.useState)(null);
	const [progressDismissed, setProgressDismissed] = (0, react.useState)(false);
	const [errorDetail, setErrorDetail] = (0, react.useState)(void 0);
	const settingsAnchorRef = (0, react.useRef)(null);
	const importCountRef = (0, react.useRef)(0);
	const initStore = (0, react.useCallback)(() => {
		setErrorDetail(void 0);
		store.init().catch((cause) => {
			setErrorDetail(cause instanceof Error ? `${cause.name}: ${cause.message}\n${cause.stack ?? ""}` : String(cause));
		});
	}, []);
	(0, react.useEffect)(() => {
		initStore();
	}, [initStore]);
	const patchQuery = (0, react.useCallback)((patch) => {
		store.setQuery(patch);
	}, []);
	const handleTimeRange = (0, react.useCallback)((next) => {
		setTimeRange(next);
		if (next === null) {
			patchQuery({
				from: null,
				to: null
			});
			return;
		}
		if (next === "custom") return;
		patchQuery(rangeBounds(next));
	}, [patchQuery]);
	(0, react.useEffect)(() => {
		if (imports.length <= importCountRef.current) return;
		importCountRef.current = imports.length;
		setProgressDismissed(false);
	}, [imports.length]);
	const importRunning = state?.importRunning === true;
	(0, react.useEffect)(() => {
		if (importRunning || imports.length === 0) return;
		const timer = setTimeout(() => setProgressDismissed(true), PROGRESS_LINGER_MS);
		return () => clearTimeout(timer);
	}, [importRunning, imports.length]);
	const handleFiles = (0, react.useCallback)((files) => {
		if (files.length === 0) return;
		store.importFiles(files, duplicates.onDuplicate);
	}, [duplicates.onDuplicate]);
	const handlePickFiles = (0, react.useCallback)(() => {
		const input = document.createElement("input");
		input.type = "file";
		input.multiple = true;
		input.addEventListener("change", () => {
			const files = input.files === null ? [] : Array.from(input.files);
			if (files.length > 0) handleFiles(files);
		});
		input.click();
	}, [handleFiles]);
	const tags = (0, react.useMemo)(() => collectTags(assets), [assets]);
	const missingCount = (0, react.useMemo)(() => assets.filter((asset) => asset.status === "missing").length, [assets]);
	const thumbBytes = (0, react.useMemo)(() => assets.reduce((total, asset) => total + (asset.thumb?.size ?? 0), 0), [assets]);
	const patch = (0, react.useCallback)((id, next) => {
		store.patch(id, next);
	}, []);
	if (!ready) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		className: App_module_default.root,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: App_module_default.body,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Gallery, {
				assets: [],
				loading: true,
				error: null,
				hasAnyAssets: false,
				query: INITIAL_QUERY,
				selected: [],
				openId: null,
				onSelect: () => void 0,
				onOpen: () => void 0,
				onCloseLightbox: () => void 0,
				onOpenStep: () => void 0,
				onToggleFavorite: () => void 0,
				onRate: () => void 0,
				onQueryPatch: () => void 0,
				onPickFiles: handlePickFiles,
				onRetry: initStore,
				onRename: () => void 0,
				onToggleTag: () => void 0,
				onRecheck: () => void 0,
				onRelocate: () => void 0,
				onDelete: () => void 0,
				originalCap: INITIAL_SETTINGS.routeMaxBytes
			})
		})
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: App_module_default.root,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Toolbar, {
				query,
				totalCount: assets.length,
				matchCount: filtered.length,
				missingCount,
				allTags: tags,
				activeTimeRange: timeRange,
				selecting: selected.length > 0,
				selectedCount: selected.length,
				importing: importRunning,
				curationOpen: settings.curationOpen,
				onToggleCuration: () => {
					props.onSettingsChange?.({ curationOpen: !settings.curationOpen });
				},
				onQuery: patchQuery,
				onTimeRange: handleTimeRange,
				onToggleSelecting: () => store.select([]),
				onClearSelection: () => store.select([]),
				onPickFiles: handlePickFiles,
				onRecheckMissing: () => void store.recheck(assets.map((asset) => asset.id)),
				settingsOpen,
				onToggleSettings: () => setSettingsOpen((value) => !value),
				onRequestRemoveSelected: removeSelected
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ImportZone, {
				onFiles: handleFiles,
				busy: importRunning,
				empty: assets.length === 0
			}),
			settingsOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: App_module_default.settingsAnchor,
				ref: settingsAnchorRef,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingsPopover, {
					settings,
					assetCount: assets.length,
					thumbBytes,
					editable: props.onSettingsChange !== void 0,
					hasWallpaper: state.wallpaper !== void 0,
					onPickWallpaper: (file) => {
						setWallpaperError(void 0);
						store.setWallpaper(file).catch((cause) => {
							setWallpaperError(cause instanceof Error ? cause.message : String(cause));
						});
					},
					onClearWallpaper: () => {
						setWallpaperError(void 0);
						store.clearWallpaper().catch((cause) => {
							setWallpaperError(cause instanceof Error ? cause.message : String(cause));
						});
					},
					errorText: wallpaperError,
					onChange: (next) => props.onSettingsChange?.(next),
					onClose: () => setSettingsOpen(false)
				})
			}) : null,
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: App_module_default.body,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Gallery, {
					assets: filtered,
					loading: state.loading,
					error: state.error,
					errorDetail,
					hasAnyAssets: assets.length > 0,
					query,
					selected,
					openId,
					onSelect: (ids) => store.select(ids),
					onOpen: (asset) => setOpenId(asset.id),
					onCloseLightbox: () => setOpenId(null),
					onOpenStep: (asset) => setOpenId(asset.id),
					onToggleFavorite: (asset) => store.toggleFavorite(asset.id),
					onRate: (asset, rating) => store.setRating(asset.id, rating),
					onQueryPatch: patchQuery,
					onPickFiles: handlePickFiles,
					onRetry: initStore,
					onReference: props.onReference,
					onRename: (asset, name) => patch(asset.id, { name }),
					onToggleTag: (asset, tag) => void store.toggleTag([asset.id], tag),
					onRecheck: (asset) => void store.recheck([asset.id]),
					onRelocate: (asset, nextPath) => void store.relocate(asset.id, nextPath),
					wallpaperUrl,
					wallpaperMask: settings.wallpaperMask,
					originalCap: settings.routeMaxBytes,
					onDelete: (list) => {
						store.remove(list.map((asset) => asset.id));
						if (openId !== null && list.some((asset) => asset.id === openId)) setOpenId(null);
					},
					onRequestRelocate: props.onRequestRelocate,
					onOpenSystem: props.onOpenSystem
				}), !progressDismissed || importRunning ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ImportProgress, {
					events: imports,
					running: importRunning,
					onDismiss: () => setProgressDismissed(true)
				}) : null]
			}),
			removeConfirm !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RemoveConfirmDialog, {
				count: removeConfirm.length,
				onCancel: () => setRemoveConfirm(null),
				onConfirm: confirmRemove
			}) : null,
			pendingUndo !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UndoBar, {
				count: pendingUndo.ids.length,
				remainingSeconds: Math.max(0, Math.ceil((pendingUndo.expiresAt - now) / 1e3)),
				onUndo: () => void store.undoRemove()
			}) : null,
			duplicates.current !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DuplicateDialog, {
				request: duplicates.current,
				remaining: duplicates.remaining,
				onResolve: duplicates.resolve
			}) : null
		]
	});
}
/** Separates a removal from the disk: the copies on disk are never touched. */
function RemoveConfirmDialog(props) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		className: Overlay_module_default.modalBackdrop,
		role: "presentation",
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: Overlay_module_default.modal,
			role: "alertdialog",
			"aria-modal": "true",
			"aria-label": "移出素材库",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
					className: Overlay_module_default.modalTitle,
					children: "移出素材库"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
					className: Overlay_module_default.modalBody,
					children: [
						"将从素材库移出 ",
						props.count,
						" 项，",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "磁盘上的原文件不会被删除" }),
						"。8 秒内可以撤销。"
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: Overlay_module_default.modalActions,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: App_module_default.ghostButton,
							onClick: props.onCancel,
							children: "取消"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Overlay_module_default.modalActionsSpacer }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: App_module_default.dangerButton,
							onClick: props.onConfirm,
							children: [
								"移出 ",
								props.count,
								" 项"
							]
						})
					]
				})
			]
		})
	});
}
/** The 8-second escape hatch offered after a removal. */
function UndoBar(props) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: App_module_default.undoBar,
		role: "status",
		"aria-live": "polite",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
			"已移出 ",
			props.count,
			" 项（磁盘原文件仍在）"
		] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
			type: "button",
			className: App_module_default.ghostButton,
			onClick: props.onUndo,
			children: [
				"撤销（",
				props.remainingSeconds,
				" 秒）"
			]
		})]
	});
}
/**
* Epoch bounds for one fixed time-range chip.
* @param range - A fixed range; `custom` is resolved by the toolbar's date fields.
* @returns The inclusive `from` and `to` epoch milliseconds for the query.
*/
function rangeBounds(range) {
	const now = /* @__PURE__ */ new Date();
	const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
	if (range === "today") return {
		from: startOfDay,
		to: Number.POSITIVE_INFINITY
	};
	if (range === "week") return {
		from: startOfDay - (now.getDay() + 6) % 7 * 864e5,
		to: Number.POSITIVE_INFINITY
	};
	if (range === "month") return {
		from: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
		to: Number.POSITIVE_INFINITY
	};
	return {
		from: Number.NEGATIVE_INFINITY,
		to: startOfMonth(now)
	};
}
/**
* Start of the current month.
* @param now - Reference instant.
* @returns Epoch milliseconds of the month's first midnight.
*/
function startOfMonth(now) {
	return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}
//#endregion
//#region src/client/ui/AssetPicker.module.css
var AssetPicker_module_default = {
	"actions": "aAKq5a_actions",
	"backdrop": "aAKq5a_backdrop",
	"cell": "aAKq5a_cell",
	"cellMeta": "aAKq5a_cellMeta",
	"cellName": "aAKq5a_cellName",
	"cellSelected": "aAKq5a_cellSelected",
	"cellWrap": "aAKq5a_cellWrap",
	"count": "aAKq5a_count",
	"empty": "aAKq5a_empty",
	"emptyText": "aAKq5a_emptyText",
	"footer": "aAKq5a_footer",
	"grid": "aAKq5a_grid",
	"header": "aAKq5a_header",
	"mark": "aAKq5a_mark",
	"panel": "aAKq5a_panel",
	"primary": "aAKq5a_primary",
	"search": "aAKq5a_search",
	"secondary": "aAKq5a_secondary",
	"thumb": "aAKq5a_thumb",
	"thumbBox": "aAKq5a_thumbBox",
	"thumbFallback": "aAKq5a_thumbFallback",
	"title": "aAKq5a_title"
};
//#endregion
//#region src/client/ui/AssetPicker.tsx
/**
* The picker opened from the composer's `+` menu: choose library assets and hand
* them to the conversation.
*
* The component is fully controlled — assets arrive through props, selection is
* local, and the single `onConfirm` callback reports the chosen ids. It never
* touches the store, so the panel and the picker cannot drift apart.
*/
/** A text-only query: the picker is a search box, not a filter panel. */
const TEXT_ONLY = {
	kinds: [],
	tags: [],
	favoriteOnly: false,
	minRating: 0,
	from: null,
	to: null,
	sort: "importedAt",
	desc: true
};
/** How long typing settles before the list re-filters. */
const SEARCH_DEBOUNCE_MS = 120;
/**
* Render the asset picker dialog.
* @param props - Open state, the library contents, and the two callbacks.
* @returns The dialog, or `null` while closed.
*/
function AssetPicker(props) {
	const { open, onClose, onConfirm, assets, onOpenLibrary } = props;
	const [text, setText] = (0, react.useState)("");
	const [selected, setSelected] = (0, react.useState)([]);
	const searchRef = (0, react.useRef)(null);
	const panelRef = (0, react.useRef)(null);
	const debounced = useDebouncedValue(text, SEARCH_DEBOUNCE_MS);
	(0, react.useEffect)(() => {
		if (!open) return;
		setText("");
		setSelected([]);
		searchRef.current?.focus();
	}, [open]);
	const visible = (0, react.useMemo)(() => {
		const query = {
			...TEXT_ONLY,
			text: debounced
		};
		return debounced.trim() === "" ? [...assets] : assets.filter((asset) => matchAsset(asset, query));
	}, [assets, debounced]);
	const toggle = (0, react.useCallback)((id) => {
		setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
	}, []);
	const confirm = (0, react.useCallback)(() => {
		if (selected.length === 0) return;
		onConfirm(assets.filter((asset) => selected.includes(asset.id)).map((asset) => asset.id));
	}, [
		assets,
		onConfirm,
		selected
	]);
	const onKeyDown = (0, react.useCallback)((event) => {
		if (event.key === "Escape") {
			event.preventDefault();
			event.stopPropagation();
			onClose();
			return;
		}
		if (event.key === "Enter" && selected.length > 0 && event.target !== searchRef.current) {
			event.preventDefault();
			confirm();
		}
	}, [
		confirm,
		onClose,
		selected.length
	]);
	if (!open) return null;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		className: AssetPicker_module_default.backdrop,
		onPointerDown: (event) => {
			if (event.target === event.currentTarget) onClose();
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			ref: panelRef,
			className: AssetPicker_module_default.panel,
			role: "dialog",
			"aria-modal": "true",
			"aria-label": "从素材库添加",
			onKeyDown,
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: AssetPicker_module_default.header,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						className: AssetPicker_module_default.title,
						children: "从素材库添加"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						ref: searchRef,
						className: AssetPicker_module_default.search,
						type: "search",
						value: text,
						placeholder: "搜索名称、标签、扩展名…",
						"aria-label": "搜索素材",
						onChange: (event) => setText(event.target.value)
					})]
				}),
				assets.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: AssetPicker_module_default.empty,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: AssetPicker_module_default.emptyText,
						children: "素材库还是空的，先拖入一些文件。"
					}), onOpenLibrary !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: AssetPicker_module_default.secondary,
						onClick: onOpenLibrary,
						children: "去素材库"
					}) : null]
				}) : visible.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: AssetPicker_module_default.empty,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: AssetPicker_module_default.emptyText,
						children: [
							"没有匹配「",
							debounced,
							"」的素材。"
						]
					})
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
					className: AssetPicker_module_default.grid,
					"aria-label": "素材列表",
					children: visible.map((asset) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PickerCell, {
						asset,
						query: debounced,
						selected: selected.includes(asset.id),
						onToggle: toggle
					}, asset.id))
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
					className: AssetPicker_module_default.footer,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: AssetPicker_module_default.count,
						children: selected.length === 0 ? "" : `已选 ${selected.length} 项`
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: AssetPicker_module_default.actions,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: AssetPicker_module_default.secondary,
							onClick: onClose,
							children: "取消"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: AssetPicker_module_default.primary,
							disabled: selected.length === 0,
							onClick: confirm,
							children: selected.length === 0 ? "加入对话" : `加入对话（${selected.length}）`
						})]
					})]
				})
			]
		})
	});
}
/** One selectable cell: thumbnail, name, size. */
function PickerCell(props) {
	const { asset, query, selected, onToggle } = props;
	const url = useObjectUrl(asset.thumb);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
		className: AssetPicker_module_default.cellWrap,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
			type: "button",
			className: selected ? AssetPicker_module_default.cellSelected : AssetPicker_module_default.cell,
			"aria-pressed": selected,
			onClick: () => onToggle(asset.id),
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: AssetPicker_module_default.thumbBox,
					children: url === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: AssetPicker_module_default.thumbFallback,
						"aria-hidden": "true",
						children: asset.ext.slice(0, 4).toUpperCase() || "?"
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
						className: AssetPicker_module_default.thumb,
						src: url,
						alt: "",
						loading: "lazy",
						draggable: false
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: AssetPicker_module_default.cellName,
					title: asset.name,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Highlight, {
						text: asset.name,
						query,
						markClassName: AssetPicker_module_default.mark
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: AssetPicker_module_default.cellMeta,
					children: formatBytes(asset.size)
				})
			]
		})
	});
}
//#endregion
//#region src/client/index.tsx
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
/** The slot this panel occupies; the shell declares it as `single`/`root`. */
const SLOT_NAME = "agent-profile.materials";
/** Registration id for this plugin's occupants of the host's slots. */
const SLOT_ID = "asset-library";
/** The overlay slot that hosts the picker so it can cover the whole window. */
const OVERLAY_SLOT = "shell.overlay";
/** The composer slot whose occupants receive `inputActions`. */
const INPUT_BRIDGE_SLOT = "conversation.input.left";
/** How long one outcome line stays on screen. */
const NOTICE_MS = 6e3;
/** Services the shell must have resolved before `apply` runs. */
const inject = ["slots"];
/** Client context kept for the components registered by {@link apply}. */
let panelContext;
/** Session captured by the composer bridge (authoritative while a composer is mounted). */
let bridgeSessionId = "";
/** Session captured by the last `添加素材库` command run (fallback for the panel). */
let lastCommandSession = "";
let noticeText = "";
let noticeSeq = 0;
const noticeListeners = /* @__PURE__ */ new Set();
/**
* Publish one outcome line for the user; empty clears it.
* @param text - the message.
*/
function publishNotice(text) {
	noticeText = text;
	noticeSeq += 1;
	for (const listener of noticeListeners) listener();
}
function subscribeNotice(listener) {
	noticeListeners.add(listener);
	return () => {
		noticeListeners.delete(listener);
	};
}
/** Which conversation the picker is collecting for; empty while closed. */
let pickerSession = "";
const pickerListeners = /* @__PURE__ */ new Set();
function subscribePicker(listener) {
	pickerListeners.add(listener);
	return () => {
		pickerListeners.delete(listener);
	};
}
function pickerSnapshot() {
	return pickerSession;
}
/**
* Open the picker for one conversation.
* @param sessionId - the conversation whose draft will receive the assets.
*/
function openPicker(sessionId) {
	lastCommandSession = sessionId;
	pickerSession = sessionId;
	for (const listener of pickerListeners) listener();
}
function closePicker() {
	pickerSession = "";
	for (const listener of pickerListeners) listener();
}
/** Read the desktop host-path bridge when the shell provides one. */
function hostPaths() {
	const candidate = globalThis.__DSH_HOST_PATHS__;
	if (typeof candidate !== "object" || candidate === null) return void 0;
	return typeof candidate.pathFor === "function" ? candidate : void 0;
}
/**
* Resolve one session's workspace root, for mention relativization.
* @param ctx - client context.
* @param sessionId - target session.
* @returns the workspace root, or `undefined` when the shell does not expose it.
*/
function cwdOf(ctx, sessionId) {
	return ctx.get("sessions", false)?.list?.getSnapshot?.().byId?.[sessionId]?.cwd;
}
/**
* Open one asset with the OS default application, through the host.
*
* A missing call surface is reported rather than swallowed: the action is only
* offered by the UI when this plugin wires it, so silence would be a bug.
* @param ctx - client context.
* @param asset - the asset to open.
*/
async function openWithSystem(ctx, asset) {
	const session = ctx.get("remote", false)?.session;
	const open = session?.openWorkspacePath;
	if (typeof open !== "function") {
		publishNotice(`无法用系统应用打开：宿主未提供 openWorkspacePath（${asset.name}）`);
		return;
	}
	try {
		await open.call(session, { path: asset.path });
		publishNotice(`已用系统默认应用打开：${asset.name}`);
	} catch (error) {
		publishNotice(`打开失败：${error instanceof Error ? error.message : String(error)}`);
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
function requestRelocate(asset) {
	const bridge = hostPaths();
	if (bridge === void 0) {
		publishNotice("无法重新定位：当前环境不提供宿主路径桥（__DSH_HOST_PATHS__）");
		return;
	}
	const input = document.createElement("input");
	input.type = "file";
	input.style.display = "none";
	input.addEventListener("change", () => {
		const file = input.files?.[0];
		input.remove();
		if (file === void 0) return;
		const next = bridge.pathFor(file);
		if (next === "") {
			publishNotice(`无法取得磁盘路径：${file.name}`);
			return;
		}
		store.relocate(asset.id, next).then(() => {
			publishNotice(`已重新定位：${file.name}`);
		}, (error) => {
			publishNotice(`重新定位失败：${error instanceof Error ? error.message : String(error)}`);
		});
	});
	document.body.append(input);
	input.click();
}
/**
* Hand a set of assets to one conversation.
* @param ctx - client context.
* @param sessionId - target session.
* @param assets - chosen assets, in the order the user saw them.
*/
async function referenceIntoChat(ctx, sessionId, assets) {
	const conversation = ctx.get("conversation", false);
	publishNotice(describeResult(await referenceAssets({
		assets,
		sessionId,
		cwd: cwdOf(ctx, sessionId),
		conversation
	})));
}
/** The library panel: the tab page opened from the window tab strip's `+`. */
function Panel() {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AssetLibraryApp, {
		onReference: (asset) => {
			const sessionId = activeSessionId();
			if (sessionId === "") {
				publishNotice("没有活动会话，无法引用到对话");
				return;
			}
			if (panelContext === void 0) return;
			referenceIntoChat(panelContext, sessionId, [asset]);
		},
		onOpenSystem: (asset) => {
			if (panelContext === void 0) return;
			openWithSystem(panelContext, asset);
		},
		onSettingsChange: (patch) => {
			store.setSettings(patch);
		},
		onRequestRelocate: (asset) => {
			requestRelocate(asset);
		}
	});
}
/** The invisible bridge: it exists only to capture `inputActions` from the host. */
function InputActionsBridge(props) {
	const actions = props.inputActions;
	const sessionId = sessionIdOf(props);
	(0, react.useEffect)(() => {
		if (actions === void 0) return;
		captureInputActions(actions);
		bridgeSessionId = sessionId;
		return () => {
			captureInputActions(null);
			if (bridgeSessionId === sessionId) bridgeSessionId = "";
		};
	}, [actions, sessionId]);
	return null;
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
function sessionIdOf(props) {
	const direct = props.sessionId;
	if (typeof direct === "string") return direct;
	const session = props.session;
	if (typeof session === "string") return session;
	if (typeof session === "object" && session !== null) {
		const nested = session.sessionId ?? session.id;
		if (typeof nested === "string") return nested;
	}
	return "";
}
/**
* The conversation the panel should reference into.
*
* The bridge's session-scoped id is authoritative; the command path records one
* as well, so a panel opened before any composer mounted still has a target.
* @returns the session id, or an empty string when neither source knows one.
*/
function activeSessionId() {
	return bridgeSessionId !== "" ? bridgeSessionId : lastCommandSession;
}
/** Inline style for the outcome line, so this module needs no stylesheet. */
const NOTICE_STYLE = {
	position: "fixed",
	right: "20px",
	bottom: "20px",
	zIndex: 60,
	maxWidth: "380px",
	padding: "10px 14px",
	border: "1px solid var(--dsw-alias-border-l1)",
	borderRadius: "10px",
	background: "var(--dsw-alias-bg-layer-1)",
	color: "var(--dsw-alias-label-primary)",
	fontFamily: "var(--dsw-font-family)",
	fontSize: "var(--dsw-font-xs-13)",
	boxShadow: "0 10px 30px rgb(0 0 0 / 22%)",
	pointerEvents: "none"
};
/** The picker and the outcome line it reports into; rides the overlay slot. */
function PickerHost() {
	const state = useStoreState();
	const sessionId = (0, react.useSyncExternalStore)(subscribePicker, pickerSnapshot, pickerSnapshot);
	const text = (0, react.useSyncExternalStore)(subscribeNotice, () => noticeText, () => noticeText);
	(0, react.useEffect)(() => {
		if (text === "") return;
		const timer = setTimeout(() => {
			publishNotice("");
		}, NOTICE_MS);
		return () => {
			clearTimeout(timer);
		};
	}, [text, noticeSeq]);
	const close = (0, react.useCallback)(() => {
		closePicker();
	}, []);
	const confirm = (0, react.useCallback)((ids) => {
		const assets = (state?.assets ?? []).filter((asset) => ids.includes(asset.id));
		closePicker();
		if (sessionId === "" || assets.length === 0 || panelContext === void 0) return;
		referenceIntoChat(panelContext, sessionId, assets);
	}, [sessionId, state?.assets]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AssetPicker, {
		open: sessionId !== "",
		assets: state?.assets ?? [],
		onClose: close,
		onConfirm: confirm
	}), text === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		role: "status",
		style: NOTICE_STYLE,
		"data-asset-library-notice": "",
		children: text
	})] });
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
function safeRegister(what, run) {
	try {
		run();
	} catch (error) {
		console.error(`[dsh-asset-library] ${what} 注册失败`, error);
		publishNotice(`素材库「${what}」注册失败：${error instanceof Error ? error.message : String(error)}`);
	}
}
/**
* Mount the asset library.
* @param ctx - client plugin context carrying the `slots` service.
*/
function apply(ctx) {
	const bridge = hostPaths();
	setPathResolver(bridge === void 0 ? void 0 : (file) => bridge.pathFor(file));
	panelContext = ctx;
	safeRegister("素材库页面", () => {
		ctx.slots.inject(SLOT_NAME, () => ctx.slots.register({
			name: SLOT_NAME,
			id: SLOT_ID
		}, Panel));
	});
	safeRegister("选择器浮层", () => {
		ctx.slots.inject(OVERLAY_SLOT, () => ctx.slots.register({
			name: OVERLAY_SLOT,
			id: SLOT_ID,
			order: 40
		}, PickerHost));
	});
	safeRegister("输入区桥", () => {
		ctx.slots.inject(INPUT_BRIDGE_SLOT, () => ctx.slots.register({
			name: INPUT_BRIDGE_SLOT,
			id: `${SLOT_ID}-bridge`,
			order: 900
		}, InputActionsBridge));
	});
	safeRegister("「添加素材库」命令", () => {
		ctx.inject(["commandUi"], (scope) => {
			safeRegister("「添加素材库」命令（注入后）", () => {
				const commands = scope.get("commandUi");
				if (commands === void 0) {
					console.error("[dsh-asset-library] commandUi 未解析，菜单行不会出现");
					publishNotice("素材库：commandUi 服务未解析，菜单里不会有「添加素材库」");
					return;
				}
				scope.effect(() => registerAssetCommand(commands, openPicker), "dsh-asset-library: 添加素材库 command");
			});
		});
	});
	probeRoute();
}
/**
* Confirm the host route answers.
*
* An empty path is what this sends, so `400` is the proof that the route exists;
* a `404` means the bridge never saw a registration, which the user must see
* rather than discover later as broken thumbnails.
* @returns nothing; the outcome is published as a notice.
*/
async function probeRoute() {
	try {
		if ((await fetch(fileUrl(""), { method: "HEAD" })).status === 404) publishNotice(`素材库文件路由未挂载（${FILE_ROUTE}）`);
	} catch {
		publishNotice(`素材库文件路由不可达（${FILE_ROUTE}）`);
	}
}
//#endregion
exports.SLOT_ID = SLOT_ID;
exports.SLOT_NAME = SLOT_NAME;
exports.apply = apply;
exports.inject = inject;

		// Injected by scripts/inline-css.mjs: the shell loads one script, so the
		// stylesheet travels inside it as a <style> element.
		var __dshAssetLibraryCss = ".LKmtGG_lightboxBackdrop {\n  z-index: 60;\n  background: var(--dsw-alias-bg-mask-1);\n  -webkit-backdrop-filter: blur(10px);\n  animation: LKmtGG_al-lightbox-in .12s var(--ds-ease-in-out) both;\n  flex-direction: column;\n  display: flex;\n  position: fixed;\n  inset: 0;\n}\n\n@keyframes LKmtGG_al-lightbox-in {\n  from {\n    opacity: 0;\n  }\n\n  to {\n    opacity: 1;\n  }\n}\n\n.LKmtGG_lightboxFrame {\n  color: var(--dsw-alias-label-primary-inverted);\n  flex: none;\n  align-items: center;\n  gap: 12px;\n  padding: 10px 16px;\n  display: flex;\n}\n\n.LKmtGG_lightboxTitle {\n  flex: auto;\n  align-items: baseline;\n  gap: 10px;\n  min-width: 0;\n  display: flex;\n}\n\n.LKmtGG_lightboxName {\n  font-size: var(--dsw-font-s-14);\n  color: var(--dsw-alias-label-primary-inverted);\n  white-space: nowrap;\n  text-overflow: ellipsis;\n  overflow: hidden;\n}\n\n.LKmtGG_lightboxCounter {\n  font-size: var(--dsw-font-xxs-12);\n  opacity: .75;\n  font-variant-numeric: tabular-nums;\n  flex: none;\n}\n\n.LKmtGG_lightboxStage {\n  box-sizing: border-box;\n  flex: auto;\n  place-items: center;\n  min-height: 0;\n  padding: 0 56px 24px;\n  display: grid;\n  position: relative;\n}\n\n.LKmtGG_lightboxMedia {\n  max-width: 100%;\n  max-height: 100%;\n  box-shadow: var(--dsw-shadow-lv3);\n  background: var(--dsw-alias-bg-layer-1);\n  animation: LKmtGG_al-lightbox-zoom .12s var(--ds-ease-in-out) both;\n  border-radius: 10px;\n}\n\n@keyframes LKmtGG_al-lightbox-zoom {\n  from {\n    opacity: 0;\n    transform: scale(.97);\n  }\n\n  to {\n    opacity: 1;\n    transform: scale(1);\n  }\n}\n\n.LKmtGG_lightboxVideo {\n  width: min(100%, 1100px);\n  max-height: 100%;\n}\n\n.LKmtGG_lightboxPlaceholder {\n  background: var(--dsw-alias-bg-layer-1);\n  color: var(--dsw-alias-label-secondary);\n  text-align: center;\n  border-radius: 12px;\n  flex-direction: column;\n  align-items: center;\n  gap: 10px;\n  padding: 40px 56px;\n  display: flex;\n}\n\n.LKmtGG_lightboxNotice {\n  max-width: 420px;\n  font-size: var(--dsw-font-xxs-12);\n  color: var(--dsw-alias-state-warn-primary);\n  line-height: 1.5;\n}\n\n.LKmtGG_lightboxNav {\n  border: 1px solid var(--dsw-alias-border-inverted);\n  background: var(--dsw-alias-button-floating-fill, #ffffff29);\n  width: 40px;\n  height: 64px;\n  color: var(--dsw-alias-label-primary-inverted);\n  cursor: pointer;\n  border-radius: 10px;\n  place-items: center;\n  font-size: 18px;\n  display: grid;\n  position: absolute;\n  top: 50%;\n  transform: translateY(-50%);\n}\n\n.LKmtGG_lightboxNav:hover {\n  background: var(--dsw-alias-button-floating-hover);\n}\n\n.LKmtGG_lightboxNavPrev {\n  left: 12px;\n}\n\n.LKmtGG_lightboxNavNext {\n  right: 12px;\n}\n\n.LKmtGG_lightboxFooter {\n  color: var(--dsw-alias-label-primary-inverted);\n  font-size: var(--dsw-font-xxs-12);\n  flex: none;\n  align-items: center;\n  gap: 10px;\n  padding: 10px 16px 16px;\n  display: flex;\n}\n\n.LKmtGG_lightboxFooterActions {\n  gap: 8px;\n  margin-left: auto;\n  display: flex;\n}\n\n.LKmtGG_modalBackdrop {\n  z-index: 70;\n  background: var(--dsw-alias-bg-mask-1);\n  -webkit-backdrop-filter: blur(6px);\n  animation: LKmtGG_al-lightbox-in .12s var(--ds-ease-in-out) both;\n  place-items: center;\n  padding: 24px;\n  display: grid;\n  position: fixed;\n  inset: 0;\n}\n\n.LKmtGG_modal {\n  box-sizing: border-box;\n  border: 1px solid var(--dsw-alias-border-l2);\n  background: var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-1));\n  width: min(560px, 100%);\n  box-shadow: var(--dsw-shadow-lv3);\n  color: var(--dsw-alias-label-primary);\n  border-radius: 14px;\n  flex-direction: column;\n  gap: 14px;\n  padding: 20px;\n  animation: .2s cubic-bezier(.2, .9, .25, 1.2) both LKmtGG_al-lightbox-zoom;\n  display: flex;\n}\n\n.LKmtGG_modalTitle {\n  font-size: var(--dsw-font-s-14);\n  margin: 0;\n  font-weight: 600;\n}\n\n.LKmtGG_modalBody {\n  font-size: var(--dsw-font-xs-13);\n  color: var(--dsw-alias-label-secondary);\n  line-height: 1.6;\n}\n\n.LKmtGG_compare {\n  grid-template-columns: 1fr 1fr;\n  gap: 12px;\n  display: grid;\n}\n\n.LKmtGG_compareCard {\n  border: 1px solid var(--dsw-alias-border-l1);\n  background: var(--dsw-alias-bg-layer-1);\n  border-radius: 10px;\n  flex-direction: column;\n  gap: 6px;\n  min-width: 0;\n  padding: 10px;\n  display: flex;\n}\n\n.LKmtGG_compareLabel {\n  font-size: var(--dsw-font-xxxs-11);\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.LKmtGG_compareThumb {\n  object-fit: cover;\n  background: var(--dsw-alias-fill-l2);\n  border-radius: 8px;\n  width: 100%;\n  height: 96px;\n  display: block;\n}\n\n.LKmtGG_compareName {\n  font-size: var(--dsw-font-xxs-12);\n  color: var(--dsw-alias-label-primary);\n  white-space: nowrap;\n  text-overflow: ellipsis;\n  overflow: hidden;\n}\n\n.LKmtGG_compareMeta {\n  font-size: var(--dsw-font-xxxs-11);\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.LKmtGG_modalActions {\n  flex-wrap: wrap;\n  gap: 8px;\n  display: flex;\n}\n\n.LKmtGG_modalActionsSpacer {\n  flex: auto;\n}\n\n.LKmtGG_modalCheckbox {\n  font-size: var(--dsw-font-xxs-12);\n  color: var(--dsw-alias-label-secondary);\n  align-items: center;\n  gap: 6px;\n  display: flex;\n}\n\n.LKmtGG_progressPanel {\n  z-index: 40;\n  box-sizing: border-box;\n  border: 1px solid var(--dsw-alias-border-l2);\n  background: var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-1));\n  width: min(360px, 100% - 40px);\n  box-shadow: var(--dsw-shadow-lv3);\n  -webkit-backdrop-filter: blur(var(--dsw-mask-blur, 8px));\n  border-radius: 12px;\n  animation: .18s cubic-bezier(.2, .7, .3, 1) both LKmtGG_al-card-in;\n  position: absolute;\n  bottom: 20px;\n  right: 20px;\n  overflow: hidden;\n}\n\n.LKmtGG_progressHead {\n  border-bottom: 1px solid var(--dsw-alias-border-l1);\n  font-size: var(--dsw-font-xxs-12);\n  color: var(--dsw-alias-label-secondary);\n  align-items: center;\n  gap: 8px;\n  padding: 8px 10px;\n  display: flex;\n}\n\n.LKmtGG_progressTitle {\n  color: var(--dsw-alias-label-primary);\n  flex: auto;\n}\n\n.LKmtGG_progressToggle {\n  color: var(--dsw-alias-label-tertiary);\n  cursor: pointer;\n  font-size: var(--dsw-font-xxxs-11);\n  background: none;\n  border: none;\n  padding: 2px 4px;\n  font-family: inherit;\n}\n\n.LKmtGG_progressToggle:hover {\n  color: var(--dsw-alias-label-primary);\n}\n\n.LKmtGG_progressList {\n  flex-direction: column;\n  gap: 2px;\n  max-height: 220px;\n  margin: 0;\n  padding: 6px;\n  list-style: none;\n  display: flex;\n  overflow-y: auto;\n}\n\n.LKmtGG_progressRow {\n  font-size: var(--dsw-font-xxxs-11);\n  border-radius: 6px;\n  align-items: baseline;\n  gap: 6px;\n  padding: 3px 4px;\n  display: flex;\n}\n\n.LKmtGG_progressRowFailed {\n  background: var(--dsw-alias-state-error-secondary);\n}\n\n.LKmtGG_progressPhase {\n  color: var(--dsw-alias-label-tertiary);\n  flex: none;\n  min-width: 42px;\n}\n\n.LKmtGG_progressPhaseFailed {\n  color: var(--dsw-alias-state-error-primary);\n}\n\n.LKmtGG_progressName {\n  min-width: 0;\n  color: var(--dsw-alias-label-secondary);\n  white-space: nowrap;\n  text-overflow: ellipsis;\n  flex: auto;\n  overflow: hidden;\n}\n\n.LKmtGG_progressError {\n  color: var(--dsw-alias-state-error-primary);\n  word-break: break-word;\n  flex: 100%;\n  padding-left: 48px;\n  line-height: 1.5;\n}\n\n.LKmtGG_popover {\n  z-index: 50;\n  box-sizing: border-box;\n  border: 1px solid var(--dsw-alias-border-l2);\n  background: var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-1));\n  width: 300px;\n  box-shadow: var(--dsw-shadow-lv3);\n  color: var(--dsw-alias-label-primary);\n  border-radius: 12px;\n  flex-direction: column;\n  gap: 10px;\n  padding: 14px;\n  display: flex;\n  position: absolute;\n  top: calc(100% + 8px);\n  right: 0;\n}\n\n.LKmtGG_popoverTitle {\n  font-size: var(--dsw-font-xxs-12);\n  color: var(--dsw-alias-label-secondary);\n}\n\n.LKmtGG_field {\n  flex-direction: column;\n  gap: 4px;\n  display: flex;\n}\n\n.LKmtGG_fieldRow {\n  font-size: var(--dsw-font-xxs-12);\n  color: var(--dsw-alias-label-secondary);\n  justify-content: space-between;\n  align-items: baseline;\n  gap: 8px;\n  display: flex;\n}\n\n.LKmtGG_fieldValue {\n  color: var(--dsw-alias-label-tertiary);\n  font-variant-numeric: tabular-nums;\n}\n\n.LKmtGG_fieldInput {\n  box-sizing: border-box;\n  border: 1px solid var(--dsw-alias-border-l2);\n  background: var(--dsw-alias-bg-layer-1);\n  width: 100%;\n  color: var(--dsw-alias-label-primary);\n  font-family: inherit;\n  font-size: var(--dsw-font-xxs-12);\n  border-radius: 7px;\n  padding: 4px 8px;\n}\n\n.LKmtGG_fieldInput:focus-visible {\n  outline: 2px solid var(--dsw-alias-state-business-primary);\n  outline-offset: 1px;\n}\n\n.LKmtGG_range {\n  width: 100%;\n  accent-color: var(--dsw-alias-state-business-primary);\n}\n\n.LKmtGG_stateWrap {\n  box-sizing: border-box;\n  text-align: center;\n  flex-direction: column;\n  flex: auto;\n  justify-content: center;\n  align-items: center;\n  gap: 14px;\n  min-height: 0;\n  padding: 48px 24px;\n  display: flex;\n  overflow-y: auto;\n}\n\n.LKmtGG_stateGlyph {\n  opacity: .9;\n  font-size: 40px;\n  line-height: 1;\n}\n\n.LKmtGG_stateTitle {\n  font-size: var(--dsw-font-s-14);\n  color: var(--dsw-alias-label-primary);\n  margin: 0;\n  font-weight: 600;\n}\n\n.LKmtGG_stateBody {\n  max-width: 420px;\n  font-size: var(--dsw-font-xs-13);\n  color: var(--dsw-alias-label-secondary);\n  margin: 0;\n  line-height: 1.7;\n}\n\n.LKmtGG_stateActions {\n  flex-wrap: wrap;\n  justify-content: center;\n  gap: 8px;\n  display: flex;\n}\n\n.LKmtGG_stateDetails {\n  text-align: left;\n  width: 100%;\n  max-width: 560px;\n  font-size: var(--dsw-font-xxs-12);\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.LKmtGG_stateDetailsSummary {\n  cursor: pointer;\n  color: var(--dsw-alias-label-secondary);\n  font-size: var(--dsw-font-xxs-12);\n}\n\n.LKmtGG_stateDetailsPre {\n  border: 1px solid var(--dsw-alias-border-l1);\n  background: var(--dsw-alias-markdown-code-block);\n  color: var(--dsw-alias-label-secondary);\n  font-family: var(--dsw-font-family-code, monospace);\n  font-size: var(--dsw-font-xxxs-11);\n  white-space: pre-wrap;\n  word-break: break-word;\n  border-radius: 8px;\n  max-height: 220px;\n  margin: 8px 0 0;\n  padding: 10px;\n  line-height: 1.6;\n  overflow: auto;\n}\n\n.LKmtGG_dropHint {\n  border: 1px dashed var(--dsw-alias-border-l3);\n  color: var(--dsw-alias-label-tertiary);\n  font-size: var(--dsw-font-xxs-12);\n  border-radius: 10px;\n  padding: 10px 18px;\n}\n\n.LKmtGG_skeletonGrid {\n  align-items: flex-start;\n  gap: 16px;\n  width: 100%;\n  display: flex;\n}\n\n.LKmtGG_skeletonColumn {\n  flex-direction: column;\n  flex: 1 1 0;\n  gap: 16px;\n  min-width: 0;\n  display: flex;\n}\n\n.LKmtGG_skeletonCard {\n  border: 1px solid var(--dsw-alias-border-l1);\n  background: var(--dsw-alias-bg-layer-1);\n  border-radius: 12px;\n  overflow: hidden;\n}\n\n.LKmtGG_skeletonMedia {\n  background: var(--dsw-alias-fill-l2);\n  width: 100%;\n}\n\n.LKmtGG_skeletonFooter {\n  flex-direction: column;\n  gap: 5px;\n  padding: 9px;\n  display: flex;\n}\n\n.LKmtGG_skeletonLine {\n  background: linear-gradient(100deg,\n    var(--dsw-alias-fill-l2) 30%,\n    var(--dsw-alias-interactive-bg-hover) 50%,\n    var(--dsw-alias-fill-l2) 70%);\n  background-size: 220% 100%;\n  border-radius: 999px;\n  height: 9px;\n  animation: 1.4s linear infinite LKmtGG_al-shimmer;\n}\n\n.LKmtGG_skeletonLineShort {\n  width: 45%;\n}\n\n.LKmtGG_wallpaperActions {\n  flex-wrap: wrap;\n  gap: 6px;\n  display: flex;\n}\n\n.LKmtGG_fieldError {\n  border: 1px solid var(--dsw-alias-state-error-primary);\n  background: var(--dsw-alias-state-error-tertiary, transparent);\n  color: var(--dsw-alias-state-error-primary);\n  font-size: var(--dsw-font-xxs-12);\n  border-radius: 8px;\n  padding: 6px 9px;\n  line-height: 1.5;\n}\n\n.LKmtGG_ghostButton {\n  border: 1px solid var(--dsw-alias-border-l2);\n  color: var(--dsw-alias-label-secondary);\n  font-family: inherit;\n  font-size: var(--dsw-font-xxs-12);\n  cursor: pointer;\n  transition: background .12s var(--ds-ease-in-out),\n    border-color .12s var(--ds-ease-in-out),\n    transform .2s cubic-bezier(.2, .9, .25, 1.2);\n  background: none;\n  border-radius: 8px;\n  padding: 5px 12px;\n}\n\n.LKmtGG_ghostButton:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n  color: var(--dsw-alias-label-primary);\n}\n\n.LKmtGG_ghostButton:active {\n  transform: scale(.955);\n}\n\n.LKmtGG_ghostButton:disabled {\n  opacity: .5;\n  cursor: default;\n}\n\n.LKmtGG_ghostButton:disabled:active {\n  transform: none;\n}\n\n.LKmtGG_visuallyHidden {\n  clip: rect(0 0 0 0);\n  white-space: nowrap;\n  border: 0;\n  width: 1px;\n  height: 1px;\n  margin: -1px;\n  padding: 0;\n  position: absolute;\n  overflow: hidden;\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .LKmtGG_ghostButton {\n    transition: background .12s linear, border-color .12s linear;\n  }\n\n  .LKmtGG_ghostButton:active {\n    transform: none;\n  }\n\n  .LKmtGG_lightboxBackdrop, .LKmtGG_modalBackdrop, .LKmtGG_modal, .LKmtGG_lightboxMedia, .LKmtGG_progressPanel, .LKmtGG_skeletonLine, .LKmtGG_skeletonMedia {\n    animation: none;\n  }\n}\n.nHXo_W_root {\n  background: var(--dsw-alias-bg-base);\n  width: 100%;\n  height: 100%;\n  min-height: 0;\n  color: var(--dsw-alias-label-primary);\n  font-family: var(--dsw-font-family);\n  font-size: var(--dsw-font-xs-13);\n  flex-direction: column;\n  display: flex;\n  position: relative;\n  overflow: hidden;\n}\n\n.nHXo_W_toolbar {\n  border-bottom: 1px solid var(--dsw-alias-border-l1);\n  flex-direction: column;\n  flex: none;\n  gap: 8px;\n  padding: 12px 20px 10px;\n  display: flex;\n}\n\n.nHXo_W_toolbarRow {\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 8px;\n  display: flex;\n}\n\n.nHXo_W_searchWrap {\n  flex: 220px;\n  align-items: center;\n  min-width: 180px;\n  max-width: 420px;\n  display: flex;\n  position: relative;\n}\n\n.nHXo_W_searchIcon {\n  color: var(--dsw-alias-label-tertiary);\n  pointer-events: none;\n  font-size: var(--dsw-font-xxs-12);\n  position: absolute;\n  left: 10px;\n}\n\n.nHXo_W_searchInput {\n  box-sizing: border-box;\n  border: 1px solid var(--dsw-alias-border-l2);\n  background: var(--dsw-alias-bg-layer-1);\n  width: 100%;\n  color: var(--dsw-alias-label-primary);\n  font-family: inherit;\n  font-size: var(--dsw-font-xs-13);\n  transition: border-color .12s var(--ds-ease-in-out), background .12s var(--ds-ease-in-out);\n  border-radius: 999px;\n  outline: none;\n  padding: 7px 30px 7px 28px;\n}\n\n.nHXo_W_searchInput::placeholder {\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.nHXo_W_searchInput:focus-visible {\n  border-color: var(--dsw-alias-state-business-primary);\n  outline: 2px solid var(--dsw-alias-state-business-primary);\n  outline-offset: 1px;\n}\n\n.nHXo_W_searchClear {\n  width: 20px;\n  height: 20px;\n  color: var(--dsw-alias-label-tertiary);\n  cursor: pointer;\n  font-size: var(--dsw-font-xxs-12);\n  background: none;\n  border: none;\n  border-radius: 50%;\n  place-items: center;\n  line-height: 1;\n  display: grid;\n  position: absolute;\n  right: 6px;\n}\n\n.nHXo_W_searchClear:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n  color: var(--dsw-alias-label-primary);\n}\n\n.nHXo_W_spacer {\n  flex: auto;\n  min-width: 8px;\n}\n\n.nHXo_W_chipGroup {\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 4px;\n  display: inline-flex;\n}\n\n.nHXo_W_chipGroupLabel {\n  color: var(--dsw-alias-label-tertiary);\n  font-size: var(--dsw-font-xxs-12);\n  white-space: nowrap;\n  margin-right: 2px;\n}\n\n.nHXo_W_chip {\n  border: 1px solid var(--dsw-alias-border-l2);\n  color: var(--dsw-alias-label-secondary);\n  font-family: inherit;\n  font-size: var(--dsw-font-xxs-12);\n  cursor: pointer;\n  white-space: nowrap;\n  transition: background .12s var(--ds-ease-in-out), border-color .12s var(--ds-ease-in-out),\n    color .12s var(--ds-ease-in-out);\n  background: none;\n  border-radius: 999px;\n  padding: 3px 10px;\n  line-height: 18px;\n}\n\n.nHXo_W_chip:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n  color: var(--dsw-alias-label-primary);\n}\n\n.nHXo_W_chipActive {\n  background: var(--dsw-alias-state-business-tertiary);\n  border-color: var(--dsw-alias-state-business-primary);\n  color: var(--dsw-alias-label-primary);\n}\n\n.nHXo_W_chipGlyph {\n  margin-right: 4px;\n}\n\n.nHXo_W_tagChipCount {\n  color: var(--dsw-alias-label-tertiary);\n  margin-left: 4px;\n}\n\n.nHXo_W_select {\n  appearance: none;\n  border: 1px solid var(--dsw-alias-border-l2);\n  background: var(--dsw-alias-bg-layer-1);\n  color: var(--dsw-alias-label-secondary);\n  font-family: inherit;\n  font-size: var(--dsw-font-xxs-12);\n  cursor: pointer;\n  background-image: linear-gradient(45deg, #0000 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, #0000 50%);\n  background-position: right 11px center, right 7px center;\n  background-repeat: no-repeat;\n  background-size: 4px 4px, 4px 4px;\n  border-radius: 8px;\n  padding: 5px 24px 5px 10px;\n}\n\n.nHXo_W_select:focus-visible {\n  outline: 2px solid var(--dsw-alias-state-business-primary);\n  outline-offset: 1px;\n}\n\n.nHXo_W_iconButton {\n  color: var(--dsw-alias-label-secondary);\n  font-family: inherit;\n  font-size: var(--dsw-font-xxs-12);\n  cursor: pointer;\n  white-space: nowrap;\n  background: none;\n  border: 1px solid #0000;\n  border-radius: 8px;\n  align-items: center;\n  gap: 5px;\n  padding: 5px 9px;\n  line-height: 18px;\n  display: inline-flex;\n}\n\n.nHXo_W_iconButton:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n  color: var(--dsw-alias-label-primary);\n}\n\n.nHXo_W_iconButton[aria-pressed=\"true\"] {\n  background: var(--dsw-alias-state-business-tertiary);\n  border-color: var(--dsw-alias-state-business-primary);\n  color: var(--dsw-alias-label-primary);\n}\n\n.nHXo_W_iconButton:disabled {\n  opacity: .5;\n  cursor: default;\n}\n\n.nHXo_W_primaryButton {\n  border: 1px solid var(--dsw-alias-border-l2);\n  background: var(--dsw-alias-button-primary-fill);\n  color: var(--dsw-alias-label-primary-foreground);\n  font-family: inherit;\n  font-size: var(--dsw-font-xs-13);\n  cursor: pointer;\n  border-radius: 8px;\n  padding: 6px 14px;\n}\n\n.nHXo_W_primaryButton:hover {\n  background: var(--dsw-alias-button-primary-hover);\n}\n\n.nHXo_W_ghostButton {\n  border: 1px solid var(--dsw-alias-border-l2);\n  color: var(--dsw-alias-label-secondary);\n  font-family: inherit;\n  font-size: var(--dsw-font-xs-13);\n  cursor: pointer;\n  background: none;\n  border-radius: 8px;\n  padding: 6px 14px;\n}\n\n.nHXo_W_ghostButton:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n  color: var(--dsw-alias-label-primary);\n}\n\n.nHXo_W_countLabel {\n  color: var(--dsw-alias-label-tertiary);\n  font-size: var(--dsw-font-xxs-12);\n  white-space: nowrap;\n  font-variant-numeric: tabular-nums;\n}\n\n.nHXo_W_mark {\n  background: var(--dsw-alias-state-business-tertiary);\n  color: var(--dsw-alias-label-primary);\n  border-radius: 3px;\n  padding: 0 1px;\n}\n\n.nHXo_W_importBar {\n  border-bottom: 1px solid var(--dsw-alias-border-l1);\n  background: var(--dsw-alias-bg-layer-1);\n  flex: none;\n  align-items: center;\n  gap: 10px;\n  padding: 8px 20px;\n  display: flex;\n}\n\n.nHXo_W_settingsAnchor {\n  flex: none;\n  position: relative;\n}\n\n.nHXo_W_body {\n  flex: auto;\n  min-height: 0;\n  display: flex;\n  position: relative;\n}\n\n.nHXo_W_visuallyHidden {\n  clip: rect(0 0 0 0);\n  white-space: nowrap;\n  border: 0;\n  width: 1px;\n  height: 1px;\n  margin: -1px;\n  padding: 0;\n  position: absolute;\n  overflow: hidden;\n}\n\n.nHXo_W_curation {\n  border: 1px solid var(--dsw-alias-border-l1);\n  background: var(--dsw-alias-bg-layer-1);\n  border-radius: 12px;\n  flex-direction: column;\n  gap: 8px;\n  padding: 10px 12px;\n  display: flex;\n}\n\n.nHXo_W_dateInput {\n  border: 1px solid var(--dsw-alias-border-l2);\n  background: var(--dsw-alias-bg-base);\n  max-width: 150px;\n  color: var(--dsw-alias-label-primary);\n  font-family: inherit;\n  font-size: var(--dsw-font-xxs-12);\n  border-radius: 8px;\n  padding: 5px 8px;\n}\n\n.nHXo_W_dateInput:focus-visible {\n  outline: 2px solid var(--dsw-alias-state-business-primary);\n  outline-offset: 1px;\n}\n\n.nHXo_W_iconButtonFlagged {\n  border-color: var(--dsw-alias-state-business-primary);\n  color: var(--dsw-alias-label-primary);\n}\n\n.nHXo_W_dangerButton {\n  border: 1px solid var(--dsw-alias-state-error-primary);\n  background: var(--dsw-alias-state-error-tertiary, transparent);\n  color: var(--dsw-alias-state-error-primary);\n  font-family: inherit;\n  font-size: var(--dsw-font-xs-13);\n  cursor: pointer;\n  border-radius: 8px;\n  padding: 6px 14px;\n}\n\n.nHXo_W_dangerButton:hover {\n  background: var(--dsw-alias-interactive-bg-hover-danger);\n}\n\n.nHXo_W_dangerButton:disabled {\n  opacity: .5;\n  cursor: default;\n}\n\n.nHXo_W_undoBar {\n  z-index: 30;\n  border: 1px solid var(--dsw-alias-border-l2);\n  background: var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-1));\n  color: var(--dsw-alias-label-primary);\n  font-size: var(--dsw-font-xxs-12);\n  box-shadow: var(--dsw-shadow-lv3);\n  border-radius: 12px;\n  align-items: center;\n  gap: 14px;\n  padding: 9px 14px;\n  animation: .2s cubic-bezier(.2, .9, .25, 1.2) both nHXo_W_al-undo-in;\n  display: flex;\n  position: absolute;\n  bottom: 18px;\n  left: 50%;\n  transform: translateX(-50%);\n}\n\n@keyframes nHXo_W_al-undo-in {\n  from {\n    opacity: 0;\n    transform: translate(-50%, 8px) scale(.98);\n  }\n\n  to {\n    opacity: 1;\n    transform: translate(-50%) scale(1);\n  }\n}\n\n.nHXo_W_chip, .nHXo_W_iconButton, .nHXo_W_primaryButton, .nHXo_W_ghostButton, .nHXo_W_dangerButton {\n  transition: background .12s var(--ds-ease-in-out),\n    border-color .12s var(--ds-ease-in-out),\n    color .12s var(--ds-ease-in-out),\n    transform .2s cubic-bezier(.2, .9, .25, 1.2);\n}\n\n.nHXo_W_chip:active, .nHXo_W_iconButton:active, .nHXo_W_primaryButton:active, .nHXo_W_ghostButton:active, .nHXo_W_dangerButton:active {\n  transform: scale(.955);\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .nHXo_W_chip, .nHXo_W_iconButton, .nHXo_W_primaryButton, .nHXo_W_ghostButton, .nHXo_W_dangerButton {\n    transition: background .12s linear, border-color .12s linear, color .12s linear;\n  }\n\n  .nHXo_W_chip:active, .nHXo_W_iconButton:active, .nHXo_W_primaryButton:active, .nHXo_W_ghostButton:active, .nHXo_W_dangerButton:active {\n    transform: none;\n  }\n\n  .nHXo_W_undoBar {\n    animation: none;\n    transform: translateX(-50%);\n  }\n}\n.RugfnG_stage {\n  flex-direction: column;\n  flex: auto;\n  min-height: 0;\n  display: flex;\n  position: relative;\n  overflow: hidden;\n}\n\n.RugfnG_wallpaper {\n  background-image: var(--al-wallpaper);\n  pointer-events: none;\n  background-position: center;\n  background-repeat: no-repeat;\n  background-size: cover;\n  position: absolute;\n  inset: 0;\n}\n\n.RugfnG_wallpaperMask {\n  background: var(--dsw-alias-bg-base);\n  opacity: var(--al-wallpaper-mask, .35);\n  pointer-events: none;\n  position: absolute;\n  inset: 0;\n}\n\n.RugfnG_scroller {\n  box-sizing: border-box;\n  scrollbar-color: var(--dsw-alias-scrollbar-thumb) transparent;\n  flex: auto;\n  min-height: 0;\n  padding: 22px;\n  position: relative;\n  overflow: hidden auto;\n}\n\n.RugfnG_scroller::-webkit-scrollbar {\n  width: var(--dsh-scrollbar-width, 10px);\n}\n\n.RugfnG_scroller::-webkit-scrollbar-thumb {\n  background: var(--dsw-alias-scrollbar-bg-l2);\n  border-radius: 999px;\n}\n\n.RugfnG_scroller::-webkit-scrollbar-thumb:hover {\n  background: var(--dsw-alias-scrollbar-hover-l2);\n}\n\n.RugfnG_gridSurface {\n  width: 100%;\n  position: relative;\n}\n\n.RugfnG_card {\n  --al-media-height: 180px;\n  --al-stagger: 0s;\n  box-sizing: border-box;\n  border: 1px solid var(--dsw-alias-border-l1);\n  background: var(--dsw-alias-bg-layer-1);\n  box-shadow: var(--dsw-shadow-lv1);\n  cursor: pointer;\n  transition: transform var(--al-motion-hover) var(--ds-ease-in-out),\n    box-shadow var(--al-motion-hover) var(--ds-ease-in-out),\n    border-color var(--al-motion-hover) var(--ds-ease-in-out);\n  animation: .19s ease-out both RugfnG_al-card-in;\n  animation-delay: var(--al-stagger);\n  border-radius: 14px;\n  flex-direction: column;\n  display: flex;\n  position: relative;\n  overflow: hidden;\n}\n\n@keyframes RugfnG_al-card-in {\n  from {\n    opacity: 0;\n    transform: translateY(6px);\n  }\n\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}\n\n.RugfnG_card:hover, .RugfnG_card:focus-visible {\n  box-shadow: var(--dsw-shadow-lv3);\n  border-color: var(--dsw-alias-border-l2);\n  z-index: 2;\n  transform: translateY(-2px);\n}\n\n.RugfnG_card:focus-visible {\n  outline: 2px solid var(--dsw-alias-state-business-primary);\n  outline-offset: 2px;\n}\n\n.RugfnG_cardSelected {\n  border-color: var(--dsw-alias-state-business-primary);\n  box-shadow: 0 0 0 2px var(--dsw-alias-state-business-primary), var(--dsw-shadow-lv2);\n  animation: RugfnG_al-select-pop var(--al-motion-pop) var(--al-spring) both;\n}\n\n@keyframes RugfnG_al-select-pop {\n  0% {\n    transform: scale(.985);\n  }\n\n  55% {\n    transform: scale(1.022);\n  }\n\n  100% {\n    transform: scale(1);\n  }\n}\n\n.RugfnG_cardMissing {\n  opacity: .64;\n}\n\n.RugfnG_media {\n  width: 100%;\n  height: var(--al-media-height);\n  background: var(--dsw-alias-fill-l2);\n  flex: none;\n  position: relative;\n  overflow: hidden;\n}\n\n.RugfnG_mediaPlaceholder {\n  object-fit: cover;\n  width: 100%;\n  height: 100%;\n  display: block;\n  position: absolute;\n  inset: 0;\n}\n\n.RugfnG_mediaImage {\n  object-fit: cover;\n  opacity: 0;\n  width: 100%;\n  height: 100%;\n  transition: opacity .2s var(--ds-ease-in-out);\n  display: block;\n  position: absolute;\n  inset: 0;\n}\n\n.RugfnG_mediaImageReady {\n  opacity: 1;\n}\n\n.RugfnG_mediaFallback {\n  color: var(--dsw-alias-label-quaternary);\n  background: var(--dsw-alias-fill-l2);\n  place-items: center;\n  font-size: 28px;\n  display: grid;\n  position: absolute;\n  inset: 0;\n}\n\n.RugfnG_mediaSkeleton {\n  background: linear-gradient(100deg,\n    var(--dsw-alias-fill-l2) 30%,\n    var(--dsw-alias-interactive-bg-hover) 50%,\n    var(--dsw-alias-fill-l2) 70%);\n  background-size: 220% 100%;\n  animation: 1.4s linear infinite RugfnG_al-shimmer;\n  position: absolute;\n  inset: 0;\n}\n\n@keyframes RugfnG_al-shimmer {\n  from {\n    background-position: 140% 0;\n  }\n\n  to {\n    background-position: -40% 0;\n  }\n}\n\n.RugfnG_durationBadge {\n  background: var(--dsw-alias-bg-mask-1);\n  color: var(--dsw-alias-label-primary-inverted);\n  font-size: var(--dsw-font-xxxs-11);\n  font-variant-numeric: tabular-nums;\n  border-radius: 6px;\n  padding: 1px 6px;\n  position: absolute;\n  bottom: 10px;\n  right: 10px;\n}\n\n.RugfnG_cornerStack {\n  z-index: 3;\n  flex-direction: column;\n  align-items: flex-start;\n  gap: 4px;\n  display: flex;\n  position: absolute;\n  top: 10px;\n  left: 10px;\n}\n\n.RugfnG_kindBadge {\n  background: var(--dsw-alias-bg-mask-1);\n  color: var(--dsw-alias-label-primary-inverted);\n  font-size: var(--dsw-font-xxxs-11);\n  backdrop-filter: blur(4px);\n  border-radius: 999px;\n  align-items: center;\n  gap: 3px;\n  padding: 1px 7px;\n  display: inline-flex;\n}\n\n.RugfnG_missingBadge {\n  background: var(--dsw-alias-state-warn-primary);\n  color: var(--dsw-alias-state-warn-label);\n  font-size: var(--dsw-font-xxxs-11);\n  border-radius: 999px;\n  padding: 1px 7px;\n}\n\n.RugfnG_sourceBadge {\n  background: var(--dsw-alias-bg-layer-1);\n  border: 1px solid var(--dsw-alias-border-l2);\n  color: var(--dsw-alias-label-secondary);\n  font-size: var(--dsw-font-xxxs-11);\n  border-radius: 999px;\n  padding: 1px 7px;\n}\n\n.RugfnG_moreButton {\n  z-index: 4;\n  border: 1px solid var(--dsw-alias-border-l2);\n  background: var(--dsw-alias-bg-layer-1);\n  width: 26px;\n  height: 26px;\n  color: var(--dsw-alias-label-primary);\n  font-size: var(--dsw-font-xxs-12);\n  cursor: pointer;\n  transition: transform var(--al-motion-pop) var(--al-spring), background .14s var(--ds-ease-in-out);\n  border-radius: 50%;\n  place-items: center;\n  padding: 0;\n  line-height: 1;\n  display: grid;\n  position: absolute;\n  top: 10px;\n  right: 10px;\n}\n\n.RugfnG_moreButton:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n\n.RugfnG_moreButton:active {\n  transform: scale(.9);\n}\n\n.RugfnG_statusStar {\n  z-index: 3;\n  background: var(--dsw-alias-bg-layer-1);\n  border: 1px solid var(--dsw-alias-border-l2);\n  width: 24px;\n  height: 24px;\n  color: var(--dsw-static-amber-400);\n  font-size: var(--dsw-font-xxs-12);\n  border-radius: 50%;\n  place-items: center;\n  line-height: 1;\n  display: grid;\n  position: absolute;\n  top: 10px;\n  right: 42px;\n}\n\n.RugfnG_selectTick {\n  z-index: 5;\n  border: 1.5px solid var(--dsw-alias-border-inverted);\n  background: var(--dsw-alias-state-business-primary);\n  width: 22px;\n  height: 22px;\n  color: var(--dsw-alias-label-primary-inverted);\n  animation: RugfnG_al-select-pop var(--al-motion-pop) var(--al-spring) both;\n  border-radius: 50%;\n  place-items: center;\n  font-size: 12px;\n  line-height: 1;\n  display: grid;\n  position: absolute;\n  top: 10px;\n  right: 42px;\n}\n\n.RugfnG_footer {\n  box-sizing: content-box;\n  align-items: center;\n  gap: 8px;\n  min-height: 24px;\n  padding: 8px 10px;\n  display: flex;\n}\n\n.RugfnG_name {\n  min-width: 0;\n  font-size: var(--dsw-font-xs-13);\n  color: var(--dsw-alias-label-primary);\n  white-space: nowrap;\n  text-overflow: ellipsis;\n  flex: auto;\n  overflow: hidden;\n}\n\n.RugfnG_ratingStars {\n  color: var(--dsw-static-amber-500);\n  font-size: var(--dsw-font-xxxs-11);\n  letter-spacing: -1px;\n  font-variant-numeric: tabular-nums;\n  flex: none;\n}\n\n.RugfnG_ratingStarsEmpty {\n  color: var(--dsw-alias-label-quaternary);\n}\n\n.RugfnG_cardReference {\n  border: 1px solid var(--dsw-alias-button-primary-fill);\n  background: var(--dsw-alias-button-primary-fill);\n  color: var(--dsw-alias-label-primary-foreground);\n  font-family: inherit;\n  font-size: var(--dsw-font-xxxs-11);\n  cursor: pointer;\n  white-space: nowrap;\n  transition: transform var(--al-motion-pop) var(--al-spring), background .14s var(--ds-ease-in-out);\n  border-radius: 8px;\n  flex: none;\n  align-items: center;\n  gap: 4px;\n  padding: 4px 9px;\n  line-height: 1.4;\n  display: inline-flex;\n}\n\n.RugfnG_cardReference:hover {\n  background: var(--dsw-alias-button-primary-hover);\n}\n\n.RugfnG_cardReference:active {\n  transform: scale(.94);\n}\n\n.RugfnG_veil {\n  z-index: 5;\n  opacity: 0;\n  transition: opacity .16s var(--ds-ease-in-out);\n  pointer-events: none;\n  flex-direction: column;\n  justify-content: flex-end;\n  display: flex;\n  position: absolute;\n  inset: 0;\n}\n\n.RugfnG_card:hover .RugfnG_veil, .RugfnG_card:focus-within .RugfnG_veil {\n  opacity: 1;\n}\n\n.RugfnG_veilGradient {\n  background: linear-gradient(to top, var(--dsw-alias-bg-mask-drop) 0%, transparent 58%);\n  position: absolute;\n  inset: 0;\n}\n\n.RugfnG_veilPanel {\n  border: 1px solid var(--dsw-alias-border-l2);\n  background: var(--dsw-alias-bg-overlay);\n  color: var(--dsw-alias-label-primary);\n  box-shadow: var(--dsw-shadow-lv2);\n  pointer-events: auto;\n  border-radius: 10px;\n  flex-direction: column;\n  gap: 6px;\n  margin: 10px;\n  padding: 9px 10px;\n  display: flex;\n  position: relative;\n}\n\n.RugfnG_veilMeta {\n  color: var(--dsw-alias-label-secondary);\n  font-size: var(--dsw-font-xxxs-11);\n  flex-direction: column;\n  gap: 3px;\n  display: flex;\n}\n\n.RugfnG_veilMetaRow {\n  white-space: nowrap;\n  align-items: baseline;\n  gap: 6px;\n  display: flex;\n  overflow: hidden;\n}\n\n.RugfnG_veilMetaKey {\n  opacity: .75;\n  flex: none;\n  min-width: 34px;\n}\n\n.RugfnG_veilMetaValue {\n  text-overflow: ellipsis;\n  flex: auto;\n  min-width: 0;\n  overflow: hidden;\n}\n\n.RugfnG_veilTags {\n  flex-wrap: wrap;\n  gap: 4px;\n  max-height: 42px;\n  display: flex;\n  overflow: hidden;\n}\n\n.RugfnG_veilTag {\n  border: 1px solid var(--dsw-alias-border-l2);\n  font-size: var(--dsw-font-xxxs-11);\n  color: var(--dsw-alias-label-secondary);\n  white-space: nowrap;\n  border-radius: 999px;\n  padding: 1px 6px;\n}\n\n.RugfnG_veilActions {\n  align-items: center;\n  gap: 4px;\n  display: flex;\n}\n\n.RugfnG_veilAction {\n  border: 1px solid var(--dsw-alias-border-l2);\n  background: var(--dsw-alias-bg-layer-1);\n  min-width: 26px;\n  color: var(--dsw-alias-label-primary);\n  font-family: inherit;\n  font-size: var(--dsw-font-xxxs-11);\n  cursor: pointer;\n  white-space: nowrap;\n  transition: transform var(--al-motion-pop) var(--al-spring), background .14s var(--ds-ease-in-out);\n  border-radius: 7px;\n  flex: none;\n  justify-content: center;\n  align-items: center;\n  gap: 4px;\n  padding: 3px 8px;\n  display: inline-flex;\n}\n\n.RugfnG_veilAction:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n\n.RugfnG_veilAction:active {\n  transform: scale(.92);\n}\n\n.RugfnG_ratingOverlay {\n  z-index: 3;\n  background: var(--dsw-alias-bg-mask-1);\n  color: var(--dsw-static-amber-400);\n  font-size: var(--dsw-font-xxxs-11);\n  letter-spacing: -1px;\n  border-radius: 6px;\n  padding: 1px 6px;\n  position: absolute;\n  bottom: 10px;\n  left: 10px;\n}\n\n.RugfnG_veilActionOn {\n  border-color: var(--dsw-alias-state-business-primary);\n  color: var(--dsw-static-amber-500);\n}\n\n.RugfnG_card, .RugfnG_media, .RugfnG_veil, .RugfnG_veilAction, .RugfnG_cardReference, .RugfnG_moreButton, .RugfnG_selectTick {\n  --al-spring: cubic-bezier(.2, .9, .25, 1.2);\n  --al-motion-pop: .19s;\n  --al-motion-hover: .16s;\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .RugfnG_card, .RugfnG_card:hover, .RugfnG_card:focus-visible, .RugfnG_cardSelected, .RugfnG_selectTick {\n    transition: none;\n    animation: none;\n    transform: none;\n  }\n\n  .RugfnG_mediaImage, .RugfnG_veil, .RugfnG_veilAction, .RugfnG_cardReference, .RugfnG_moreButton {\n    transition: none;\n  }\n\n  .RugfnG_mediaSkeleton {\n    animation: none;\n  }\n}\n._3Xsdoq_menu {\n  z-index: 65;\n  box-sizing: border-box;\n  border: 1px solid var(--dsw-alias-border-l2);\n  background: var(--dsw-alias-specific-menu, var(--dsw-alias-bg-layer-1));\n  min-width: 190px;\n  max-width: 260px;\n  box-shadow: var(--dsw-shadow-lv3);\n  color: var(--dsw-alias-label-primary);\n  font-size: var(--dsw-font-xxs-12);\n  border-radius: 10px;\n  flex-direction: column;\n  gap: 1px;\n  padding: 5px;\n  display: flex;\n  position: fixed;\n}\n\n._3Xsdoq_item {\n  box-sizing: border-box;\n  width: 100%;\n  color: var(--dsw-alias-label-primary);\n  font-family: inherit;\n  font-size: var(--dsw-font-xxs-12);\n  text-align: left;\n  cursor: pointer;\n  white-space: nowrap;\n  background: none;\n  border: none;\n  border-radius: 7px;\n  align-items: center;\n  padding: 6px 9px;\n  display: flex;\n}\n\n._3Xsdoq_item:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n\n._3Xsdoq_itemDanger {\n  color: var(--dsw-alias-state-error-primary);\n}\n\n._3Xsdoq_itemDanger:hover {\n  background: var(--dsw-alias-interactive-bg-hover-danger);\n}\n\n._3Xsdoq_section {\n  border-top: 1px solid var(--dsw-alias-border-l1);\n  flex-direction: column;\n  gap: 4px;\n  margin-top: 3px;\n  padding: 6px 9px 8px;\n  display: flex;\n}\n\n._3Xsdoq_sectionLabel {\n  color: var(--dsw-alias-label-tertiary);\n  font-size: var(--dsw-font-xxxs-11);\n}\n\n._3Xsdoq_tagList {\n  flex-wrap: wrap;\n  gap: 4px;\n  max-height: 84px;\n  display: flex;\n  overflow-y: auto;\n}\n\n._3Xsdoq_tag {\n  border: 1px solid var(--dsw-alias-border-l2);\n  color: var(--dsw-alias-label-secondary);\n  font-family: inherit;\n  font-size: var(--dsw-font-xxxs-11);\n  cursor: pointer;\n  white-space: nowrap;\n  background: none;\n  border-radius: 999px;\n  padding: 1px 7px;\n}\n\n._3Xsdoq_tag:hover {\n  border-color: var(--dsw-alias-state-error-primary);\n  color: var(--dsw-alias-state-error-primary);\n}\n\n._3Xsdoq_empty {\n  color: var(--dsw-alias-label-quaternary);\n  font-size: var(--dsw-font-xxxs-11);\n}\n\n._3Xsdoq_inlineForm {\n  align-items: center;\n  gap: 4px;\n  display: flex;\n}\n\n._3Xsdoq_inlineInput {\n  box-sizing: border-box;\n  border: 1px solid var(--dsw-alias-border-l2);\n  background: var(--dsw-alias-bg-base);\n  min-width: 0;\n  color: var(--dsw-alias-label-primary);\n  font-family: inherit;\n  font-size: var(--dsw-font-xxxs-11);\n  border-radius: 6px;\n  flex: auto;\n  padding: 4px 7px;\n}\n\n._3Xsdoq_inlineInput:focus-visible {\n  outline: 2px solid var(--dsw-alias-state-business-primary);\n  outline-offset: 1px;\n}\n\n._3Xsdoq_inlineConfirm {\n  background: var(--dsw-alias-button-primary-fill);\n  color: var(--dsw-alias-label-primary-foreground);\n  font-family: inherit;\n  font-size: var(--dsw-font-xxxs-11);\n  cursor: pointer;\n  border: none;\n  border-radius: 6px;\n  flex: none;\n  padding: 4px 8px;\n}\n.aAKq5a_backdrop {\n  z-index: 40;\n  background: var(--dsw-alias-bg-mask-1);\n  justify-content: center;\n  align-items: center;\n  padding: 24px;\n  display: flex;\n  position: fixed;\n  inset: 0;\n}\n\n.aAKq5a_panel {\n  border: 1px solid var(--dsw-alias-border-l1);\n  background: var(--dsw-alias-bg-layer-1);\n  width: min(760px, 100%);\n  max-height: min(680px, 100%);\n  color: var(--dsw-alias-label-primary);\n  font-family: var(--dsw-font-family);\n  font-size: var(--dsw-font-xs-13);\n  border-radius: 14px;\n  flex-direction: column;\n  display: flex;\n  overflow: hidden;\n  box-shadow: 0 18px 48px #0000003d;\n}\n\n.aAKq5a_header {\n  border-bottom: 1px solid var(--dsw-alias-border-l1);\n  flex: none;\n  align-items: center;\n  gap: 12px;\n  padding: 14px 16px;\n  display: flex;\n}\n\n.aAKq5a_title {\n  white-space: nowrap;\n  margin: 0;\n  font-size: 1em;\n  font-weight: 600;\n}\n\n.aAKq5a_search {\n  border: 1px solid var(--dsw-alias-border-l1);\n  background: var(--dsw-alias-bg-base);\n  min-width: 0;\n  height: 30px;\n  color: inherit;\n  font: inherit;\n  border-radius: 8px;\n  flex: auto;\n  padding: 0 10px;\n}\n\n.aAKq5a_search:focus-visible {\n  outline: 2px solid var(--dsw-alias-button-primary-fill);\n  outline-offset: 1px;\n}\n\n.aAKq5a_grid {\n  flex: auto;\n  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));\n  gap: 12px;\n  margin: 0;\n  padding: 16px;\n  list-style: none;\n  display: grid;\n  overflow-y: auto;\n}\n\n.aAKq5a_cellWrap {\n  min-width: 0;\n}\n\n.aAKq5a_cell, .aAKq5a_cellSelected {\n  border: 1px solid var(--dsw-alias-border-l1);\n  background: var(--dsw-alias-bg-base);\n  width: 100%;\n  color: inherit;\n  font: inherit;\n  text-align: left;\n  cursor: pointer;\n  transition: border-color .14s var(--ds-ease-in-out, ease), background .14s var(--ds-ease-in-out, ease);\n  border-radius: 10px;\n  flex-direction: column;\n  gap: 6px;\n  padding: 8px;\n  display: flex;\n}\n\n.aAKq5a_cell:hover {\n  border-color: var(--dsw-alias-border-l3);\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n\n.aAKq5a_cellSelected {\n  border-color: var(--dsw-alias-button-primary-fill);\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n\n.aAKq5a_cell:focus-visible, .aAKq5a_cellSelected:focus-visible {\n  outline: 2px solid var(--dsw-alias-button-primary-fill);\n  outline-offset: 1px;\n}\n\n.aAKq5a_thumbBox {\n  aspect-ratio: 4 / 3;\n  background: var(--dsw-alias-fill-l2);\n  border-radius: 6px;\n  display: block;\n  position: relative;\n  overflow: hidden;\n}\n\n.aAKq5a_thumb {\n  object-fit: cover;\n  width: 100%;\n  height: 100%;\n  display: block;\n}\n\n.aAKq5a_thumbFallback {\n  width: 100%;\n  height: 100%;\n  color: var(--dsw-alias-label-quaternary);\n  letter-spacing: .06em;\n  justify-content: center;\n  align-items: center;\n  font-size: .85em;\n  display: flex;\n}\n\n.aAKq5a_cellName {\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  display: block;\n  overflow: hidden;\n}\n\n.aAKq5a_cellMeta {\n  color: var(--dsw-alias-label-quaternary);\n  font-size: .9em;\n}\n\n.aAKq5a_mark {\n  background: var(--dsw-alias-button-primary-fill);\n  color: var(--dsw-alias-label-primary-foreground);\n  border-radius: 3px;\n}\n\n.aAKq5a_empty {\n  flex-direction: column;\n  flex: auto;\n  justify-content: center;\n  align-items: center;\n  gap: 12px;\n  padding: 48px 24px;\n  display: flex;\n}\n\n.aAKq5a_emptyText {\n  color: var(--dsw-alias-label-quaternary);\n  margin: 0;\n}\n\n.aAKq5a_footer {\n  border-top: 1px solid var(--dsw-alias-border-l1);\n  flex: none;\n  justify-content: space-between;\n  align-items: center;\n  gap: 12px;\n  padding: 12px 16px;\n  display: flex;\n}\n\n.aAKq5a_count {\n  color: var(--dsw-alias-label-quaternary);\n}\n\n.aAKq5a_actions {\n  gap: 8px;\n  display: flex;\n}\n\n.aAKq5a_primary, .aAKq5a_secondary {\n  font: inherit;\n  cursor: pointer;\n  border-radius: 8px;\n  padding: 5px 14px;\n}\n\n.aAKq5a_primary {\n  border: 1px solid var(--dsw-alias-button-primary-fill);\n  background: var(--dsw-alias-button-primary-fill);\n  color: var(--dsw-alias-label-primary-foreground);\n}\n\n.aAKq5a_primary:hover:not(:disabled) {\n  background: var(--dsw-alias-button-primary-hover);\n}\n\n.aAKq5a_primary:disabled {\n  opacity: .5;\n  cursor: default;\n}\n\n.aAKq5a_secondary {\n  border: 1px solid var(--dsw-alias-border-l2);\n  color: inherit;\n  background: none;\n}\n\n.aAKq5a_secondary:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .aAKq5a_cell, .aAKq5a_cellSelected {\n    transition: none;\n  }\n}\n";
		(function injectAssetLibraryStyles() {
			try {
				var element = document.createElement('style');
				element.setAttribute('data-dsh-asset-library', '');
				element.textContent = __dshAssetLibraryCss;
				document.head.appendChild(element);
			} catch (error) {
				console.warn('dsh-asset-library: stylesheet injection failed', error);
			}
		})();
		return module.exports;
	}
});