import { defineConfig } from "vite";
import { redwood } from "rwsdk/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

// This is the stock rwsdk vite config. With it, importing a JSON file from a
// module that ends up in both the client and server bundles crashes the dev
// server while rwsdk scans for "use client" / "use server" directives.
//
// See README.md for the two failure modes (plain `.json` and `.json?raw`) and
// for the `jsonModulePlugin` workaround that makes plain JSON imports work.
export default defineConfig({
  plugins: [
    cloudflare({
      viteEnvironment: { name: "worker" },
    }),
    redwood(),
  ],
});
