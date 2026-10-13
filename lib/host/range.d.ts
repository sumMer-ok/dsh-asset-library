/**
 * Range and ETag arithmetic for the asset-library host file route.
 *
 * Deliberately pure: this module imports neither cordis nor any `node:` module,
 * so the parsing rules that decide 200/206/416 responses are unit-testable
 * without a runtime, a filesystem, or an HTTP server.
 * @module dsh-asset-library/host/range
 */
/** Inclusive byte window of a single satisfiable range. */
export interface ByteRange {
    /** First byte, inclusive. */
    start: number;
    /** Last byte, inclusive, already clamped to `size - 1`. */
    end: number;
}
/**
 * `parseRange` outcome. `null` means "no usable Range header, answer with the
 * full entity" — which covers both an absent header and a syntactically invalid
 * one, because RFC 9110 requires an invalid `Range` to be ignored rather than
 * rejected. The `'unsatisfiable'` sentinel means the header was well formed but
 * cannot be met for this size and must produce `416`.
 */
export type RangeResult = ByteRange | null | 'unsatisfiable';
/**
 * Parse a single `Range: bytes=...` request header against a known entity size.
 *
 * Supports `bytes=a-b`, `bytes=a-` and `bytes=-n`. A multi-range request
 * (`bytes=a-b,c-d`) serves its first range only, which RFC 9110 permits for a
 * server that does not emit `multipart/byteranges`.
 *
 * @param header - raw `Range` header value, or `undefined`/`null` when absent.
 * @param size - entity size in bytes.
 * @returns the inclusive window, `null` to serve the full entity, or `'unsatisfiable'` for `416`.
 */
export declare function parseRange(header: string | null | undefined, size: number): RangeResult;
/**
 * Build the entity tag sent as `ETag` and compared against `If-Range`.
 *
 * The value embeds both size and modification time so any content change that
 * also changes the file's length or mtime invalidates a resumable download.
 *
 * @param size - entity size in bytes.
 * @param mtimeMs - last modification time in milliseconds since the epoch.
 * @returns the quoted entity tag, e.g. `"1024-1700000000000"`.
 */
export declare function etagFor(size: number, mtimeMs: number): string;
/**
 * Decide whether an `If-Range` validator still matches the current entity tag.
 *
 * Only a strong entity-tag match resumes a partial response. A date validator
 * and a weak tag (`W/"..."`) never match here: this route has no second-level
 * precision guarantee, so revalidating with a full `200` is always correct.
 *
 * @param ifRange - raw `If-Range` header value, or `undefined`/`null` when absent.
 * @param etag - current entity tag from {@link etagFor}.
 * @returns `true` when the range may be served as `206`.
 */
export declare function ifRangeMatches(ifRange: string | null | undefined, etag: string): boolean;
