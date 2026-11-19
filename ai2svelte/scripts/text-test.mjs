#!/usr/bin/env node
// Local-only regression test for the real Illustrator text scan/edit path.
// Requires pnpm build. Only the temporary document created here is changed.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundle = path.join(root, "dist/cep/jsx/index.js");
if (!existsSync(bundle)) {
  console.error('Missing built ExtendScript: run "pnpm build" first.');
  process.exit(1);
}

const work = mkdtempSync(
  path.join(realpathSync(os.tmpdir()), "ai2svelte-text-"),
);
const script = path.join(work, "test.jsx");
try {
  writeFileSync(
    script,
    `$.evalFile(${JSON.stringify(bundle)});
(function () {
  var A = $["com.reuters-graphics.ai2svelte"];
  var previous = app.documents.length ? app.activeDocument : null;
  var doc = app.documents.add(DocumentColorSpace.RGB, 500, 500);
  var assertions = 0;
  try {
    doc.artboards.add([600, 500, 1100, 0]);
    doc.artboards.add([1200, 500, 1700, 0]);
    var font = app.textFonts.getByName("MyriadPro-Regular");
    var red = new RGBColor(); red.red = 255; red.green = 0; red.blue = 0;
    var blue = new RGBColor(); blue.red = 0; blue.green = 0; blue.blue = 255;
    var green = new RGBColor(); green.red = 0; green.green = 255; green.blue = 0;
    var black = new RGBColor(); black.red = 0; black.green = 0; black.blue = 0;

    function check(condition, message) {
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
        if (data.groups[i].text.replace(/<\\/?\\d+>/g, "") === plain) {
          return data.groups[i];
        }
      }
      return null;
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
    otherStyled[0].contents = "No longer repeated";
    data = A.fetchDocSelectors();
    check(data.styles.length === 1 && data.styles[0].id === 1,
      "Refresh must remove a vanished style and renumber remaining styles");
    check(group(data, "Total: $9").text === "Total: <1>$9</1>",
      "Remaining text must use the renumbered style tag");
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
    return JSON.stringify({ assertions: assertions });
  } finally {
    doc.close(SaveOptions.DONOTSAVECHANGES);
    if (previous) previous.activate();
  }
})();`,
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
  console.log(
    `Illustrator text regression: ${result.assertions} assertions passed.`,
  );
} finally {
  rmSync(work, { recursive: true, force: true });
}
