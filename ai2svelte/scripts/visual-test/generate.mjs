#!/usr/bin/env node
// Drives real Illustrator to run the actual export path (runAi2Svelte) against
// each fixture .ai file, then bundles the generated .svelte output for the
// browser. Requires Illustrator installed locally and `pnpm build` run first
// (needs dist/cep/jsx/index.js).
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildStylesString, closeStyles } from "./styles.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const fixtures = JSON.parse(
  readFileSync(path.join(__dirname, "fixtures.json"), "utf8"),
);

const jsxIndexPath = path.join(rootDir, "dist/cep/jsx/index.js");
if (!existsSync(jsxIndexPath)) {
  console.error(`Missing ${jsxIndexPath} — run "pnpm build" first.`);
  process.exit(1);
}

const jsxTemplate = readFileSync(
  path.join(__dirname, "run-fixture.jsx"),
  "utf8",
);
const entryTemplate = readFileSync(
  path.join(__dirname, "entry-template.js"),
  "utf8",
);
const translationWrapperTemplate = readFileSync(
  path.join(__dirname, "translation-wrapper.svelte"),
  "utf8",
);
const serverScript = path.join(rootDir, "src/server.cjs");
const generatedWorkDir = path.join(__dirname, ".output");
mkdirSync(generatedWorkDir, { recursive: true });

// optional names: `pnpm test:visual:generate presets layers` runs just those
const only = process.argv.slice(2);

for (const fixture of fixtures) {
  if (only.length && !only.includes(fixture.name)) continue;
  const sourceAiPath = path.resolve(rootDir, fixture.aiPath);
  const outputDir = path.join(__dirname, ".output", fixture.name);
  const aiPath = path.join(outputDir, path.basename(sourceAiPath));
  const relativeOutputDir = `${path.relative(path.dirname(aiPath), outputDir).split(path.sep).join("/")}/`;
  // fresh dir: a stale .svelte from an earlier run would pass as new output
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });
  copyFileSync(sourceAiPath, aiPath);

  const settingsArg = {
    settings: {
      show_completion_dialog_box: false,
      html_output_path: relativeOutputDir,
      image_output_path: relativeOutputDir,
      inline_svg: true,
      override_text: true,
      ...fixture.settings,
    },
    // "cssPath": user SCSS as typed in the Styles tab; the real mixin generator
    // adds the shadow/animation mixins it @includes, as the panel does
    code: {
      css: fixture.cssPath
        ? await buildStylesString(
            readFileSync(path.join(__dirname, fixture.cssPath), "utf8"),
          )
        : "",
      fontsConfig: fixture.fontsConfig ?? {},
    },
    ...(fixture.translationFixture
      ? { translationFixture: fixture.translationFixture }
      : {}),
  };

  const settingsJson = JSON.stringify(settingsArg)
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  const jsx = jsxTemplate
    .replace("%%JSX_INDEX_PATH%%", jsxIndexPath)
    .replace("%%AI_FILE_PATH%%", aiPath)
    .replace("%%SETTINGS_JSON%%", settingsJson);

  const tmpJsx = path.join(
    generatedWorkDir,
    `.run-${fixture.name}-${process.pid}.jsx`,
  );
  if (existsSync(tmpJsx)) {
    throw new Error(`Refusing to overwrite an existing run script: ${tmpJsx}`);
  }
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
      { stdio: "inherit" },
    );
  } catch (err) {
    console.error(
      `[${fixture.name}] Illustrator run failed. Is Illustrator installed?`,
    );
    throw err;
  } finally {
    if (existsSync(tmpJsx)) rmSync(tmpJsx);
  }

  const svelteFiles = readdirSync(outputDir)
    .filter((f) => f.endsWith(".svelte"))
    .sort();
  if (!svelteFiles.length) {
    throw new Error(
      `[${fixture.name}] no .svelte output found in ${outputDir}`,
    );
  }

  // a single component keeps the plain entry.js/bundle.js names; multiple
  // exports (project_name "x{1,3}y") get bundle-<component>.js per file
  for (const svelteFile of svelteFiles) {
    const suffix =
      svelteFiles.length > 1 ? `-${svelteFile.replace(/\.svelte$/, "")}` : "";
    const entry = path.join(outputDir, `entry${suffix}.js`);
    const componentPath = fixture.translationHarness
      ? "./translation-wrapper.svelte"
      : `./${svelteFile}`;
    if (fixture.translationHarness) {
      writeFileSync(
        path.join(outputDir, "translation-wrapper.svelte"),
        translationWrapperTemplate,
      );
    }
    writeFileSync(entry, entryTemplate.replace("%%COMPONENT%%", componentPath));
    console.log(`[${fixture.name}] bundling ${svelteFile} with server.cjs...`);
    execFileSync(
      "node",
      [serverScript, entry, path.join(outputDir, `bundle${suffix}.js`)],
      {
        stdio: "inherit",
      },
    );
  }

  console.log(`[${fixture.name}] done -> ${outputDir}`);
}
await closeStyles();
