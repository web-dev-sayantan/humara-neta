#!/usr/bin/env node
// Bun is this repo's package manager, not its runtime.
//
// Alchemy re-executes its CLI under Bun whenever `npm_execpath` points at Bun
// (which is what `bun run` sets). In a published install that makes alchemy
// resolve its TypeScript sources through the "bun" export condition, and the
// Vite child then asks for `bin/register-dev-mode.js` — a file that only
// exists in an alchemy checkout, not in the published package.
//
// Dropping the marker and running the CLI with Node keeps alchemy on its
// compiled `lib/` build and its published Oxc loader.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { constants } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const cli = path.join(
  path.dirname(require.resolve("alchemy/bin/alchemy.js")),
  "cli.js"
);

const env = { ...process.env };
delete env.npm_execpath;

const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], {
  env,
  stdio: "inherit",
});

child.on("error", (error) => {
  process.stderr.write(`alchemy: ${error.message}\n`);
  process.exit(1);
});

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  if (signal) {
    process.exit(128 + (constants.signals[signal] ?? 0));
  }
  process.exit(code ?? 1);
});
