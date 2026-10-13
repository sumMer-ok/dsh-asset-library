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
import { createFileRoute, DEFAULT_ROUTE_MAX_BYTES, ROUTE_PATH, statusForFsCode, } from "./host/file-route.js";
/** Plugin identity for `cordis.patch.yml` rows and client-module keying. */
export const name = 'dsh-asset-library';
/** The route needs the connection's Fetch registry; `fs` is probed optionally, never injected. */
export const inject = ['connection'];
export { ROUTE_PATH };
/** Build the policy probe backed by `ctx.fs`, or `undefined` when the capability is absent. */
function filePolicyFrom(ctx) {
    const fs = ctx.get('fs', false);
    if (fs === undefined)
        return undefined;
    return {
        async check(path) {
            const target = await fs.resolve(path);
            const info = await fs.stat(target);
            if (info === undefined) {
                return { kind: 'denied', status: 404, code: 'FS_NOT_FOUND', message: `"${path}" does not exist` };
            }
            if (info.type !== 'file') {
                return { kind: 'denied', status: 403, code: 'FS_NOT_REGULAR_FILE', message: `"${path}" is not a regular file` };
            }
            return { kind: 'allowed', path: fs.processPath(target) };
        },
    };
}
/**
 * Mount the asset-library file route.
 * @param ctx - plugin context carrying the `connection` service.
 * @param config - optional `routeMaxBytes` override from `cordis.patch.yml`.
 */
export function apply(ctx, config) {
    const routeMaxBytes = config?.routeMaxBytes ?? DEFAULT_ROUTE_MAX_BYTES;
    const connection = ctx.get('connection', false);
    if (connection === undefined) {
        throw new Error('dsh-asset-library: the connection service is required to mount the file route');
    }
    const policy = filePolicyFrom(ctx);
    if (policy === undefined) {
        ctx.logger('dsh-asset-library').warn('ctx.fs is not available: the file route reads paths directly and every filesystem policy check is skipped');
    }
    const fetch = createFileRoute({ routeMaxBytes, policy });
    ctx.effect(() => connection.fetch.register({ path: ROUTE_PATH, methods: ['GET', 'HEAD'], requestBody: 'buffered', fetch }), 'dsh-asset-library: file route');
}
export { createFileRoute, statusForFsCode, DEFAULT_ROUTE_MAX_BYTES };
