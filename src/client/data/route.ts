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
export const FILE_ROUTE = '/api/plugins/dsh-asset-library/file'

/**
 * Build the read URL for one asset path.
 * @param path - Absolute host path of the asset.
 * @returns A same-origin URL for `fetch`, `<img>`, `<video>`, or a HEAD probe.
 */
export function fileUrl(path: string): string {
  return `${FILE_ROUTE}?path=${encodeURIComponent(path)}`
}
