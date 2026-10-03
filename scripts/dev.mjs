import { build } from "esbuild";
import { spawn } from "node:child_process";
await build({
  entryPoints: ["server/index.ts"],
  outfile: "build/dev.mjs",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  packages: "external",
});
const child = spawn(
  process.execPath,
  ["build/dev.mjs", "--dev", ...process.argv.slice(2)],
  { stdio: "inherit" },
);
child.on("exit", (code) => process.exit(code ?? 0));
