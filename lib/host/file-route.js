/**
 * The asset-library host file route: `GET|HEAD /api/plugins/dsh-asset-library/file?path=<absolute path>`.
 *
 * Serves one regular file with `Range` support so the library can play and seek
 * video from a disk path that is never copied into IndexedDB. Every response
 * carries `Accept-Ranges` plus an `ETag` derived from size and mtime, and a
 * `Range` request whose `If-Range` validator no longer matches falls back to a
 * full `200` instead of a `206` over changed bytes.
 *
 * The handler is the **Fetch** shape (`Request` in, `Response` out), registered
 * on `ctx.connection.fetch` — the same exact-route registry the core `/api/file`
 * route and `dsh-client-file-upload` use, which is why this route inherits the
 * browser cookie and Host/Origin trust checks instead of being an open local
 * file read. The entity is never buffered: the body is a `Readable.toWeb`
 * stream over `createReadStream`.
 * @module dsh-asset-library/host/file-route
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { lookup } from 'mime-types';
import { etagFor, ifRangeMatches, parseRange } from "./range.js";
/**
 * Absolute route path registered on `ctx.connection.fetch`.
 *
 * It sits under `/api/` because that is the one bridge the connection owns
 * (every other pathname on that channel is unclaimed and answers `404`).
 */
export const ROUTE_PATH = '/api/plugins/dsh-asset-library/file';
/** Response ceiling per request when the plugin config omits `routeMaxBytes`. */
export const DEFAULT_ROUTE_MAX_BYTES = 64 * 1024 * 1024;
/** HTTP status for a typed `FsErrorCode` (see `@deepseek-ai/dsh-fs` `FsErrorCode`). */
export function statusForFsCode(code) {
    switch (code) {
        case 'FS_NOT_FOUND':
            return 404;
        case 'FS_PERMISSION_DENIED':
        case 'FS_SANDBOX_DENIED':
        case 'FS_NOT_REGULAR_FILE':
            return 403;
        case 'FS_TOO_LARGE':
            return 413;
        default:
            return 500;
    }
}
/** Whether an unknown thrown value carries a string `code` (the `FsError` discriminator). */
function fsErrorCode(error) {
    if (typeof error !== 'object' || error === null)
        return undefined;
    const code = error.code;
    return typeof code === 'string' && code.startsWith('FS_') ? code : undefined;
}
/** One JSON error body; `code` is always visible to the caller, never collapsed into a bare status. */
function errorResponse(status, code, message) {
    return new Response(JSON.stringify({ ok: false, error: { code, message } }), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
        },
    });
}
/** Content type for an extension, or the binary fallback. */
function contentTypeFor(path) {
    return lookup(path) || 'application/octet-stream';
}
/**
 * Build the route handler.
 * @param options - response ceiling and the optional policy probe.
 * @returns a handler suitable for `ctx.connection.fetch.register({ path, methods, requestBody, fetch })`.
 */
export function createFileRoute(options) {
    const routeMaxBytes = options.routeMaxBytes;
    return async function handleFileRoute(request) {
        const method = request.method.toUpperCase();
        if (method !== 'GET' && method !== 'HEAD') {
            return errorResponse(405, 'method-not-allowed', `${method} is not supported by this route`);
        }
        const url = new URL(request.url);
        const requested = url.searchParams.get('path');
        if (requested === null || requested === '' || !isAbsolute(requested)) {
            return errorResponse(400, 'bad-request', 'the "path" query parameter must be an absolute file path');
        }
        let readablePath = resolve(requested);
        if (options.policy !== undefined) {
            let outcome;
            try {
                outcome = await options.policy.check(requested);
            }
            catch (error) {
                const code = fsErrorCode(error) ?? 'FS_IO_ERROR';
                return errorResponse(statusForFsCode(code), code, error instanceof Error ? error.message : String(error));
            }
            if (outcome.kind === 'denied') {
                return errorResponse(outcome.status, outcome.code, outcome.message);
            }
            readablePath = outcome.path;
        }
        let size;
        let mtimeMs;
        try {
            const info = await stat(readablePath);
            if (!info.isFile()) {
                return errorResponse(403, 'not-a-regular-file', 'the requested path is not a regular file');
            }
            size = info.size;
            mtimeMs = info.mtimeMs;
        }
        catch (error) {
            const code = fsErrorCode(error);
            if (code !== undefined) {
                return errorResponse(statusForFsCode(code), code, error instanceof Error ? error.message : String(error));
            }
            const missed = error.code;
            if (missed === 'ENOENT' || missed === 'ENOTDIR') {
                return errorResponse(404, 'not-found', 'the requested file does not exist');
            }
            if (missed === 'EACCES' || missed === 'EPERM') {
                return errorResponse(403, 'permission-denied', 'the requested file is not readable');
            }
            return errorResponse(500, 'internal', error instanceof Error ? error.message : String(error));
        }
        if (size > routeMaxBytes) {
            return errorResponse(413, 'too-large', `the file is ${size} bytes; this route serves at most ${routeMaxBytes} bytes per request`);
        }
        const etag = etagFor(size, mtimeMs);
        const headers = {
            'Content-Type': contentTypeFor(readablePath),
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'private, max-age=60',
            'ETag': etag,
        };
        const rawIfRange = request.headers.get('if-range');
        const range = rawIfRange !== null && !ifRangeMatches(rawIfRange, etag)
            ? null
            : parseRange(request.headers.get('range') ?? undefined, size);
        if (range === 'unsatisfiable') {
            return new Response(null, {
                status: 416,
                headers: { ...headers, 'Content-Range': `bytes */${size}`, 'Content-Length': '0' },
            });
        }
        if (range === null && size === 0) {
            return new Response(null, { status: 200, headers: { ...headers, 'Content-Length': '0' } });
        }
        const start = range === null ? 0 : range.start;
        const end = range === null ? size - 1 : range.end;
        const status = range === null ? 200 : 206;
        if (range !== null)
            headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
        headers['Content-Length'] = String(end - start + 1);
        if (method === 'HEAD') {
            // A HEAD reply carries the same headers as GET and no body, so no stream is opened.
            return new Response(null, { status, headers });
        }
        const nodeStream = createReadStream(readablePath, { start, end });
        // One `Response` owns status and headers; its web-stream body reaches the socket without
        // buffering, so a 2 GB video never lands in memory.
        const body = Readable.toWeb(nodeStream);
        return new Response(body, { status, headers });
    };
}
