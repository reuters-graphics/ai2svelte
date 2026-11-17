#!/usr/bin/env node
// Runs the docs examples (../public/examples/*.ai) through the current dev build
// of ai2svelte in real Illustrator and saves the output:
//   <out>/<example>/<example>.svelte + <out>/<example>/images/
// Local-only: needs Illustrator and a prior `pnpm build` (dist/cep/jsx/index.js).
//
//   pnpm examples                     # all examples -> ./examples-output
//   pnpm examples headline fire       # just these
//   pnpm examples --out ../tmp/x      # other output dir
//
// Uses each example's own saved settings + styles (XMP), like the panel's Run
// button. Works on a copy of the .ai, since a successful export saves the doc.
// Skips the panel's post-export image step (webp conversion / PNG optimising).
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildStylesString, closeStyles } from "./visual-test/styles.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const examplesDir = path.resolve(rootDir, "../public/examples");
const jsxIndex = path.join(rootDir, "dist/cep/jsx/index.js");
if (!existsSync(jsxIndex)) {
  console.error(`Missing ${jsxIndex} — run "pnpm build" first.`);
  process.exit(1);
}

const args = process.argv.slice(2);
const o = args.indexOf("--out");
const out = path.resolve(o >= 0 ? args.splice(o, 2)[1] : path.join(rootDir, "examples-output"));
const all = readdirSync(examplesDir).filter((f) => f.endsWith(".ai")).map((f) => f.slice(0, -3));
const names = args.length ? args : all;
for (const n of names) if (!all.includes(n)) throw new Error(`Unknown example "${n}". Have: ${all.join(", ")}`);

// ponytail: id hardcoded, same as visual-test/run-fixture.jsx
const jsxHeader = `#target illustrator
$.evalFile(${JSON.stringify(jsxIndex)});
var api = $["com.reuters-graphics.ai2svelte"];
`;
function runJsx(name, body) {
  const file = path.join(os.tmpdir(), `ai2svelte-examples-${name}.jsx`);
  writeFileSync(file, jsxHeader + body);
  execFileSync("osascript", ["-e", `with timeout of 600 seconds
    tell application "Adobe Illustrator" to do javascript (POSIX file "${file}")
  end timeout`], { stdio: "inherit" });
}

// the engine resolves output paths relative to the doc, so copies live in <out>/_src
const srcDir = path.join(out, "_src");
mkdirSync(srcDir, { recursive: true });

try {
  for (const name of names) {
    const copy = path.join(srcDir, `${name}.ai`);
    const saved = path.join(srcDir, `${name}.json`);
    const dest = path.join(out, name);
    copyFileSync(path.join(examplesDir, `${name}.ai`), copy);
    rmSync(dest, { recursive: true, force: true });
    mkdirSync(dest, { recursive: true });

    // 1. read the settings + styles the example was saved with
    console.log(`[${name}] reading saved settings...`);
    runJsx(name, `
      var doc = app.open(new File(${JSON.stringify(copy)}));
      var r = { settings: api.getVariable("ai-settings"), css: api.getVariable("css-settings") };
      doc.close(SaveOptions.DONOTSAVECHANGES);
      var f = new File(${JSON.stringify(saved)}); f.open("w"); f.write(JSON.stringify(r)); f.close();
    `);
    const { settings, css } = JSON.parse(readFileSync(saved, "utf8"));

    // 2. export with output redirected next to the copy (image_source_path, the URL prefix, is kept)
    const arg = {
      settings: {
        show_completion_dialog_box: false,
        ...settings,
        html_output_path: `../${name}/`,
        image_output_path: `../${name}/images/`,
      },
      code: { css: css?.styleText ? await buildStylesString(css.styleText) : "", fontsConfig: {} },
    };
    console.log(`[${name}] exporting -> ${dest}`);
    runJsx(name, `
      var doc = app.open(new File(${JSON.stringify(copy)}));
      try { api.runAi2Svelte(${JSON.stringify(arg)}); } finally { doc.close(SaveOptions.DONOTSAVECHANGES); }
    `);
    if (!readdirSync(dest).some((f) => f.endsWith(".svelte"))) throw new Error(`[${name}] no .svelte written`);
  }
} finally {
  rmSync(srcDir, { recursive: true, force: true });
  await closeStyles();
}
console.log(`done -> ${out}`);
