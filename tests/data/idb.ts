import { IDBFactory } from 'fake-indexeddb'

/**
 * IndexedDB 测试辅助：全新库 + 确定性的写事务失败注入。
 *
 * 注入刻意打在 `IDBDatabase.prototype.transaction` 上，而不是 `vi.mock` 包一层 `openDb`：
 * `db.ts` / `store.ts` 内部引用的是模块内的 `openDb` 绑定，spy 导出的函数拦不住；
 * 而 `vi.mock` 与 `vi.resetModules()` 组合会把模块注册表泄漏到同进程的其它 spec 文件，
 * 造成跨文件数据串库。改打原型既覆盖所有既有连接，也不动模块图。
 */

/** 重置全局 indexedDB（并让调用方清掉 db.ts 的连接缓存）。 */
export function freshIndexedDb(): void {
  globalThis.indexedDB = new IDBFactory()
}

/** 真实 `transaction` 描述符（安装/卸载注入的基准）。 */
const realTransactionDescriptor = (): PropertyDescriptor =>
  Object.getOwnPropertyDescriptor(IDBDatabase.prototype, 'transaction') as PropertyDescriptor

/** 故障注入句柄。 */
export interface TxFault {
  /** 已注入的失败次数。 */
  failures: () => number;
  /** `transaction()` 被调用的总次数（失败次数 + 真实事务次数）。 */
  calls: () => number;
  /** 卸载注入，恢复真实方法。 */
  restore: () => void;
}

/**
 * 让接下来 `times` 次 `IDBDatabase.transaction()` 返回一个立即 abort 的假事务。
 * @param times 注入的失败次数；用尽后透传真实事务（因此「重放 3 次」表现为共 4 次调用）。
 * @returns 可查询次数并恢复原状的句柄。
 */
export function injectTransactionFailures(times: number): TxFault {
  const original = realTransactionDescriptor()
  const real = original.value as (this: IDBDatabase, stores: string | string[], mode?: IDBTransactionMode) => IDBTransaction
  let left = times
  let failures = 0
  let calls = 0
  Object.defineProperty(IDBDatabase.prototype, 'transaction', {
    configurable: true,
    writable: true,
    value: function patchedTransaction(this: IDBDatabase, ...args: unknown[]): IDBTransaction {
      calls += 1
      // 只拦截 assets 的读写事务（写入路径）。若连读事务一起拦截，
      // 假事务会让 IndexedDB 的真实读事务排队等待，测试直接死锁。
      const stores = args[0]
      const isAssetWrite =
        args[1] === 'readwrite' && (stores === 'assets' || (Array.isArray(stores) && stores.includes('assets')))
      if (left > 0 && isAssetWrite) {
        left -= 1
        failures += 1
        // 失败事务：`oncomplete` 永不触发，`abort()` 触发 `onabort`。
        // 这是纯内存对象，不在 IndexedDB 里注册，因此不会阻塞其它事务。
        const target: Record<string, unknown> = { error: null, onabort: null, onerror: null, oncomplete: null }
        target.abort = (): void => {
          void Promise.resolve().then(() =>
            (target.onabort as ((e: Event) => void) | null)?.call(target, new Event('abort')),
          )
        }
        return target as unknown as IDBTransaction
      }
      return real.apply(this, args as [string | string[], IDBTransactionMode?])
    },
  })
  return {
    failures: () => failures,
    calls: () => calls,
    restore: () => {
      Object.defineProperty(IDBDatabase.prototype, 'transaction', original)
    },
  }
}

/** 直接以原始 IDB 写入（绕过 db.ts 的校验），用于构造损坏数据。 */
export function rawPut(db: IDBDatabase, store: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('rawPut 失败'))
    tx.objectStore(store).put(value)
  })
}

/** 直接以原始 IDB 读取。 */
export function rawGet<T>(db: IDBDatabase, store: string, key: IDBValidKey): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).get(key)
    req.onsuccess = () => resolve(req.result as T)
    req.onerror = () => reject(req.error ?? new Error('rawGet 失败'))
  })
}
