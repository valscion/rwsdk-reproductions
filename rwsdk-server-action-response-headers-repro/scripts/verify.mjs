// Probes a running `vite preview` server (the built worker) and reports whether
// the headers a server action writes to `requestInfo.response.headers` make it
// onto the response, across the different ways a server action can be invoked.
//
// Usage:
//   1. pnpm build
//   2. pnpm preview            # serves the built worker on http://localhost:5252
//   3. node scripts/verify.mjs # (or: BASE=http://localhost:4173 node scripts/verify.mjs)
//
// The action under test (src/app/pages/actions.ts) sets:
//   - x-action-response-header: set-from-server-action
//   - set-cookie: repro_action_cookie=set-from-server-action; …
//
// A control header (x-common-response-header) is set from middleware on every
// response to prove the worker can emit custom headers at all.
//
// NOTE: see README.md — in this minimal app, direct HTTP probing shows the
// action headers PRESENT on both rwsdk 1.3.0-canary.5 and 1.3.0 for the RSC
// (useActionState fetch) path, i.e. this script does not, on its own,
// distinguish the two versions. It is included so others can probe the same
// app and extend the matrix.

import { encodeReply } from "react-server-dom-webpack/client.edge";

const BASE = process.env.BASE || "http://localhost:5252";
const ACTION_ID = "/src/app/pages/actions.ts#setHeaderFromAction";

function fmt(v) {
  return v == null ? "MISSING" : JSON.stringify(v);
}

function report(label, res) {
  console.log(
    `  ${label.padEnd(34)} status=${res.status}` +
      `  x-action-response-header=${fmt(res.headers.get("x-action-response-header"))}` +
      `  set-cookie=${fmt(res.headers.get("set-cookie"))}`,
  );
}

// 1) Document GET — control. The middleware header should be present.
{
  const res = await fetch(BASE + "/", { redirect: "manual" });
  console.log(
    `  ${"GET / (control header)".padEnd(34)} status=${res.status}` +
      `  x-common-response-header=${fmt(res.headers.get("x-common-response-header"))}`,
  );
  await res.text();
}

// 2) RSC action POST — exactly how rwsdk's client (useActionState / <form action>)
//    invokes the action once hydrated: POST /?__rsc&__rsc_action_id=<id> with an
//    encodeReply() body and a same-origin Origin header.
{
  const url = new URL(BASE + "/");
  url.searchParams.set("__rsc", "");
  url.searchParams.set("__rsc_action_id", ACTION_ID);
  const fd = new FormData();
  fd.set("dummy", "1");
  const body = await encodeReply([null, fd]);
  const res = await fetch(url, {
    method: "POST",
    headers: { Origin: BASE },
    body,
    redirect: "manual",
  });
  report("RSC action POST (hydrated)", res);
  await res.text();
}

// 3) Native (no-JS) form POST — React's progressive-enhancement encoding:
//    a multipart/form-data POST to the page URL carrying $ACTION_REF_1 etc. and
//    NO __rsc query params.
{
  const fd = new FormData();
  fd.set("$ACTION_REF_1", "");
  fd.set("$ACTION_1:0", JSON.stringify({ id: ACTION_ID, bound: "$@1" }));
  fd.set("$ACTION_1:1", "[null]");
  fd.set("$ACTION_KEY", "k1");
  const res = await fetch(BASE + "/", {
    method: "POST",
    headers: { Origin: BASE },
    body: fd,
    redirect: "manual",
  });
  report("Native (no-JS) form POST", res);
  await res.text();
}
