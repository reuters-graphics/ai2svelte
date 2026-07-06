#!/usr/bin/env node
// Bumps the version everywhere it lives: package.json (source of truth,
// which cep.config.ts imports) and the scriptVersion constant in the
// ExtendScript conversion script. Run from ai2svelte/:
//   node scripts/bumpVersion.js patch      # auto-increment (patch|minor|major)
//   node scripts/bumpVersion.js 1.2.0      # set/revert to an exact version
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arg = process.argv[2];

const pkgPath = resolve(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const prev = pkg.version;

// Resolve the target: a semver keyword auto-increments from current; an
// exact major.minor.patch sets it directly (use this to revert too).
let next;
if (["major", "minor", "patch"].includes(arg)) {
  const [maj, min, pat] = prev.split(".").map(Number);
  next = arg === "major" ? `${maj + 1}.0.0`
    : arg === "minor" ? `${maj}.${min + 1}.0`
    : `${maj}.${min}.${pat + 1}`;
} else if (/^\d+\.\d+\.\d+$/.test(arg || "")) {
  next = arg;
} else {
  console.error("Usage: node scripts/bumpVersion.js <major|minor|patch | X.Y.Z>");
  process.exit(1);
}

// package.json
pkg.version = next;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

// scriptVersion in the ExtendScript conversion script
const jsxPath = resolve(root, "src/jsx/ilst/ai2svelte/ai2svelte.js");
const jsx = readFileSync(jsxPath, "utf8");
const re = /const scriptVersion = "\d+\.\d+\.\d+";/;
if (!re.test(jsx)) {
  console.error(`Could not find scriptVersion in ${jsxPath}`);
  process.exit(1);
}
writeFileSync(jsxPath, jsx.replace(re, `const scriptVersion = "${next}";`));

console.log(`Bumped ${prev} → ${next} (package.json, ai2svelte.js)`);
console.log("Next: commit, merge to main, then `git tag v" + next + " && git push origin v" + next + "`");
