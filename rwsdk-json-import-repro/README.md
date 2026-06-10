# Importing a JSON file crashes the dev server

A JSON file that is imported from a module ending up in **both** the client and
server bundles crashes the rwsdk dev server while it scans for `"use client"` /
`"use server"` directives. This happens both for a plain `import x from "foo.json"`
and for `import x from "foo.json?raw"`.

This is the case discussed in the rwsdk Discord (June 2026) and worked around in
[venuu/conversations](https://github.com/venuu/conversations) with a custom
`jsonModulePlugin`.

## Versions

- `rwsdk@1.3.0-canary.5`
- `vite@8.0.16`
- `@cloudflare/vite-plugin@1.39.0`
- `react@19.2.7` / `react-dom@19.2.7` / `react-server-dom-webpack@19.2.7`
- package manager: `pnpm`

## Setup

```
pnpm install
pnpm dev
```

## The setup that triggers the bug

- `src/app/data/sample.json` is a plain JSON file.
- `src/app/pages/Home.tsx` (a **server** component) imports it.
- `src/app/components/JsonBadge.tsx` (a `"use client"` component, also rendered
  by `Home`) imports the **same** file.

So the JSON file is pulled into both the server/SSR (worker) bundle and the
client bundle. Duplicating it across both bundles is fine for our use case — we
just want the import to work.

## Failure mode 1 — plain `import x from "foo.json"` (default state of this repo)

With the stock `vite.config.mts`, `pnpm dev` fails before the server is ready:

```
… (rwsdk) Scanning for 'use client' and 'use server' directives...
error when starting dev server:
Error: expected value at line 1 column 1
    at runInRunnerObject (workers/runner-worker/index.js:107:3)
    at getWorkerEntryExportTypes (workers/runner-worker/index.js:246:24)
    at null.<anonymous> (workers/runner-worker/index.js:350:37)
    at maybeCaptureError (workers/runner-worker/index.js:51:10)
```

The `expected value at line 1 column 1` strongly suggests that some part of the
build is trying to evaluate the JSON file as raw JavaScript rather than parsing
it as JSON.

> Note: when running inside a sandbox without outbound network access you will
> also see an unrelated `Unable to fetch the Request.cf object! ... Host not in...`
> warning from miniflare. It is harmless and not part of this reproduction.

## Failure mode 2 — `import x from "foo.json?raw"`

Switch the imports in `src/app/pages/Home.tsx` and
`src/app/components/JsonBadge.tsx` from:

```ts
import sample from "../data/sample.json";
```

to:

```ts
import sample from "../data/sample.json?raw";
```

(and treat `sample` as a string). Then `pnpm dev` fails with:

```
… (rwsdk) Scanning for 'use client' and 'use server' directives...
error when starting dev server:
Error: Denied ID virtual:rwsdk:ssr:/src/app/data/sample.json?raw
    at runInRunnerObject (workers/runner-worker/index.js:107:3)
    at getWorkerEntryExportTypes (workers/runner-worker/index.js:246:24)
    at null.<anonymous> (workers/runner-worker/index.js:350:37)
    at maybeCaptureError (workers/runner-worker/index.js:51:10)
```

So importing JSON as a raw string is not supported either.

> Tip: if the dev server caches a previous run, clear the Vite cache between
> attempts with `pnpm clean` (i.e. `rm -rf ./node_modules/.vite`).

## Workaround for failure mode 1

`vite.config.workaround.mts` contains a `jsonModulePlugin` that transforms JSON
files into `export default <json>;` JS modules **before** rwsdk's SSR bridge
tries to evaluate them in workerd. To try it:

```
cp vite.config.workaround.mts vite.config.mts
pnpm clean
pnpm dev
```

The dev server then boots normally and `import sample from "../data/sample.json"`
yields the parsed object in both the client and the server.

This is the same plugin venuu/conversations has carried for over six months
(original gist:
<https://gist.github.com/valscion/3ba79149f5b12f9030ac265b7bfdb4b5>). The
`__x00__` handling in it had to be re-added to keep it working with newer
Vite/rwsdk versions.

The workaround only fixes the **plain** `.json` import. Importing JSON as a raw
string (`foo.json?raw`, failure mode 2) is still unsupported.
