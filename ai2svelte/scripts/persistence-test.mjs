#!/usr/bin/env node
// Checks that styles (shadow, animation, custom CSS) and settings saved by an
// export survive closing and reopening the document, however that happens.
// Drives real Illustrator: local-only, needs `pnpm build` first
// (dist/cep/jsx/index.js). Quits and relaunches Illustrator for the quit cases
// (--skip-quit to skip them). Refuses to run with documents open.
//
// Each case: new .ai in a temp dir -> the panel's export flow (snapshot save,
// runAi2Svelte, setVariable x4) -> close one way -> reopen one way -> check the
// XMP styleText and the .svelte output -> export again from the reloaded
// styleText -> close with save -> reopen -> check again.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const JSX = path.join(rootDir, "dist/cep/jsx/index.js");
if (!existsSync(JSX)) {
  console.error(`Missing ${JSX}: run "pnpm build" first.`);
  process.exit(1);
}
// realpath so paths match what Illustrator reports (/tmp -> /private/tmp)
const WORK = path.join(
  execFileSync("realpath", [os.tmpdir()], { encoding: "utf8" }).trim(),
  "ai2svelte-persistence",
);
rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });
const skipQuit = process.argv.includes("--skip-quit");
const only = process.argv.find((a, i) => i > 1 && !a.startsWith("--"));

const osa = (s) =>
  execFileSync(
    "osascript",
    ["-e", `with timeout of 300 seconds\n${s}\nend timeout`],
    { encoding: "utf8" },
  ).trim();
const sleep = (s) => execFileSync("sleep", [String(s)]);
function jsx(body) {
  const f = path.join(WORK, "step.jsx");
  writeFileSync(
    f,
    `app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
$.evalFile(${JSON.stringify(JSX)});
var A = $["com.reuters-graphics.ai2svelte"];
(function(){ ${body} })();`,
  );
  const out = osa(
    `tell application "Adobe Illustrator" to do javascript (POSIX file "${f}")`,
  );
  try {
    return JSON.parse(out);
  } catch {
    return out;
  }
}
const docCount = () => Number(jsx(`return String(app.documents.length);`));
// only ever closes documents this script created
const closeOurs = () =>
  jsx(`for (var i = app.documents.length - 1; i >= 0; i--) {
    var d = app.documents[i];
    if (d.fullName.fsName.indexOf(${JSON.stringify(WORK)}) === 0) d.close(SaveOptions.DONOTSAVECHANGES);
  } return "1";`);

if (docCount() !== 0) {
  console.error(
    "Close all Illustrator documents first: this test opens, closes and quits.",
  );
  process.exit(1);
}

// ---------- steps ----------
function create(file) {
  return jsx(`
    var doc = app.documents.add(DocumentColorSpace.RGB, 800, 600);
    var c = new RGBColor(); c.red = 30; c.green = 120; c.blue = 200;
    var L1 = doc.layers[0]; L1.name = "shapes";
    var box = L1.pathItems.rectangle(-100, 100, 200, 150); box.name = "box"; box.fillColor = c;
    var L2 = doc.layers.add(); L2.name = "anim";
    var dot = L2.pathItems.ellipse(-300, 400, 80, 80); dot.name = "dot"; dot.fillColor = c;
    var L3 = doc.layers.add(); L3.name = "text";
    var tf = L3.textFrames.add(); tf.contents = "Hello persistence"; tf.name = "headline";
    tf.position = [100, -450];
    var o = new IllustratorSaveOptions(); o.pdfCompatible = false;
    doc.saveAs(new File(${JSON.stringify(file)}), o);
    // real selectors, as the Styles tab picks them up
    var sel = {}, items = { box: box, dot: dot, headline: tf };
    for (var k in items) { doc.selection = null; items[k].selected = true; sel[k] = A.fetchSelectedItems(); }
    doc.selection = null;
    return JSON.stringify(sel);
  `);
}

// what the Shadows/Animations tabs and the CSS editor write into styleText
const styleTextFor = (sel, color = "rebeccapurple") =>
  [
    `${sel.box} {\n  @include shadow-persist-glow(#ff0000);\n}`,
    `${sel.dot} {\n  /* fade-in @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } } */\n  @include animation-fade-in();\n  animation: fade-in 1.2s ease-out both;\n}`,
    `${sel.headline} {\n  color: ${color};\n  letter-spacing: 0.137em;\n}`,
  ].join("\n");
// stylesString = mixin defs + styleText
const MIXINS = `@mixin shadow-persist-glow($c) { box-shadow: 0 0 7px $c; }\n@mixin animation-fade-in() { @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } } }`;

