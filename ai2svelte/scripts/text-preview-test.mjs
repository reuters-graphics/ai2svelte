#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundle = path.join(root, "dist/cep/jsx/index.js");
if (!existsSync(bundle))
  throw new Error("Run pnpm build before testing previews.");
const work = path.join(
  root,
  "scripts/visual-test/.output",
  `text-preview-${process.pid}`,
);
if (existsSync(work)) throw new Error(`Refusing to overwrite ${work}`);
mkdirSync(work, { recursive: true });
const script = path.join(work, "test.jsx");
let cleanupSafe = false;
try {
  writeFileSync(
    script,
    `
$.evalFile(${JSON.stringify(bundle)});
(function () {
  var prior = app.documents.length ? app.activeDocument : null;
  var count = app.documents.length;
  var source = null, copy = null, checks = 0, failure = "", stage = "setup";
  function check(value, message) { if (!value) throw new Error(message); checks++; }
  function bytes(file) {
    file.encoding = "BINARY";
    if (!file.open("r")) throw new Error("Cannot read test file");
    try { return file.read(); } finally { file.close(); }
  }
  function capture(frame) {
    var chars = [];
    for (var i = 0; i < frame.characters.length; i++) {
      var c = frame.characters[i], a = c.characterAttributes;
      chars.push([String(c.contents), a.textFont.name, a.size, a.tracking, a.leading, a.baselineShift]);
    }
    return JSON.stringify([frame.contents, chars, frame.position,
      frame.paragraphs[0].paragraphAttributes.justification]);
  }
  try {
    source = app.documents.add(DocumentColorSpace.RGB, 500, 500);
    var frame = source.textFrames.add();
    frame.name = "translated";
    frame.contents = "Original  title\\rSecond line \\u00e9 \\u0627\\u0644\\u0639\\u0631\\u0628\\u064a\\u0629 \\ud83d\\ude00";
    frame.position = [30, 450];
    frame.characters[2].characterAttributes.tracking = 120;
    frame.characters[3].characterAttributes.leading = 31;
    frame.characters[4].characterAttributes.baselineShift = 3;
    frame.characters[0].characterAttributes.size = 18;
    frame.paragraphs[0].paragraphAttributes.justification = Justification.RIGHT;
    var file = new File(${JSON.stringify(path.join(work, "source.ai"))});
    source.saveAs(file);
    source.selection = null;
    frame.selected = true;
    var before = capture(frame), saved = source.saved, originalBytes = bytes(file);
    var target = new File(${JSON.stringify(path.join(work, "copy.ai"))});
    check(file.copy(target.fsName), "Copy saved native AI file");
    copy = app.open(target);
    check(capture(copy.textFrames[0]) === before, "Copy preserves rich text and geometry");
    copy.textFrames[0].contents = "Traduction";
    copy.close(SaveOptions.DONOTSAVECHANGES); copy = null;
    source.activate();
    check(capture(frame) === before, "Original rich text and geometry untouched");
    check(source.saved === saved, "Original saved status untouched");
    check(source.selection.length === 1 && source.selection[0] === frame, "Original selection untouched");
    check(bytes(file) === originalBytes, "Original file byte-identical");
    var A = $["com.reuters-graphics.ai2svelte"];
    frame.name = "translated";
    var missing = source.textFrames.add();
    missing.name = "missing"; missing.contents = "Missing translation";
    missing.position = [30, 200];
    var data = A.fetchDocSelectors(false, true);
    var group = null;
    for (var g = 0; g < data.groups.length; g++) {
      if (data.groups[g].text.indexOf("Second line") >= 0) group = data.groups[g];
    }
    check(!!group, "Source group available");
    var highlightKey = "";
    for (var s = 0; s < data.styles.length; s++) {
      if (data.styles[s].size === 18) highlightKey = data.styles[s].key;
    }
    check(!!highlightKey, "Source highlight style identified by semantic key");
    var store = { schemaVersion: 1, sourceLanguage: "en", languages: ["en", "fr", "de"],
      nextMessageId: 2, messages: [{ id: "m1", signature: group.signature, sourceText: group.text,
        styleKeys: group.styleKeys, translations: {
          fr: [{ text: "Titre ", styleKey: null }, { text: "traduit", styleKey: highlightKey }],
          de: [{ text: "Deutscher Titel", styleKey: null }]
        } }] };
    var identity = A.getActiveDocumentIdentity();
    check(A.saveTextTranslations(identity, store).ok, "Save test translations");
    stage = "save source"; source.save();
    stage = "capture source"; before = capture(frame); originalBytes = bytes(file); saved = source.saved;
    stage = "begin French preview";
    var status = A.beginTextPreview(identity, "fr");
    check(status.active && status.translated === 1 && status.blanked === 1, "Translate all text and blank missing values");
    check(app.activeDocument !== source, "Preview uses a different document");
    check(app.activeDocument.textFrames.getByName("translated").contents === "Titre traduit", "French text displayed");
    check(app.activeDocument.textFrames.getByName("translated").characters[6].characterAttributes.size === 18,
      "Saved inline style applied to translated segment");
    check(app.activeDocument.textFrames.getByName("missing").contents === "", "Missing translation is empty");
    check(capture(frame) === before && source.saved === saved && bytes(file) === originalBytes, "Preview does not change original artwork or file");
    var blocked = false;
    try { A.saveAndSnapshotDocument(${JSON.stringify(work + "/blocked-")}); } catch (e) { blocked = true; }
    check(blocked, "Snapshot/export cannot save a preview");
    blocked = false;
    try { A.runAi2Svelte({}); } catch (e) { blocked = true; }
    check(blocked, "Host export blocked");
    app.activeDocument.textFrames.getByName("translated").contents = "Discard this edit";
    status = A.beginTextPreview(identity, "de");
    check(app.activeDocument.textFrames.getByName("translated").contents === "Deutscher Titel", "Switch starts from source snapshot");
    store.messages[0].translations.de[0].text = "Gespeichert";
    check(A.saveTextTranslations(identity, store).ok, "Save translations to original while preview is active");
    A.beginTextPreview(identity, "de");
    check(app.activeDocument.textFrames.getByName("translated").contents === "Gespeichert", "Saved translation appears in refreshed copy");
    check(capture(frame) === before, "Translation metadata saving preserves source typography");
    A.endTextPreview();
    check(app.activeDocument === source, "Return reactivates same original object");
    check(A.fetchTextTranslationDocument().data.messages[0].translations.de[0].text === "Gespeichert", "Translation saved in original metadata");
    source.save();
    originalBytes = bytes(file); saved = source.saved;
    A.beginTextPreview(identity, "fr");
    A.beginTextPreview(identity, "de");
    var ownedDirectory = app.activeDocument.fullName.parent;
    A.endTextPreview();
    check(!ownedDirectory.exists, "Preview exit removes only its owned temporary directory");
    check(capture(frame) === before && source.saved === saved && bytes(file) === originalBytes, "Repeated preview cycle preserves original exactly");
    frame.contents = "Unsaved change";
    blocked = false;
    try { A.beginTextPreview(identity, "fr"); } catch (e) { blocked = true; }
    check(blocked && app.activeDocument === source, "Unsaved source changes require explicit save");
    frame.contents = "Original  title\\rSecond line";
    source.save();
    var beforeInteraction = app.userInteractionLevel;
    missing.locked = true; source.save();
    blocked = false;
    try { A.beginTextPreview(identity, "fr"); } catch (e) { blocked = true; }
    check(blocked && app.activeDocument === source, "Noneditable text fails safely and returns to source");
    check(!A.getTextPreviewStatus().active, "Failed preview leaves no live session");
    check(app.userInteractionLevel === beforeInteraction, "Interaction settings restored after failure");
    missing.locked = false; source.save();
    A.beginTextPreview(identity, "fr");
    var unrelated = app.documents.add(DocumentColorSpace.RGB, 100, 100);
    check(!A.getTextPreviewStatus().active && app.activeDocument === unrelated,
      "Unrelated document activation closes preview without stealing focus");
    unrelated.close(SaveOptions.DONOTSAVECHANGES); unrelated = null;
    source.activate();
    A.beginTextPreview(identity, "fr");
    app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
    check(!A.getTextPreviewStatus().active && app.activeDocument === source,
      "Manual preview closure reconciles stale native references");
    var linkedFile = new File(${JSON.stringify(path.join(root, "src/js/assets/images/backdrops/backdrop_0.jpg"))});
    var link = source.placedItems.add(); link.file = linkedFile;
    source.save();
    A.beginTextPreview(identity, "fr");
    check(app.activeDocument.placedItems[0].file.fsName === linkedFile.fsName,
      "Relocated preview resolves original linked artwork");
    A.endTextPreview();
    source.save();
    source.close(SaveOptions.DONOTSAVECHANGES); source = app.open(file);
    identity = A.getActiveDocumentIdentity();
    check(A.fetchTextTranslationDocument().data.messages[0].translations.de[0].text === "Gespeichert",
      "Translation saved from preview persists after source close and reopen");
    A.beginTextPreview(identity, "fr");
    var previousApi = A;
    $.evalFile(${JSON.stringify(bundle)});
    A = $["com.reuters-graphics.ai2svelte"];
    blocked = false;
    try { A.getTextPreviewStatus(); } catch (e) { blocked = true; }
    check(blocked, "Host reload recognizes orphan preview ownership");
    blocked = false;
    try { A.runAi2Svelte({}); } catch (e) { blocked = true; }
    check(blocked, "Orphan preview cannot be exported after host reload");
    previousApi.endTextPreview();
    identity = A.getActiveDocumentIdentity();
    A.beginTextPreview(identity, "fr");
    source.close(SaveOptions.DONOTSAVECHANGES); source = null;
    check(!A.getTextPreviewStatus().active, "Original closure closes only its disposable preview");
  } catch (e) { failure = stage + ", after " + checks + " assertions, line " + e.line + ": " + String(e) + " " + e.stack; }
  finally {
    try { if (typeof A !== "undefined") A.endTextPreview(); } catch (e) { failure = failure || String(e); }
    if (copy) copy.close(SaveOptions.DONOTSAVECHANGES);
    if (source) source.close(SaveOptions.DONOTSAVECHANGES);
    if (typeof unrelated !== "undefined" && unrelated) unrelated.close(SaveOptions.DONOTSAVECHANGES);
    if (prior) prior.activate();
  }
  return JSON.stringify({ checks: checks, failure: failure, cleanupSafe: app.documents.length === count });
})()
`,
  );
  const output = execFileSync(
    "osascript",
    [
      "-e",
      `with timeout of 120 seconds
tell application "Adobe Illustrator" to do javascript (POSIX file ${JSON.stringify(script)})
end timeout`,
    ],
    { encoding: "utf8", timeout: 150_000 },
  );
  const result = JSON.parse(output.trim());
  cleanupSafe = result.cleanupSafe;
  if (result.failure) throw new Error(result.failure);
  console.log(
    `Illustrator preview regression: ${result.checks} assertions passed.`,
  );
} finally {
  if (cleanupSafe) rmSync(work, { recursive: true });
  else console.error(`Preserved test files at ${work}`);
}
