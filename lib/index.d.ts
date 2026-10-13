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
import type { Context } from '@deepseek-ai/cordis';
import { createFileRoute, DEFAULT_ROUTE_MAX_BYTES, ROUTE_PATH, statusForFsCode } from './host/file-route.ts';
/** Plugin identity for `cordis.patch.yml` rows and client-module keying. */
export declare const name = "dsh-asset-library";
/** The route needs the connection's Fetch registry; `fs` is probed optionally, never injected. */
export declare const inject: string[];
/** Deployment-varying knobs, supplied from `cordis.patch.yml` under `config`. */
export interface Config {
    /** Largest entity the file route serves per request. Defaults to 64 MiB. */
    routeMaxBytes?: number;
}
export { ROUTE_PATH };
/**
 * Mount the asset-library file route.
 * @param ctx - plugin context carrying the `connection` service.
 * @param config - optional `routeMaxBytes` override from `cordis.patch.yml`.
 */
export declare function apply(ctx: Context, config?: Config): void;
export { createFileRoute, statusForFsCode, DEFAULT_ROUTE_MAX_BYTES };