function exportFlow(tag, styleText) {
  const settings = {
    settings: {
      show_completion_dialog_box: false,
      html_output_path: `out-${tag}/`,
      image_output_path: `out-${tag}/`,
      inline_svg: true,
    },
    code: { css: MIXINS + "\n" + styleText, fontsConfig: {} },
  };
  return jsx(`
    A.saveAndSnapshotDocument(${JSON.stringify(WORK + "/snap-")});
    var r = A.runAi2Svelte(${JSON.stringify(settings)});
    A.setVariable("ai-settings", ${JSON.stringify(settings.settings)});
    A.setVariable("css-settings", { styleText: ${JSON.stringify(styleText)} });
    A.setVariable("version", { version: "persistence-test" });
    A.setVariable("lastSaved", { time: ${Date.now()} });
    return JSON.stringify({ errors: r && r.errors });
  `);
}

const dirty = () =>
  jsx(
    `app.activeDocument.layers.getByName("shapes").pathItems.rectangle(-500, 600, 20, 20).name = "extra"; return "1";`,
  );
const reloadStyle = () =>
  jsx(
    `var c = A.getVariable("css-settings"); return JSON.stringify(c.styleText || "");`,
  );

function outputOk(file, tag, color = "rebeccapurple") {
  const dir = path.join(path.dirname(file), `out-${tag}`);
  const f =
    existsSync(dir) && readdirSync(dir).find((x) => x.endsWith(".svelte"));
  if (!f) return "no .svelte output";
  const s = readFileSync(path.join(dir, f), "utf8");
  const miss = [
    "shadow-persist-glow",
    "animation-fade-in",
    "fade-in 1.2s",
    color,
    "0.137em",
  ].filter((m) => !s.includes(m));
  return miss.length ? "output missing: " + miss.join(", ") : "";
}

function verify(expectedStyle) {
  const r = jsx(`
    var d = app.activeDocument, css = A.getVariable("css-settings"), ai = A.getVariable("ai-settings"), names = [];
    try { d.pathItems.getByName("box"); names.push("box"); } catch (e) {}
    try { d.pathItems.getByName("dot"); names.push("dot"); } catch (e) {}
    try { d.textFrames.getByName("headline"); names.push("headline"); } catch (e) {}
    return JSON.stringify({ styleText: css && css.styleText, ai: !!(ai && ai.html_output_path), objects: names.join(",") });
  `);
  if (r.styleText !== expectedStyle)
    return `styleText is ${JSON.stringify(r.styleText ?? null).slice(0, 80)}`;
  if (!r.ai) return "ai-settings missing";
  if (r.objects !== "box,dot,headline") return `objects: ${r.objects}`;
  return "";
}

// ---------- close / open mechanisms ----------
const jsClose = (m) =>
  jsx(`app.activeDocument.close(SaveOptions.${m}); return "1";`);
const CLOSES = {
  "close DONOTSAVE": () => jsClose("DONOTSAVECHANGES"),
  "close SAVECHANGES": () => jsClose("SAVECHANGES"),
  "close() default": () => jsx(`app.activeDocument.close(); return "1";`),
  "menu close": () => jsx(`app.executeMenuCommand("close"); return "1";`),
  "applescript close saving yes": () =>
    osa(
      `tell application "Adobe Illustrator" to close current document saving yes`,
    ),
  "applescript close saving no": () =>
    osa(
      `tell application "Adobe Illustrator" to close current document saving no`,
    ),
  "edit -> close DONOTSAVE": () => {
    dirty();
    jsClose("DONOTSAVECHANGES");
  },
  "edit -> close SAVECHANGES": () => {
    dirty();
    jsClose("SAVECHANGES");
  },
  "edit -> doc.save() -> close": () => {
    dirty();
    jsx(`app.activeDocument.save(); return "1";`);
    jsClose("DONOTSAVECHANGES");
  },
  "edit -> Cmd+S -> close": () => {
    dirty();
    jsx(`app.executeMenuCommand("save"); return "1";`);
    jsClose("DONOTSAVECHANGES");
  },
  "edit -> applescript close saving yes": () => {
    dirty();
    osa(
      `tell application "Adobe Illustrator" to close current document saving yes`,
    );
  },
  "Save As new path -> close": (file) => {
    const copy = file.replace(/\.ai$/, "-saveas.ai");
    jsx(`var d = app.activeDocument, o = new IllustratorSaveOptions(); o.pdfCompatible = false;
      d.saveAs(new File(${JSON.stringify(copy)}), o); d.close(SaveOptions.DONOTSAVECHANGES); return "1";`);
    return copy;
  },
  "Save As pdfCompatible -> close": () => {
    jsx(`var d = app.activeDocument, o = new IllustratorSaveOptions(); o.pdfCompatible = true;
      d.saveAs(new File(d.fullName.fsName), o); d.close(SaveOptions.DONOTSAVECHANGES); return "1";`);
  },
};
const OPENS = {
  "app.open": (f) =>
    jsx(`app.open(new File(${JSON.stringify(f)})); return "1";`),
  "applescript open": (f) =>
    osa(`tell application "Adobe Illustrator" to open POSIX file "${f}"`),
  "shell open -a": (f) => {
    execFileSync("open", ["-a", "Adobe Illustrator", f]);
    for (let i = 0; i < 60 && docCount() === 0; i++) sleep(0.5);
  },
};

