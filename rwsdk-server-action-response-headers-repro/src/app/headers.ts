import { RouteMiddleware } from "rwsdk/router";

export const setCommonHeaders =
  (): RouteMiddleware =>
  ({ response }) => {
    // Control header set from middleware on the document (GET) response. Proves
    // the worker can emit a custom header; the verify step checks this is
    // present on GET while the header set INSIDE the server action is dropped on
    // the action POST in rwsdk >= 1.3.0.
    response.headers.set("x-common-response-header", "set-from-middleware");
  };
