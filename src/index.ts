/**
 * dsh-asset-library — host half.
 *
 * Registers one exact Fetch route that streams an on-disk asset with HTTP
 * `Range` support, so the library's browser half can preview and play video
 * from a disk path without copying bytes into IndexedDB.
 *
 * The route lives on `ctx.connection.fetch` rather than `ctx.webServer`: that is
 * the exact-route registry the core `/api/file` route uses, so every request
 * passes the connection's browser-cookie and Host/Origin trust checks before a
 * byte is read. When the composed application exposes the `fs` capability,
 * every request is additionally resolved and stat'ed through it (path policy,
 * sandbox refusals); otherwise the route reads the path directly and says so
 * once, loudly, at mount time.
 * @module dsh-asset-library
 */

import type { Context } from '@deepseek-ai/cordis'

import {
  createFileRoute,
  DEFAULT_ROUTE_MAX_BYTES,
  ROUTE_PATH,
  statusForFsCode,
  type FilePolicy,
  type FileRouteHandler,
  type PolicyOutcome,
} from './host/file-route.ts'

/** Plugin identity for `cordis.patch.yml` rows and client-module keying. */
export const name = 'dsh-asset-library'

/** The route needs the connection's Fetch registry; `fs` is probed optionally, never injected. */
export const inject = ['connection']

/** Deployment-varying knobs, supplied from `cordis.patch.yml` under `config`. */
export interface Config {
  /** Largest entity the file route serves per request. Defaults to 64 MiB. */
  routeMaxBytes?: number
}

export { ROUTE_PATH }

/**
 * Minimal shape of the `fs` capability this plugin reads.
 *
 * Declared structurally instead of importing `@deepseek-ai/dsh-fs` so the plugin
 * keeps working against any provider that answers these three calls.
 */
interface FsCapability {
  resolve(path: string, opts?: { signal?: AbortSignal }): Promise<{ targetKey: unknown }>
  stat(target: { targetKey: unknown }, signal?: AbortSignal): Promise<{ type: string } | undefined>
  processPath(target: { targetKey: unknown }): string
}

/** One exact Fetch route record, as the connection's registry accepts it. */
interface FetchRouteSpec {
  /** Exact pathname; a duplicate registration throws. */
  path: string
  /** Allowed methods; any other method on this path is unclaimed and answers 404. */
  methods: readonly string[]
  /** Whether the bridge buffers a request body before dispatch. */
  requestBody: 'buffered' | 'streaming'
  /** The handler the bridge calls once the request is admitted. */
  fetch: FileRouteHandler
}

/** The `connection` slice this plugin uses, declared structurally to avoid a module augmentation. */
interface ConnectionService {
  /** Exact-route registry behind the single `/api` bridge. */
  fetch: {
    /**
     * Register one exact route.
     * @param spec - path, methods, body mode, and handler.
     * @returns the disposer removing the route.
     */
    register(spec: FetchRouteSpec): () => void
  }
}

/** Build the policy probe backed by `ctx.fs`, or `undefined` when the capability is absent. */
function filePolicyFrom(ctx: Context): FilePolicy | undefined {
  const fs = ctx.get('fs', false) as FsCapability | undefined
  if (fs === undefined) return undefined
  return {
    async check(path: string): Promise<PolicyOutcome> {
      const target = await fs.resolve(path)
      const info = await fs.stat(target)
      if (info === undefined) {
        return { kind: 'denied', status: 404, code: 'FS_NOT_FOUND', message: `"${path}" does not exist` }
      }
      if (info.type !== 'file') {
        return { kind: 'denied', status: 403, code: 'FS_NOT_REGULAR_FILE', message: `"${path}" is not a regular file` }
      }
      return { kind: 'allowed', path: fs.processPath(target) }
    },
  }
}

/**
 * Mount the asset-library file route.
 * @param ctx - plugin context carrying the `connection` service.
 * @param config - optional `routeMaxBytes` override from `cordis.patch.yml`.
 */
export function apply(ctx: Context, config?: Config): void {
  const routeMaxBytes = config?.routeMaxBytes ?? DEFAULT_ROUTE_MAX_BYTES
  const connection = ctx.get('connection', false) as ConnectionService | undefined
  if (connection === undefined) {
    throw new Error('dsh-asset-library: the connection service is required to mount the file route')
  }
  const policy = filePolicyFrom(ctx)
  if (policy === undefined) {
    ctx.logger('dsh-asset-library').warn(
      'ctx.fs is not available: the file route reads paths directly and every filesystem policy check is skipped',
    )
  }
  const fetch = createFileRoute({ routeMaxBytes, policy })
  ctx.effect(
    () => connection.fetch.register({ path: ROUTE_PATH, methods: ['GET', 'HEAD'], requestBody: 'buffered', fetch }),
    'dsh-asset-library: file route',
  )
}

export { createFileRoute, statusForFsCode, DEFAULT_ROUTE_MAX_BYTES }
