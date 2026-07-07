#!/usr/bin/env node
// Drives real Illustrator to run the actual export path (runAi2Svelte) against
// each fixture .ai file, then bundles the generated .svelte output for the
// browser. Requires Illustrator installed locally and `pnpm build` run first
// (needs dist/cep/jsx/index.js).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const fixtures = JSON.parse(readFileSync(path.join(__dirname, "fixtures.json"), "utf8"));

const jsxIndexPath = path.join(rootDir, "dist/cep/jsx/index.js");
if (!existsSync(jsxIndexPath)) {
  console.error(`Missing ${jsxIndexPath} — run "pnpm build" first.`);
  process.exit(1);
}

const jsxTemplate = readFileSync(path.join(__dirname, "run-fixture.jsx"), "utf8");
const entryTemplate = readFileSync(path.join(__dirname, "entry-template.js"), "utf8");
const serverScript = path.join(rootDir, "src/server.cjs");

for (const fixture of fixtures) {
  const aiPath = path.resolve(rootDir, fixture.aiPath);
  const outputDir = path.join(path.dirname(aiPath), "visual-test-output");
  mkdirSync(outputDir, { recursive: true });

  const settingsArg = {
    settings: {
      show_completion_dialog_box: false,
      html_output_path: "visual-test-output/",
      image_output_path: "visual-test-output/",
      inline_svg: true,
      override_text: true,
    },
    code: { css: "", fontsConfig: {} },
  };

  const jsx = jsxTemplate
    .replace("%%JSX_INDEX_PATH%%", jsxIndexPath)
    .replace("%%AI_FILE_PATH%%", aiPath)
    .replace("%%SETTINGS_JSON%%", JSON.stringify(settingsArg));

  const tmpJsx = path.join(os.tmpdir(), `ai2svelte-visual-${fixture.name}.jsx`);
  writeFileSync(tmpJsx, jsx);

  console.log(`[${fixture.name}] running ai2svelte via Illustrator...`);
  try {
    execFileSync(
      "osascript",
      [
        "-e",
        `with timeout of 300 seconds
           tell application "Adobe Illustrator" to do javascript (POSIX file "${tmpJsx}")
         end timeout`,
      ],
      { stdio: "inherit" }
    );
  } catch (err) {
    console.error(`[${fixture.name}] Illustrator run failed. Is Illustrator installed?`);
    throw err;
  }

  const svelteFile = readdirSync(outputDir).find((f) => f.endsWith(".svelte"));
  if (!svelteFile) {
    throw new Error(`[${fixture.name}] no .svelte output found in ${outputDir}`);
  }

  writeFileSync(
    path.join(outputDir, "entry.js"),
    entryTemplate.replace("%%COMPONENT%%", `./${svelteFile}`)
  );

  console.log(`[${fixture.name}] bundling with server.cjs...`);
  execFileSync(
    "node",
    [serverScript, path.join(outputDir, "entry.js"), path.join(outputDir, "bundle.js")],
    { stdio: "inherit" }
  );

  console.log(`[${fixture.name}] done -> ${outputDir}`);
}
