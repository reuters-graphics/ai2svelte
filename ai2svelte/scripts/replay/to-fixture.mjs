// `pnpm replay "<folder>" --to-fixture <name>`: turns the replayed export into a
// visual-test fixture (copy of the snapshot .ai + logged settings/CSS). Never runs Illustrator.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export async function toFixture({ rootDir, name, plan, ask }) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) throw new Error(`Bad fixture name "${name}": use lowercase letters, digits, "-".`);
  const fixturesPath = path.join(rootDir, "scripts/visual-test/fixtures.json");
  const raw = readFileSync(fixturesPath, "utf8");
  const fixtures = JSON.parse(raw);
  if (fixtures.some((f) => f.name === name)) throw new Error(`Fixture "${name}" already exists in fixtures.json.`);
  const call = plan.calls.findLast((c) => c.fn === "runAi2Svelte");
  const arg = call?.args?.[0];
  if (!arg?.settings || typeof arg.code?.css !== "string") throw new Error("This run has no runAi2Svelte call with settings and CSS.");

  console.log(`Document: ${plan.snapshot.name}`);
  console.log(`WARNING: this .ai may contain unpublished work. It will be copied into scripts/visual-test/fixtures/. Never commit client artwork.`);
  if ((await ask("Copy it and add the fixture? Type y to continue: ")).trim() !== "y") {
    console.log("Cancelled, nothing changed.");
    return;
  }

  // generate.mjs sets its own output paths and completion dialog
  const { html_output_path, image_output_path, show_completion_dialog_box, ...settings } = arg.settings;
  const aiPath = `scripts/visual-test/fixtures/${name}.ai`;
  const fixture = { name, aiPath };
  if (Object.keys(settings).length) fixture.settings = settings;
  // ponytail: the logged CSS already holds the mixins generate.mjs prepends again; duplicate @mixin definitions compile fine
  if (arg.code.css.trim()) {
    writeFileSync(path.join(rootDir, "scripts/visual-test/styles", `${name}.scss`), arg.code.css);
    fixture.cssPath = `styles/${name}.scss`;
  }
  if (Object.keys(arg.code.fontsConfig ?? {}).length) fixture.fontsConfig = arg.code.fontsConfig;

  copyFileSync(plan.file, path.join(rootDir, aiPath));
  fixtures.push(fixture);
  writeFileSync(fixturesPath, JSON.stringify(fixtures, null, 2) + "\n");
  // keep the file's prettier formatting so the diff is only the new entry
  execFileSync("pnpm", ["exec", "prettier", "--write", fixturesPath], { cwd: rootDir, stdio: "ignore" });
  console.log(`Added fixture "${name}". Next: pnpm test:visual:generate ${name}`);
}
