import { cloudflare } from "@cloudflare/vite-plugin";
import { readFile } from "node:fs/promises";
import { redwood } from "rwsdk/vite";
import { defineConfig, type Plugin } from "vite";

/**
 * WORKAROUND for the bug reproduced by this repository.
 *
 * To try it: rename this file to `vite.config.mts` (or copy it over the stock
 * one) and restart `pnpm dev`. Plain `import x from "./foo.json"` then works,
 * because this plugin transforms JSON files into `export default <json>;` JS
 * modules *before* rwsdk's SSR bridge tries to evaluate them in workerd.
 *
 * This is the same plugin a real-world app has carried for >6 months. The
 * `__x00__` handling below is the part that had to be re-added to keep it
 * working with newer Vite/rwsdk (Vite 8 blocks ids containing `?raw` via
 * `isServerAccessDeniedForTransform`, and the workerd module runner re-encodes
 * the leading NULL byte as the `__x00__` placeholder when an id crosses the
 * SSR boundary).
 *
 * Note: this only fixes the *plain* `.json` import. `import x from "foo.json?raw"`
 * (importing JSON as a raw string) is still unsupported — see README.md.
 */
function jsonModulePlugin(): Plugin {
  const VIRTUAL_SSR_PREFIX = "virtual:rwsdk:ssr:";
  // Use the Rollup \0 prefix convention for virtual modules. This achieves two
  // things:
  // 1. Vite skips the server.fs access check for \0-prefixed ids (Vite 8 blocks
  //    ids containing ?raw via isServerAccessDeniedForTransform).
  // 2. The .json extension is stripped from the virtual id so that Vite's
  //    built-in JSON plugin (which matches /\.json(?:$|\?)/) does not attempt to
  //    re-transform our JS output.
  const JSON_MODULE_ID = "jsonmodule:";
  // The Cloudflare/Vite module runners cannot transmit a literal NULL byte (\0)
  // across the workerd boundary, so they re-encode it as the "__x00__"
  // placeholder (Vite's NULL_BYTE_PLACEHOLDER). A virtual id our resolveId hook
  // returns with a leading \0 can therefore arrive at the load hook — which runs
  // inside the workerd SSR runner — in its placeholder form instead. We must
  // recognize both so the resolve->load round-trip works in the SSR/worker
  // environment, not just the client environment.
  const NULL_BYTE = "\0";
  const NULL_BYTE_PLACEHOLDER = "__x00__";
  const realPrefix = NULL_BYTE + JSON_MODULE_ID;
  const encodedPrefix = NULL_BYTE_PLACEHOLDER + JSON_MODULE_ID;

  // If the id is one of our virtual JSON modules (in either the real \0 form or
  // the __x00__ placeholder form), return the real file path with the .json
  // extension restored. Otherwise return null.
  const jsonFilePathFromId = (id: string): string | null => {
    for (const prefix of [realPrefix, encodedPrefix]) {
      if (id.startsWith(prefix)) {
        return id.slice(prefix.length) + ".json";
      }
    }
    return null;
  };

  return {
    name: "vite-plugin-json-module",
    // Run early to transform JSON before other plugins process it
    enforce: "pre",
    async resolveId(source, importer) {
      // Skip rwsdk internal modules and virtual modules
      if (source.startsWith(VIRTUAL_SSR_PREFIX)) {
        return null;
      }

      // Claim ownership of already-resolved virtual module ids (e.g. when the
      // SSR environment re-resolves a module fetched via rwsdk's SSR bridge).
      // Handle both the real \0 form and the __x00__ placeholder used when the
      // id crosses the workerd runner boundary.
      if (source.startsWith(realPrefix) || source.startsWith(encodedPrefix)) {
        return source;
      }

      if (source.endsWith(".json") && !source.includes("\0")) {
        const resolved = await this.resolve(source, importer, {
          skipSelf: true,
        });
        if (resolved) {
          // Strip the .json extension so the virtual id does not match Vite's
          // JSON plugin filter (jsonExtRE = /\.json(?:$|\?)/)
          return realPrefix + resolved.id.slice(0, -".json".length);
        }
      }
      return null;
    },
    async load(id) {
      const filePath = jsonFilePathFromId(id);
      if (filePath) {
        const content = await readFile(filePath, "utf-8");
        const json = JSON.parse(content);
        return `export default ${JSON.stringify(json)};`;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [
    jsonModulePlugin(),
    cloudflare({
      viteEnvironment: { name: "worker" },
    }),
    redwood(),
  ],
});
