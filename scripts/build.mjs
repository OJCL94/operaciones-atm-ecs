import { build as bundle } from "esbuild";
import { build } from "vite";
import { execFileSync } from "node:child_process";
execFileSync(
  process.execPath,
  ["node_modules/typescript/bin/tsc", "--noEmit"],
  { stdio: "inherit" },
);
await build();
await bundle({
  entryPoints: ["server/index.ts", "server/manage.ts"],
  outdir: "build",
  entryNames: "[name]",
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  packages: "external",
});
const { rename } = await import("node:fs/promises");
await rename("build/index.mjs", "build/server.mjs");
await import("./manual.mjs");
