#!/usr/bin/env node
// Replays a user's debug report in real Illustrator:
//   pnpm replay "<ai2svelte-debug-folder>"
// Lists every .ai file with a snapshot still on disk and asks which to replay.
// Opens a clone of that file's newest snapshot, in <folder>/test/, then re-runs the
// state-changing evalTS calls logged after it, in order. Requires `pnpm build` (needs
// dist/cep/jsx/index.js) and Illustrator installed.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const [bundleDir, ...extra] = process.argv.slice(2);
if (extra.length) {
  // an unquoted path with spaces arrives as several arguments
  console.error('Got more than one argument. Quote paths with spaces, e.g. "…/Application Support/…".');
  process.exit(1);
}
if (!bundleDir) {
  console.error('Usage: pnpm replay "<ai2svelte-debug-folder>"');
  process.exit(1);
}

const jsxIndexPath = path.join(rootDir, "dist/cep/jsx/index.js");
if (!existsSync(jsxIndexPath)) {
  console.error(`Missing ${jsxIndexPath} — run "pnpm build" first.`);
  process.exit(1);
}

// Read-only calls change nothing, so replaying them is noise.
const SKIP = /^(get|fetch)|^(saveAndS|s)napshotDocument$/;

// One replay point per snapshot whose file still exists: the snapshot plus the
// calls after it, up to the next snapshot in the same session.
function findReplayPoints(sessionsDir, snapshotsDir) {
  const points = [];
  for (const sessionName of readdirSync(sessionsDir).sort()) {
    const events = readFileSync(path.join(sessionsDir, sessionName), "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    events.forEach((e, i) => {
      if (e.type !== "snapshot" || !e.data?.path) return;
      const file = path.join(snapshotsDir, path.basename(e.data.path));
      if (!existsSync(file)) return; // pruned (only the last 3 are kept)
      const next = events.findIndex((n, j) => j > i && n.type === "snapshot");
      const calls = events
        .slice(i + 1, next === -1 ? undefined : next)
        .filter((n) => n.type === "call" && !SKIP.test(n.data.fn))
        .map((n) => n.data);
      // name what failed: evalTS errors carry the call id, engine errors come from the export
      const fnById = new Map(events.filter((n) => n.type === "call").map((n) => [n.data.id, n.data.fn]));
      const failed = new Set();
      for (const n of events.slice(i + 1, next === -1 ? undefined : next)) {
        if (n.type === "error") failed.add(fnById.get(n.data.id) ?? "unknown call");
        if (n.type === "engine-error") failed.add("runAi2Svelte (engine)");
        if (n.type === "panel-error") failed.add("panel");
      }
      points.push({ session: sessionName, t: e.t, snapshot: e.data, file, calls, failed: [...failed] });
    });
  }
  return points;
}

// Numbered menu; auto-picks when there is only one option.
// line iterator (not rl.question) so piped answers aren't dropped
async function ask(lines, prompt) {
  process.stdout.write(prompt);
  const { value, done } = await lines.next();
  if (done) process.exit(1);
  return value;
}

async function choose(lines, question, options, label) {
  if (options.length === 1) {
    console.log(`${question} ${label(options[0])}`);
    return options[0];
  }
  console.log(question);
  options.forEach((o, i) => console.log(`  ${i + 1}) ${label(o)}`));
  for (;;) {
    const n = Number(await ask(lines, `Pick 1-${options.length}: `));
    if (options[n - 1]) return options[n - 1];
  }
}

const sessionsDir = path.join(bundleDir, "sessions");
if (!existsSync(sessionsDir)) {
  console.error(`No sessions/ folder in ${bundleDir}. Export once from the panel to start a log.`);
  process.exit(1);
}
const points = findReplayPoints(sessionsDir, path.join(bundleDir, "snapshots"));
if (points.length === 0) {
  console.error(`No session log points to a snapshot still in ${bundleDir}/snapshots. Export once from the panel, then replay.`);
  process.exit(1);
}

// older snapshots have no `source`; fall back to the document name
const docOf = (p) => p.snapshot.source || p.snapshot.name;
const docs = [...new Set(points.map(docOf))];
const rl = createInterface({ input: process.stdin });
const lines = rl[Symbol.asyncIterator]();
const doc = await choose(lines, "AI file:", docs, (d) => {
  const runs = points.filter((p) => docOf(p) === d);
  const failed = runs.at(-1).failed; // the run that will be replayed
  return `${d} (${runs.length} run${runs.length === 1 ? "" : "s"})${failed.length ? `  [FAILED: ${failed.join(", ")}]` : ""}`;
});
// Newest run only: artwork edits between runs aren't logged, so only the
// run's own snapshot matches the state its calls ran against.
const plan = points.filter((p) => docOf(p) === doc).at(-1);
rl.close();

// Work on a clone in test/ (peer of snapshots/): ai2svelte writes outputs next
// to the .ai and setVariable writes into the file itself. The clone keeps the
// original name because output file names are derived from it.
const workDir = path.join(bundleDir, "test");
mkdirSync(workDir, { recursive: true });
const aiPath = path.join(workDir, plan.snapshot.name);
copyFileSync(plan.file, aiPath);
for (const call of plan.calls) {
  // runPreview's 2nd arg is a folder it deletes and recreates, so point it at the temp dir
  if (call.fn === "runPreview") call.args[1] = path.join(workDir, "preview") + "/";
}

console.log(`Snapshot: ${plan.snapshot.name}${plan.snapshot.saved ? "" : " (user had UNSAVED edits — copy may differ)"}`);
console.log(`Replaying ${plan.calls.length} call(s): ${plan.calls.map((c) => c.fn).join(", ")}`);
console.log(`Working dir: ${workDir}`);

const jsx = readFileSync(path.join(__dirname, "replay-template.jsx"), "utf8")
  // function replacers: logged CSS may contain "$&"-style replacement patterns
  .replace("%%JSX_INDEX_PATH%%", () => jsxIndexPath)
  .replace("%%AI_FILE_PATH%%", () => aiPath)
  .replace("%%CALLS_JSON%%", () => JSON.stringify(plan.calls));
const tmpJsx = path.join(workDir, "replay.jsx");
writeFileSync(tmpJsx, jsx);

execFileSync(
  "osascript",
  [
    "-e",
    // huge files can take many minutes; past this osascript gives up but Illustrator keeps going
    `with timeout of 3600 seconds
       tell application "Adobe Illustrator" to do javascript (POSIX file "${tmpJsx}")
     end timeout`,
  ],
  { stdio: "inherit" }
);
