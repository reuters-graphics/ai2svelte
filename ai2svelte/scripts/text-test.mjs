#!/usr/bin/env node
// Local-only regression test for the real Illustrator text scan/edit path.
// Requires pnpm build. Only the temporary document created here is changed.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundle = path.join(root, "dist/cep/jsx/index.js");
if (!existsSync(bundle)) {
  console.error('Missing built ExtendScript: run "pnpm build" first.');
  process.exit(1);
}

const work = path.join(
  root,
  "scripts/visual-test/.output",
  `text-test-${process.pid}`,
);
if (existsSync(work)) {
  throw new Error(`Refusing to overwrite an existing test directory: ${work}`);
}
mkdirSync(work, { recursive: true });
const script = path.join(work, "test.jsx");
let cleanupSafe = false;
try {
  writeFileSync(
    script,
    `$.evalFile(${JSON.stringify(bundle)});
(function () {
  var A = $["com.reuters-graphics.ai2svelte"];
  var priorDocCount = app.documents.length;
  var priorDocPath = "";
  if (priorDocCount > 0) priorDocPath = String(app.activeDocument.fullName.fsName);
  var doc = app.documents.add(DocumentColorSpace.RGB, 500, 500);
  var assertions = 0;
  var lastCheck = "";
  var failure = "";
  try {
    doc.artboards.add([600, 500, 1100, 0]);
    doc.artboards.add([1200, 500, 1700, 0]);
    var font = app.textFonts.getByName("MyriadPro-Regular");
    var red = new RGBColor(); red.red = 255; red.green = 0; red.blue = 0;
    var blue = new RGBColor(); blue.red = 0; blue.green = 0; blue.blue = 255;
    var green = new RGBColor(); green.red = 0; green.green = 255; green.blue = 0;
    var black = new RGBColor(); black.red = 0; black.green = 0; black.blue = 0;

    function check(condition, message) {
      lastCheck = message;
      if (!condition) throw new Error(message);
      assertions++;
    }
    function add(text, artboard, y, size) {
      var frame = doc.textFrames.add();
      frame.contents = text;
      frame.position = [50 + artboard * 600, y];
      frame.textRange.characterAttributes.textFont = font;
      frame.textRange.characterAttributes.size = size || 12;
      frame.textRange.characterAttributes.fillColor = black;
      return frame;
    }
    function highlight(frame, start, color) {
      for (var i = start; i < frame.contents.length; i++) {
        frame.textRange.characters[i].characterAttributes.fillColor = color;
        frame.textRange.characters[i].characterAttributes.size = 12;
      }
    }
    function group(data, plain) {
      for (var i = 0; i < data.groups.length; i++) {
        if (plainText(data.groups[i].text) === plain) {
          return data.groups[i];
        }
      }
      return null;
    }
    function plainText(marked) {
      var result = "";
      for (var i = 0; i < marked.length; i++) {
        var character = marked.charAt(i);
        if (character == "\\\\" && marked.charAt(i + 1) == "<") {
          result += "<";
          i++;
          continue;
        }
        if (character == "<") {
          var end = marked.indexOf(">", i + 1);
          if (end > i) {
            var tag = marked.substring(i + 1, end);
            var number = tag.charAt(0) == "/" ? tag.substring(1) : tag;
            var digits = number.length > 0;
            for (var j = 0; j < number.length; j++) {
              if (number.charAt(j) < "0" || number.charAt(j) > "9") digits = false;
            }
            if (digits) {
              i = end;
              continue;
            }
          }
        }
        result += character;
      }
      return result;
    }

    add("Only here", 0, 450);
    add("Only here", 0, 420);
    var copies = [
      add("Across boards", 0, 390),
      add("Across boards", 0, 360),
      add("Across boards", 1, 390)
    ];
    var pasteboard = add("Across boards", 3, 390);
    var styled = [
      add("Total: $5", 0, 330, 12),
      add("Total: $5", 1, 330, 18)
    ];
    highlight(styled[0], 7, red);
    highlight(styled[1], 7, red);
    var unstyled = add("Total: $5", 2, 330);

    var localStyles = [
      add("Local: $5", 0, 300),
      add("Local: $5", 0, 270)
    ];
    highlight(localStyles[0], 7, red);
    highlight(localStyles[1], 7, red);
    add("Local: $5", 1, 300);
    var differentRuns = [
      add("Range: $5", 0, 240),
      add("Range: $5", 1, 240)
    ];
    highlight(differentRuns[0], 7, red);
    highlight(differentRuns[1], 8, red);
    var differentStyles = [
      add("Color: $5", 0, 210),
      add("Color: $5", 1, 210)
    ];
    highlight(differentStyles[0], 7, red);
    highlight(differentStyles[1], 7, blue);
    var otherStyled = [
      add("Note: ok", 0, 60),
      add("Note: ok", 1, 60)
    ];
    highlight(otherStyled[0], 6, green);
    highlight(otherStyled[1], 6, green);
    var sized = [
      add("Different sizes", 0, 180, 12),
      add("Different sizes", 1, 180, 18)
    ];
    add("One-off", 0, 150);
    // Both frames touch two artboards, but belong to the same one.
    var straddlers = [
      add("Straddling text with a long tail", 0, 120),
      add("Straddling text with a long tail", 0, 90)
    ];
    straddlers[0].position = [490, 120];
    straddlers[1].position = [490, 90];
    var nearCopies = [
      add("Rock \\u2018n\\u2019 roll", 0, 20),
      add("Rock 'n' roll ", 1, 20),
      add("Rock \\u2018n\\u2019 roll", 2, 20)
    ];
    add("Line\\rbreak", 0, 10);
    add("LINE break", 1, 10);
    app.redraw();

    var data = A.fetchDocSelectors();
    var allText = A.fetchDocSelectors(false, true);
    check(group(allText, "Only here").count === 2,
      "Show all text includes repeated text confined to one artboard");
    check(group(allText, "One-off").count === 1,
      "Show all text includes singleton text");
    check(typeof group(allText, "Across boards").signature === "string",
      "Text groups expose stable semantic signatures");
    check(group(allText, "Across boards").styleKeys instanceof Array,
      "Text groups expose semantic style keys");
    check(A.revealDocText("Only here", 0, true),
      "Show all text can reveal same-artboard-only groups");
    var allTextResult = A.replaceDocText("One-off", "Singleton updated", true);
    check(allTextResult.updated === 1,
      "Show all text can replace singleton text");
    var singletonVisible = false;
    var refreshedAllText = A.fetchDocSelectors(false, true);
    for (var allTextIndex = 0; allTextIndex < refreshedAllText.groups.length; allTextIndex++) {
      if (refreshedAllText.groups[allTextIndex].text === "Singleton updated") {
        singletonVisible = true;
      }
    }
    check(singletonVisible,
      "The singleton replacement is visible on the next all-text scan");
    check(JSON.stringify(A.fetchDocSelectors(true)) === JSON.stringify(data),
      "Showing native progress must not change groups or styles");
    var progressWindow = Window.find("palette", "Scanning Illustrator text");
    check(!progressWindow || !progressWindow.visible,
      "The native progress window must close after scanning");
    check(data.groups.length === 6, "Expected only six cross-artboard groups: " + JSON.stringify(data.groups));
    check(data.styles.length === 2, "Only styles used by visible groups should be offered");
    check(data.styles[0].id === 1 && data.styles[1].id === 2,
      "Visible style IDs must start at one with no gaps");
    check(group(data, "Note: ok").text === "Note: <1>ok</1>",
      "First visible style should use tag 1");
    check(!group(data, "Only here"), "Same-artboard repeats must be hidden");
    check(!group(data, "Local: $5"), "Styled repeats on one artboard must not merge with a plain copy elsewhere");
    check(!group(data, "Range: $5"), "Different styled portions must remain separate");
    check(!group(data, "Color: $5"), "Different inline formatting must remain separate");
    check(!group(data, "Straddling text with a long tail"), "Straddling frames must not count as multiple artboards");
    check(group(data, "Across boards").count === 3, "Include all matching artboard copies, excluding pasteboard");
    check(group(data, "Different sizes").count === 2, "Allow different base sizes");
    var nearGroup = group(data, "Rock \\u2018n\\u2019 roll");
    check(nearGroup && nearGroup.count === 3 && nearGroup.inconsistent,
      "Quote and spacing variants merge into one inconsistent group");
    var lineGroup = group(data, "Line\\nbreak") || group(data, "LINE break");
    check(lineGroup && lineGroup.count === 2 && lineGroup.inconsistent,
      "Line break and case variants are near-matches");
    check(group(data, "Across boards").inconsistent === false,
      "Identical copies are consistent");
    var styledGroup = group(data, "Total: $5");
    check(styledGroup && styledGroup.count === 2 && styledGroup.text.indexOf("<") >= 0,
      "Only the matching styled pair should be grouped");
    check(styledGroup.text === "Total: <2>$5</2>",
      "Second visible style should use tag 2, ignoring hidden styles");
    check(JSON.stringify(A.fetchDocSelectors()) === JSON.stringify(data),
      "Refreshing an unchanged document must keep style IDs stable");
    check(A.revealDocText(styledGroup.text, 2), "Styled group should be revealable");
    check(!unstyled.selected, "Reveal must not select the unstyled singleton");
    check(!A.revealDocText("Only here", 0), "Same-artboard-only text must not be revealable as a group");
    var result = A.replaceDocText(nearGroup.text, nearGroup.text);
    check(result.updated === 1 && result.failed === 0,
      "Re-applying the shown text only rewrites the differing copy");
    check(nearCopies[1].contents === "Rock \\u2018n\\u2019 roll",
      "The differing copy now matches");
    check(group(A.fetchDocSelectors(), "Rock \\u2018n\\u2019 roll").inconsistent === false,
      "The group is consistent after unifying");
    check(A.revealDocText("Rock 'n' roll", 0), "Reveal finds near-matching text");
    result = A.replaceDocText("Only here", "Do not replace");
    check(result.updated === 0, "Ineligible groups must not be replaced");
    result = A.replaceDocText("Across boards", "Updated across boards");
    check(result.updated === 3 && result.failed === 0, "Replace all three eligible copies");
    check(result.overflowed === 0, "Point text never overflows");
    check(pasteboard.contents === "Across boards", "Do not replace pasteboard text");
    for (var i = 0; i < copies.length; i++) {
      check(copies[i].contents === "Updated across boards", "Eligible copy was not updated");
    }
    result = A.replaceDocText(styledGroup.text, styledGroup.text.replace("$5", "$9"));
    check(result.updated === 2 && result.failed === 0, "Only replace the matching styled pair");
    check(unstyled.contents === "Total: $5", "Do not replace the unstyled singleton");
    for (var j = 0; j < styled.length; j++) {
      check(styled[j].contents === "Total: $9", "Styled copy was not updated");
      check(styled[j].textRange.characters[8].characterAttributes.fillColor.red === 255,
        "Preserve inline formatting");
      check(styled[j].textRange.characters[8].characterAttributes.size === 12,
        "Preserve inline size");
      check(styled[j].textRange.characters[0].characterAttributes.size === (j ? 18 : 12),
        "Preserve each frame's base size");
    }
    result = A.replaceDocText("Different sizes", "Still different sizes");
    check(result.updated === 2 && result.failed === 0, "Replace uniform text across sizes");
    check(sized[0].textRange.characterAttributes.size === 12 &&
      sized[1].textRange.characterAttributes.size === 18, "Preserve uniform base sizes");
    check(group(A.fetchDocSelectors(), "Total: $9").count === 2,
      "The edited styled pair should remain grouped");
    result = A.replaceDocText("Note: <1>ok</1>", "Note: <1>yes</1>");
    check(result.updated === 2 && result.failed === 0, "Replace text using the first compacted style");
    check(otherStyled[0].textRange.characters[6].characterAttributes.fillColor.green === 255,
      "The compacted style ID must still apply the correct formatting");
    var totalSignature = group(A.fetchDocSelectors(), "Total: $9").signature;
    otherStyled[0].contents = "No longer repeated";
    data = A.fetchDocSelectors();
    check(data.styles.length === 1 && data.styles[0].id === 1,
      "Refresh must remove a vanished style and renumber remaining styles");
    var remainingTotalGroup = null;
    for (var remainingIndex = 0; remainingIndex < data.groups.length; remainingIndex++) {
      if (data.groups[remainingIndex].text.indexOf("Total: ") === 0) {
        remainingTotalGroup = data.groups[remainingIndex];
      }
    }
    check(remainingTotalGroup && remainingTotalGroup.text === "Total: <1>$9</1>",
      "Remaining text must use the renumbered style tag: " + JSON.stringify(data.groups));
    check(remainingTotalGroup && remainingTotalGroup.signature === totalSignature,
      "Semantic identity must survive compact style-ID renumbering");
    var capturedStyleRegistry = [];
    var beforeRenumber = A.fetchDocSelectors();
    for (var registryIndex = 0; registryIndex < beforeRenumber.styles.length; registryIndex++) {
      capturedStyleRegistry.push({
        id: beforeRenumber.styles[registryIndex].id,
        key: beforeRenumber.styles[registryIndex].key,
      });
    }
    var beforeRenumberTotal = group(beforeRenumber, "Total: $9");
    result = A.replaceDocText(
      beforeRenumberTotal.text,
      beforeRenumberTotal.text.replace("$9", "$10"),
      false,
      A.getActiveDocumentIdentity(),
      beforeRenumberTotal.signature,
      capturedStyleRegistry,
    );
    check(result.updated === 2 && result.failed === 0,
      "A captured source snapshot remaps replacement styles after compact-ID renumbering");
    check(styled[0].textRange.characters[8].characterAttributes.fillColor.red === 255 &&
      styled[1].textRange.characters[8].characterAttributes.fillColor.red === 255,
      "Style remapping preserves semantic formatting after ID renumbering");
    var staleRow = group(A.fetchDocSelectors(), "Total: $10");
    styled[0].contents = "Source edited after scan";
    var staleRejected = false;
    try {
      A.replaceDocText(
        staleRow.text,
        "Must not overwrite",
        false,
        A.getActiveDocumentIdentity(),
        staleRow.signature,
        capturedStyleRegistry,
      );
    } catch (staleError) {
      staleRejected = true;
    }
    check(staleRejected && styled[1].contents === "Total: $10",
      "A source edit after scanning is rejected before any frame is mutated");
    styled[0].contents = "Also no longer repeated";
    check(A.fetchDocSelectors().styles.length === 0,
      "No style chips should remain when no visible groups use styles");
    var boxes = [];
    for (var b = 0; b < 2; b++) {
      var box = doc.textFrames.areaText(doc.pathItems.rectangle(40, 50 + b * 600, 120, 30));
      box.contents = "Fits";
      box.textRange.characterAttributes.textFont = font;
      box.textRange.characterAttributes.size = 12;
      boxes.push(box);
    }
    result = A.replaceDocText("Fits", "Still fits");
    check(result.updated === 2 && result.overflowed === 0, "Area text that fits is not reported");
    result = A.replaceDocText("Still fits",
      "This replacement is far too long to fit inside the small text box");
    check(result.updated === 2 && result.overflowed === 2, "Report area text that overflows: " + result.overflowed);
    check(boxes[0].selected && boxes[1].selected && doc.selection.length === 2,
      "Select only the overflowing frames");
    var literalText = "Literal <1> and \\\\ path\\rNote: ok";
    var literalFrames = [
      add(literalText, 0, 100),
      add(literalText, 1, 100)
    ];
    highlight(literalFrames[0], literalText.length - 2, green);
    highlight(literalFrames[1], literalText.length - 2, green);
    data = A.fetchDocSelectors();
    var literalGroup = null;
    for (var k = 0; k < data.groups.length; k++) {
      if (data.groups[k].text.indexOf("Literal") === 0) literalGroup = data.groups[k];
    }
    check(literalGroup !== null, "Escaped literal tags should still form a group");
    result = A.replaceDocText(literalGroup.text, literalGroup.text.replace("ok", "yes"));
    check(result.updated === 2 && result.failed === 0, "Replace text with literal tags after compacting styles");
    check(literalFrames[0].contents === literalText.replace("ok", "yes") &&
      literalFrames[1].contents === literalText.replace("ok", "yes"),
      "Style compaction must preserve literal tags, backslashes and paragraph breaks");

    var translationFrames = [
      add("Persistence source", 0, 60),
      add("Persistence source", 1, 60),
    ];
    var persistenceScan = A.fetchDocSelectors(false, true);
    var persistenceGroup = group(persistenceScan, "Persistence source");
    var saveOptions = new IllustratorSaveOptions();
    saveOptions.pdfCompatible = false;
    var persistencePath = %%PERSISTENCE_PATH%%;
    doc.saveAs(new File(persistencePath), saveOptions);
    var identityBeforeSave = A.getActiveDocumentIdentity();
    check(!!identityBeforeSave, "A saved, clean document has an identity");
    var translationStore = {
      schemaVersion: 1,
      sourceLanguage: "en",
      languages: ["en", "fr"],
      nextMessageId: 2,
      messages: [{
        id: "m1",
        signature: persistenceGroup.signature,
        sourceText: persistenceGroup.text,
        reviewedSignature: persistenceGroup.signature,
        styleKeys: persistenceGroup.styleKeys,
        translations: { fr: [{ text: "Première", styleKey: null }] },
      }],
    };
    var firstTranslationSave = A.saveTextTranslations(identityBeforeSave, translationStore);
    check(firstTranslationSave.ok,
      "The first document translation save succeeds: " + JSON.stringify(firstTranslationSave));
    var firstStoredTranslations = A.fetchTextTranslationDocument().data;
    check(firstStoredTranslations.messages.length === 1,
      "The first translation save is immediately readable: " +
        JSON.stringify(firstStoredTranslations));
    translationFrames[0].contents = "Persistence source edited";
    check(doc.saved === false, "The test document is dirty after its edit");
    check(A.getActiveDocumentIdentity() === identityBeforeSave,
      "A dirty, previously saved document keeps the same document identity");
    translationStore.messages[0].translations.fr[0].text = "Seconde";
    var secondTranslationSave = A.saveTextTranslations(identityBeforeSave, translationStore);
    check(secondTranslationSave.ok,
      "A second translation save succeeds while the document is dirty: " + JSON.stringify(secondTranslationSave));
    var secondStoredTranslations = A.fetchTextTranslationDocument().data;
    check(secondStoredTranslations.messages[0].translations.fr[0].text === "Seconde",
      "The dirty-document translation update is immediately readable: " +
        JSON.stringify(secondStoredTranslations));
    doc.save();
    doc.close(SaveOptions.SAVECHANGES);
    doc = app.open(new File(persistencePath));
    var identityAfterReopen = A.getActiveDocumentIdentity();
    check(identityAfterReopen !== identityBeforeSave,
      "Closing and reopening the same path creates a new session identity: " +
        String(identityBeforeSave) + " -> " + String(identityAfterReopen));
    var reopenedTranslationDocument = A.fetchTextTranslationDocument();
    check(!!reopenedTranslationDocument,
      "Reopened translation metadata is readable: " +
        String(app.documents.length) + " documents, " + String(app.activeDocument.fullName.fsName));
    var persistedTranslations = reopenedTranslationDocument.data;
    check(!!persistedTranslations && !!persistedTranslations.messages,
      "Reopened translation metadata contains messages: " +
        JSON.stringify(persistedTranslations));
    check(persistedTranslations.messages.length === 1,
      "Reopened translation metadata contains one message: " +
        JSON.stringify(persistedTranslations));
    check(persistedTranslations.messages[0].translations.fr[0].text === "Seconde",
      "The second translation edit survives save, close and reopen: " +
        JSON.stringify(persistedTranslations));
    doc.close(SaveOptions.DONOTSAVECHANGES);
    doc = null;
  } catch (e) {
    failure = lastCheck + ": " + (e && e.message ? e.message : String(e));
  } finally {
    try {
      if (doc) doc.close(SaveOptions.DONOTSAVECHANGES);
    } catch (closeError) {
      failure = failure || "Could not close the temporary test document.";
    }
  }
  var activePathAfterTest = "";
  if (app.documents.length > 0) {
    try { activePathAfterTest = String(app.activeDocument.fullName.fsName); } catch (e) {}
  }
  var cleanupSafe =
    app.documents.length === priorDocCount &&
    activePathAfterTest === priorDocPath;
  if (!cleanupSafe) failure = failure || "The pre-existing Illustrator document state was not restored.";
  return JSON.stringify({ assertions: assertions, failure: failure, cleanupSafe: cleanupSafe });
})()`.replace(
      "%%PERSISTENCE_PATH%%",
      JSON.stringify(path.join(work, "translation-test.ai")),
    ),
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
  cleanupSafe = result.cleanupSafe === true;
  if (result.failure) throw new Error(result.failure);
  console.log(
    `Illustrator text regression: ${result.assertions} assertions passed.`,
  );
} finally {
  if (cleanupSafe) rmSync(work, { recursive: true, force: true });
  else console.error(`Preserved test files for safety at ${work}`);
}
