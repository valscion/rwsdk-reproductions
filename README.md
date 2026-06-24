# Repository for RedwoodSDK reproductions

This is the repository where I gather minimal reproductions of possible bugs I've encountered with [RedwoodSDK](https://rwsdk.com/).

See the directories for each reproduction case:

- [`rwsdk-minimal-streaming-form-repro`](./rwsdk-minimal-streaming-form-repro) —
  a streamed page with a server action crashes the client.
- [`rwsdk-json-import-repro`](./rwsdk-json-import-repro) — importing a JSON file
  from both the client and server bundles crashes the dev server.
- [`rwsdk-server-action-response-headers-repro`](./rwsdk-server-action-response-headers-repro)
  — headers written to `requestInfo.response.headers` inside a server action
  (reported regression in `rwsdk` 1.3.0). See its README for what could and
  could not be reproduced at the HTTP layer.
