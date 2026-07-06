#!/usr/bin/env node
// ExtendScript (src/jsx) is a noLib, Adobe-globals-only program — nothing
// like the frontend's DOM/ESNext one. Two nested tsconfigs cover it:
// src/jsx/tsconfig.json (index.ts + utils/, generic Adobe globals) and
// src/jsx/ilst/tsconfig.json (the Illustrator-specific ilst/ subtree, with
// Illustrator's own more specific globals). index.ts imports ilst/ilst.ts,
// so the top-level project also transitively type-checks ilst/ files — just
// with the weaker generic globals, producing extra false errors. index.ts
// also imports src/shared/shared.ts -> cep.config.ts, dragging in
// Vite/Rollup/Node .d.ts noise since this is a noLib program. Both filtered
// out here so each real file is checked exactly once, under the config that
// types it correctly.
import { spawnSync } from "node:child_process";

function run(tsconfig) {
  const result = spawnSync("npx", ["tsc", "-p", tsconfig, "--noEmit"], {
    encoding: "utf8",
  });
  return result.stdout
    .split("\n")
    .filter((line) => /^src\/jsx\/\S+\(\d+,\d+\): error/.test(line));
}

const topLevel = run("src/jsx/tsconfig.json").filter(
  (line) => !line.startsWith("src/jsx/ilst/")
);
const ilst = run("src/jsx/ilst/tsconfig.json");

const errors = [...topLevel, ...ilst];
console.log(errors.join("\n"));
console.log(
  `\n====================================\ntsc (ExtendScript) found ${errors.length} errors`
);

process.exit(errors.length > 0 ? 1 : 0);
