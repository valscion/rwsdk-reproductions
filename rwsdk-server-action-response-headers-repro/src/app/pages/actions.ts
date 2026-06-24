"use server";

import { requestInfo } from "rwsdk/worker";

export type ActionResult = { status: "success" };

// A React Server Action invoked from a client component (see
// src/app/components/ActionForm.tsx via <form action={…}> / useActionState).
//
// Inside the action we mutate the request's response headers through
// `requestInfo.response.headers` — both a plain custom header and an appended
// `Set-Cookie`. This is the same operation a cookie/session store performs
// (e.g. `rwsdk/auth`'s `defineSessionStore(...).save(requestInfo.response.headers, …)`,
// which is literally `responseHeaders.set("Set-Cookie", …)`).
//
// Reported expectation: the action's POST response carries
// `x-action-response-header` and the `Set-Cookie`.
//
// Reported regression (rwsdk >= 1.3.0, last working 1.3.0-canary.5): the action
// returns its body normally, but the headers it set on `requestInfo.response`
// are not applied to the action's response. See README.md for what this repo
// could and could not reproduce.
export async function setHeaderFromAction(
  _prevState: ActionResult | null,
  _formData: FormData,
): Promise<ActionResult> {
  const { response } = requestInfo;

  response.headers.set("x-action-response-header", "set-from-server-action");
  response.headers.append(
    "set-cookie",
    "repro_action_cookie=set-from-server-action; Path=/; HttpOnly; SameSite=Lax",
  );

  return { status: "success" };
}
