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
/**
 * Absolute route path registered on `ctx.connection.fetch`.
 *
 * It sits under `/api/` because that is the one bridge the connection owns
 * (every other pathname on that channel is unclaimed and answers `404`).
 */
export declare const ROUTE_PATH = "/api/plugins/dsh-asset-library/file";
/** Response ceiling per request when the plugin config omits `routeMaxBytes`. */
export declare const DEFAULT_ROUTE_MAX_BYTES: number;
/** Outcome of a filesystem-policy probe: the readable path, or a refusal carrying its HTTP status. */
export type PolicyOutcome = {
    kind: 'allowed';
    path: string;
} | {
    kind: 'denied';
    status: number;
    code: string;
    message: string;
};
/**
 * Policy probe applied before any byte is read. The host half supplies one
 * backed by `ctx.fs`; without it the route reads the path directly.
 */
export interface FilePolicy {
    /**
     * Resolve and authorize one request path.
     * @param path - the raw `path` query parameter, already checked as absolute.
     * @returns the readable path, or the refusal to render.
     */
    check(path: string): Promise<PolicyOutcome>;
}
/** Construction inputs for {@link createFileRoute}. */
export interface FileRouteOptions {
    /** Largest entity this route will serve; a bigger file is `413`. */
    routeMaxBytes: number;
    /** Optional filesystem-policy probe. */
    policy?: FilePolicy | undefined;
}
/** One exact Fetch route handler: the connection bridge calls it with the admitted request. */
export type FileRouteHandler = (request: Request) => Promise<Response>;
/** HTTP status for a typed `FsErrorCode` (see `@deepseek-ai/dsh-fs` `FsErrorCode`). */
export declare function statusForFsCode(code: string): number;
/**
 * Build the route handler.
 * @param options - response ceiling and the optional policy probe.
 * @returns a handler suitable for `ctx.connection.fetch.register({ path, methods, requestBody, fetch })`.
 */
export declare function createFileRoute(options: FileRouteOptions): FileRouteHandler;