// ---------- run ----------
const results = [];
function run(name, fn) {
  if (only && !name.includes(only)) return;
  let fail;
  try {
    if (docCount() !== 0)
      throw new Error("a document was left open by the previous case");
    fail = fn();
  } catch (e) {
    fail = String(e.message || e)
      .split("\n")[0]
      .slice(0, 200);
  }
  if (fail)
    try {
      closeOurs();
    } catch {}
  results.push({ name, fail });
  console.log(
    `${fail ? "FAIL" : "PASS"} ${name}${fail ? `\n     ${fail}` : ""}`,
  );
}

let i = 0;
for (const [closeName, close] of Object.entries(CLOSES)) {
  for (const [openName, open] of Object.entries(OPENS)) {
    const tag = `t${String(i++).padStart(2, "0")}`;
    run(`${tag} ${closeName} -> ${openName}`, () => {
      let file = path.join(WORK, `${tag}.ai`);
      const style = styleTextFor(create(file));
      exportFlow(tag + "a", style);
      const out1 = outputOk(file, tag + "a");
      if (out1) return out1;
      const moved = close(file);
      if (typeof moved === "string" && moved.endsWith(".ai")) file = moved;
      if (docCount() !== 0) return "close left the document open";
      open(file);
      const v1 = verify(style);
      if (v1) return "after reopen: " + v1;
      // second cycle: the panel reloads styleText from XMP and exports again
      exportFlow(tag + "b", reloadStyle());
      const out2 = outputOk(file, tag + "b");
      if (out2) return "second export: " + out2;
      jsClose("SAVECHANGES");
      open(file);
      const v2 = verify(style);
      jsClose("DONOTSAVECHANGES");
      return v2 && "after second reopen: " + v2;
    });
  }
}

// Doc already holds older styles (V1) when opened; export V2, keep editing,
// Cmd+S. Illustrator must not write the stale V1 back.
run("stale revert: reopen V1 -> export V2 -> edit -> Cmd+S", () => {
  const file = path.join(WORK, "stale.ai");
  const sel = create(file);
  const v2 = styleTextFor(sel);
  exportFlow("s1", styleTextFor(sel, "red"));
  jsClose("DONOTSAVECHANGES");
  OPENS["app.open"](file);
  exportFlow("s2", v2);
  dirty();
  jsx(`app.executeMenuCommand("save"); return "1";`);
  jsClose("DONOTSAVECHANGES");
  OPENS["app.open"](file);
  const v = verify(v2);
  jsClose("DONOTSAVECHANGES");
  return v;
});

if (!skipQuit) {
  const isRunning = () =>
    osa(
      `tell application "System Events" to (name of processes) contains "Adobe Illustrator"`,
    ) === "true";
  for (const [name, edit, quit] of [
    [
      "quit: clean -> applescript quit -> relaunch",
      false,
      () => osa(`tell application "Adobe Illustrator" to quit`),
    ],
    [
      "quit: clean -> app.quit() -> relaunch",
      false,
      () => jsx(`app.quit(); return "1";`),
    ],
    [
      "quit: edit -> app.quit() -> relaunch",
      true,
      () => jsx(`app.quit(); return "1";`),
    ],
  ]) {
    run(name, () => {
      const file = path.join(WORK, `quit-${results.length}.ai`);
      const style = styleTextFor(create(file));
      exportFlow(`q${results.length}`, style);
      if (edit) dirty();
      try {
        quit();
      } catch {} // quitting can cut the osascript reply short
      for (let n = 0; n < 60 && isRunning(); n++) sleep(1);
      execFileSync("open", ["-a", "Adobe Illustrator"]);
      // relaunch: wait until scripting answers, then a little longer for startup to settle
      for (let n = 0; n < 120; n++) {
        try {
          osa(`tell application "Adobe Illustrator" to do javascript "1"`);
          break;
        } catch {
          sleep(2);
        }
      }
      sleep(5);
      OPENS["app.open"](file);
      const v = verify(style);
      jsClose("DONOTSAVECHANGES");
      return v;
    });
  }
}

const failed = results.filter((r) => r.fail);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
