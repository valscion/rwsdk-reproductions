# Server-action response headers regression (rwsdk 1.3.0)

This reproduction targets a reported regression in RedwoodSDK:

> **Headers written to `requestInfo.response.headers` inside a React Server
> Action are no longer applied to the action's response (regression in `rwsdk`
> 1.3.0).**

When a `"use server"` function — invoked from a client component via
`useActionState` / `<form action={…}>` — mutates the response headers through
`requestInfo.response.headers` (for example to append a `Set-Cookie`, exactly
what `rwsdk/auth`'s `defineSessionStore(...).save()` does), the header is
reported to be **missing from the HTTP response of the action request** on
`rwsdk >= 1.3.0`. The action body still returns normally, but the header (e.g. a
session cookie) never reaches the browser. Header mutations during normal
document (RSC render) requests are reported to still work — only the
server-action request path is said to drop them.

| | |
|---|---|
| `rwsdk` | reported broken: **1.3.0, 1.3.1, 1.3.2, 1.3.3** — last working: **1.3.0-canary.5** |
| `@cloudflare/vite-plugin` | 1.42.1 |
| `wrangler` | 4.103.0 |
| `vite` | 8.0.16 |
| `react` / `react-dom` / `react-server-dom-webpack` | 19.2.7 |
| package manager | `pnpm` |
| runtime | built worker (`vite build` + `vite preview`, i.e. workerd / miniflare) |

This repo is pinned to `rwsdk@1.3.0` by default. Switch versions with
`pnpm add rwsdk@1.3.0-canary.5` / `pnpm add rwsdk@1.3.0`.

## The setup

A deliberately minimal RedwoodSDK app:

- `src/app/pages/actions.ts` — a `"use server"` action `setHeaderFromAction`
  that writes to `requestInfo.response.headers`:
  ```ts
  response.headers.set("x-action-response-header", "set-from-server-action");
  response.headers.append("set-cookie", "repro_action_cookie=…");
  ```
  This is the same operation a cookie/session store performs;
  `defineSessionStore(...).save(headers, …)` is literally
  `headers.set("Set-Cookie", …)`, so a plain header keeps the repro free of any
  auth/session machinery while exercising the exact mechanism.
- `src/app/components/ActionForm.tsx` — a `"use client"` component that invokes
  the action through `useActionState` + `<form action={…}>` (the reported
  trigger).
- `src/app/headers.ts` — middleware that sets `x-common-response-header` on every
  response, as a **control**: it proves the worker can emit a custom header.

## Run

```
pnpm install
pnpm build      # vite build
pnpm preview    # serves the built worker on http://localhost:5252
```

Then either open the page in a browser and submit the form while watching the
**POST** request's response headers in devtools, or probe the server directly:

```
node scripts/verify.mjs       # or: BASE=http://localhost:5252 node scripts/verify.mjs
```

## What this repo reproduces — and what it does not

> **Important, honest caveat.** Probing the built worker over HTTP, I could
> **not** reproduce an observable difference between `rwsdk@1.3.0-canary.5` and
> `rwsdk@1.3.0` for the server-action response headers. On **both** versions the
> RSC action POST (the path `useActionState` uses once hydrated) emits the
> action's `Set-Cookie` and custom header correctly.

`scripts/verify.mjs` output is **identical** on both versions:

```
GET / (control header)      status=200  x-common-response-header="set-from-middleware"
RSC action POST (hydrated)  status=200  x-action-response-header="set-from-server-action"  set-cookie="repro_action_cookie=…"
Native (no-JS) form POST    status=200  x-action-response-header=MISSING                   set-cookie=MISSING
```

(The "native form POST" path — React's progressive-enhancement encoding with
`$ACTION_REF_1` and no `__rsc` params — drops the action headers, but it does so
on **both** versions, so it is not the regression either.)

### Why the HTTP layer looks identical

The rwsdk runtime file that assembles the response and merges
`requestInfo.response.headers` onto it
(`dist/runtime/worker.js`) is **byte-for-byte identical** between
`1.3.0-canary.5` and `1.3.0`. The only runtime files that changed between the
two versions are on the **browser client / hydration / navigation** path
(`runtime/client/client.js` — adds `configureRecovery`,
`runtime/client/navigation.js`, `runtime/render/assembleDocument.js` &
`renderDocumentHtmlStream.js` — remove a `__webpack_require__` init shim,
`runtime/lib/router.js` — `except`/`prefix` scoping), plus build-time Vite
plugins (server actions are now code-split into separate worker chunks). None of
those touch how an action's response headers are merged server-side — which
matches the observation that the raw action POST response is unchanged.

That points to the regression manifesting via the **browser client / hydration**
path rather than the raw action POST response — e.g. hydration or the
post-action client navigation behaving differently on 1.3.0 — which this
HTTP-level repro does not capture.

### Matrix tested (built worker + preview, both versions identical)

| invocation path | canary.5 | 1.3.0 |
|---|---|---|
| document GET (control header) | present | present |
| RSC action POST — sync action | headers set | headers set |
| RSC action POST — async (`setTimeout` / real `fetch`) before write | set | set |
| RSC action POST — action calls a 2nd `"use server"` module | set | set |
| RSC action POST — nested `prefix()` inside `render()` | set | set |
| RSC action POST — middleware + action both write `Set-Cookie` | action wins | action wins |
| RSC action POST — `multipart` vs `text` body | set | set |
| RSC action POST — `vite build --mode test` | set | set |
| RSC action POST — real `defineSessionStore().save()` | cookie set | cookie set |
| native (no-JS) `$ACTION_REF` form POST | dropped | dropped |

### Not yet verified here

A faithful **browser** reproduction (driving the real `useActionState` form and
inspecting the action POST in devtools / via Playwright) could not be run in the
environment this repo was authored in: no Chromium is available and the
Playwright browser download is blocked. The `rwsdk@1.3.0` **dev** server also
fails to boot here for an unrelated dependency-optimization error
(`"ssrWebpackRequire" is not exported by …/no-react-server.js`), so only
`build` + `preview` was exercised.

If you can reproduce the missing `Set-Cookie` in a browser, capturing the exact
action POST request/response (and whether hydration succeeded) would pin down
whether the drop happens server-side under some condition not covered above, or
purely client-side.
