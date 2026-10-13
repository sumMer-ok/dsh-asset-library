# dsh-asset-library

A DSH material library: drag local images, video and documents in, get thumbnails and metadata in
IndexedDB, browse them in a filterable gallery, and reference an asset into a conversation — while
the original file is never copied, only linked by its absolute disk path.

This package is the plugin skeleton plus the host file route. It ships two halves:

- **host** (`lib/index.js`) — registers one exact HTTP route that streams an on-disk asset with
  `Range` support, so video plays and seeks without the plugin ever buffering the file.
- **client** (`lib/client.js`) — a `window.__ModuleLoader__` bundle that registers the materials
  panel into the `agent-profile.materials` slot.

## Install

```sh
dsh plugin --profile desktop add dsh-asset-library
```

Installing declares this package's `cordis.patch.yml` as a bundle patch, so the profile boot mounts
the plugin row without editing any profile file by hand. **The first mount of a new plugin needs a
desktop restart**: `client-modules` caches client bundle metadata by package name and never expires
it. After that, client-half changes apply on refresh; host-half changes need a restart.

## Build

```sh
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
pnpm install
pnpm run typecheck   # tsc over the host face and the client face
pnpm run build       # tsc emits the host half into lib/, tsdown emits lib/client.js
pnpm run test        # vitest
```

`build` runs `tsc -p tsconfig.json` first (host half, `lib/index.js` + `lib/host/*.js` +
declarations) and then `tsdown` (client bundle, `lib/client.js`, `clean: false` so it does not wipe
the compiler's output).

## Layout

| Path | Owner | Purpose |
|---|---|---|
| `src/index.ts` | this package | Host plugin: mounts the file route, probes `ctx.fs`. |
| `src/host/file-route.ts` | this package | `GET\|HEAD /api/plugins/dsh-asset-library/file?path=<absolute path>` (exact Fetch route). |
| `src/host/range.ts` | this package | Pure `Range` / `ETag` arithmetic; no cordis or `node:` imports, so it unit-tests directly. |
| `src/client/index.tsx` | this package | Client entry: registers the panel into `agent-profile.materials`. |
| `src/client/data/**` | data layer | IndexedDB, hashing, thumbnails, filters, store. |
| `src/client/ui/**` | gallery UI | Toolbar, masonry gallery, lightbox, empty/loading/error states. |

## Host file route

```
GET|HEAD /api/plugins/dsh-asset-library/file?path=<absolute path>
```

Mounted as one **exact Fetch route** on `ctx.connection.fetch`
(`{ path, methods: ['GET','HEAD'], requestBody: 'buffered', fetch }`), which is
the same registry the core `/api/file` route uses. Requests therefore pass the
connection's Host/Origin trust and browser-cookie admission before a byte is
read, and the desktop carrier reaches it because `dsh-app://app` forwards every
path to the host HTTP server. The handler is Fetch-shaped
(`(request: Request) => Promise<Response>`), not a `node:http` handler; the body
is a `Readable.toWeb` stream, so no entity is ever buffered.

| Status | Condition |
|---|---|
| 400 | `path` missing, empty, or not absolute |
| 403 | Policy refusal (`FS_PERMISSION_DENIED`, `FS_SANDBOX_DENIED`, `FS_NOT_REGULAR_FILE`), or the path is not a regular file |
| 404 | Path absent (`FS_NOT_FOUND`) |
| 405 | Method other than `GET`/`HEAD` |
| 413 | Entity larger than `routeMaxBytes` (default 64 MiB) |
| 416 | Well-formed `Range` that cannot be satisfied; carries `Content-Range: bytes */<size>` |
| 206 | Satisfiable `Range`; carries `Content-Range: bytes a-b/<size>` |
| 200 | No `Range`, or an `If-Range` validator that no longer matches the current `ETag` |

Success responses carry `Content-Type` (`mime-types`, falling back to
`application/octet-stream`), `Accept-Ranges: bytes`, `Content-Length`, `Cache-Control: private,
max-age=60`, and `ETag: "<size>-<mtimeMs>"`. The body is streamed with `createReadStream` wrapped by
`Readable.toWeb` into one `Response`; nothing is buffered. `HEAD` returns headers only.

### Filesystem policy

When the running application composes the `fs` capability, every request is resolved and stat'ed
through it before a byte is read, so sandbox and workspace policy apply and a refusal is reported as
`403`/`404` with the `FsError` code in the JSON body. When `fs` is absent the route reads the path
directly and **the host half logs one warning at mount time** — the degradation is never silent.

### Configuration

```yaml
- insert:
    - id: asset-library
      name: 'dsh-asset-library'
      config:
        routeMaxBytes: 67108864   # bytes per response; default 64 MiB
```

## Registration contract

`src/index.ts` registers on `ctx.webServer` with the route record the shipped runtime reads:

```ts
ctx.webServer.register({ kind: 'exact', path: ROUTE_PATH, handler })
```

`kind: 'exact'` matters: `@deepseek-ai/dsh-client-modules` already owns the `/plugins` prefix, and
exact routes are matched before the prefix table, so this route wins for its own path only.

## Known limitations

- **Range requests are single-range only.** A multi-range request serves its first range; the route
  never emits `multipart/byteranges`.
- **`If-Range` accepts a strong entity tag only.** A date validator or a weak tag always falls back
  to a full `200`, which is correct but costs a full transfer.
- **ETag strength is size + mtime.** A content change that preserves both is not detected; the tag is
  a resume guard, not a content digest.
- **`routeMaxBytes` caps one response**, not the file. A file larger than the cap is refused with
  `413` rather than served in chunks, so a file above the cap cannot be previewed at all.
- **The client panel is a stub.** It renders the real storage rule, but the gallery, toolbar and
  lightbox live in `src/client/ui/**` and are wired in during assembly.
- **`fs` is probed, not injected.** Without it the route still works but no filesystem policy is
  enforced; only the mount-time warning announces that state.
- **Browser profile (`dsh web`) is out of scope.** The library relies on the desktop origin
  `dsh-app://app` for stable IndexedDB and `window.__DSH_HOST_PATHS__`.
