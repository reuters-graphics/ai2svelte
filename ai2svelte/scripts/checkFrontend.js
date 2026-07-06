#!/usr/bin/env node
// svelte-check type-checks src/js under tsconfig.json, but bolt.ts's
// `import type { Scripts } from "@esTypes/index"` pulls the whole
// ExtendScript module graph (src/jsx) into the same program — even though
// tsconfig.json excludes it — because TS still resolves reachable imports
// regardless of "exclude". Those files then get diagnosed with the frontend's
// DOM/ESNext lib instead of their own Adobe-globals tsconfig, producing
// "Cannot find name 'app'/'ExternalObject'/..." noise. src/jsx has its own
// tsconfig(s) and is checked separately by `pnpm check:jsx`, so this drops
// any diagnostic whose file lives under src/jsx.
// ponytail: machine output loses the inline code-context snippet human mode
// shows; add a --output human pass-through if that's ever missed.
import { spawnSync } from "node:child_process";

const result = spawnSync(
  "npx",
  ["svelte-check", "--tsconfig", "./tsconfig.json", "--output", "machine"],
  { encoding: "utf8" }
);

const diagnostics = result.stdout
  .split("\n")
  .filter((line) => / (ERROR|WARNING) /.test(line))
  .map((line) => {
    const m = line.match(/^\d+ (ERROR|WARNING) "([^"]+)" (\d+:\d+) (.*)$/);
    return m && { level: m[1], file: m[2], pos: m[3], message: m[4] };
  })
  .filter((d) => d && !d.file.startsWith("src/jsx/"));

for (const d of diagnostics) {
  console.log(`${d.file}:${d.pos} ${d.level} ${d.message}`);
}

const errorCount = diagnostics.filter((d) => d.level === "ERROR").length;
const warningCount = diagnostics.filter((d) => d.level === "WARNING").length;

console.log(
  `\n====================================\nsvelte-check (frontend only) found ${errorCount} errors and ${warningCount} warnings`
);

process.exit(errorCount > 0 ? 1 : 0);
