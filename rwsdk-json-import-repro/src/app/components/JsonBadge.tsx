"use client";

// This client component imports the JSON file, so the same file ends up in the
// client bundle. The Home server component (Home.tsx) imports the very same
// file, so it is also pulled into the worker/SSR bundle — "imported from both
// client and server bundles", which is the scenario that triggers the crash.
//
// To reproduce the SECOND failure mode (the `?raw` one), change this import to:
//
//   import sample from "../data/sample.json?raw";
//
// and treat `sample` as a string instead of an object.
import sample from "../data/sample.json";

export function JsonBadge() {
  return (
    <p>
      client says: <strong>{sample.greeting}</strong>
    </p>
  );
}
