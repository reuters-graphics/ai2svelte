import {
  escapeStyledText,
  parseStyledText,
  StyledSegment,
  wrapStyledText,
} from "../../shared/styledText";
import { createProgressWindow } from "./progressWindow";

export interface TextFrameGroup {
  // The most common variant when copies differ slightly.
  text: string;
  count: number;
  // Stable semantic signature; unlike visible numeric marks, style keys do
  // not change when a scan compacts the style registry.
  signature: string;
  styleKeys: string[];
  // True when copies differ in case, line breaks, spacing, quotes, dashes
  // or ellipses.
  inconsistent: boolean;
}

export interface TextStyleInfo {
  id: number;
  key: string;
  font: string;
  size: number;
}

export interface DocTextData {
  groups: TextFrameGroup[];
  styles: TextStyleInfo[];
  identity?: string;
}

export interface TextReplacementResult {
  updated: number;
  failed: number;
  firstError: string;
  // Updated area/path text that no longer fits; these frames are left selected.
  overflowed: number;
}

// Only these attributes distinguish inline styles. Anything else (tracking,
// leading, OpenType features...) is not compared per character, so on
// replacement it takes the value of the frame's first character. Font goes
// first so later attributes apply to the final font.
const STYLE_ATTRIBUTES = [
  "textFont",
  "size",
  "capitalization",
  "underline",
  "strikeThrough",
  "fillColor",
  "strokeColor",
  "strokeWeight",
  "italics",
];

type StyleValues = Record<string, unknown>;

interface CapturedStyle {
  key: string;
  values: StyleValues;
}

interface ScannedFrame {
  frame: TextFrame;
  artboard: number;
  text: string;
  signature: string;
  base: CapturedStyle | null;
}

interface StyleEntry {
  id: number;
  style: CapturedStyle;
}

interface DocScan {
  frames: ScannedFrame[];
  styles: StyleEntry[];
}

interface StyleRun {
  text: string;
  style: CapturedStyle;
}

type ScanProgress = (
  phase: "collect" | "analyze",
  done: number,
  total: number,
) => void;

interface ColorLike {
  typename?: string;
  red?: number;
  green?: number;
  blue?: number;
  cyan?: number;
  magenta?: number;
  yellow?: number;
  black?: number;
  gray?: number;
  tint?: number;
  spot?: { name: string };
  gradient?: { name: string };
  pattern?: { name: string };
}

type AttributeBag = Record<string, unknown>;

function colorKey(value: unknown): string {
  if (!value) return "none";
  const color = value as ColorLike;
  switch (color.typename) {
    case "RGBColor":
      return "rgb:" + color.red + "," + color.green + "," + color.blue;
    case "CMYKColor":
      return (
        "cmyk:" +
        color.cyan +
        "," +
        color.magenta +
        "," +
        color.yellow +
        "," +
        color.black
      );
    case "GrayColor":
      return "gray:" + color.gray;
    case "SpotColor":
      return "spot:" + (color.spot && color.spot.name) + "," + color.tint;
    case "GradientColor":
      return "gradient:" + (color.gradient && color.gradient.name);
    case "PatternColor":
      return "pattern:" + (color.pattern && color.pattern.name);
    default:
      return String(color.typename);
  }
}

function valueKey(name: string, value: unknown): string {
  if (name === "textFont") {
    return value ? String((value as TextFont).name) : "";
  }
  if (name === "fillColor" || name === "strokeColor") return colorKey(value);
  if (typeof value === "number") return String(Math.round(value * 1000) / 1000);
  return String(value);
}

function captureStyle(attributes: CharacterAttributes): CapturedStyle {
  const values: StyleValues = {};
  const keyParts: string[] = [];
  for (let i = 0; i < STYLE_ATTRIBUTES.length; i++) {
    const name = STYLE_ATTRIBUTES[i];
    let value: unknown;
    try {
      value = (attributes as unknown as AttributeBag)[name];
    } catch (error) {
      value = undefined;
    }
    values[name] = value;
    keyParts.push(valueKey(name, value));
  }
  return { key: JSON.stringify(keyParts), values };
}

function applyStyle(attributes: CharacterAttributes, style: CapturedStyle) {
  for (let i = 0; i < STYLE_ATTRIBUTES.length; i++) {
    const name = STYLE_ATTRIBUTES[i];
    const value = style.values[name];
    if (value === undefined) continue;
    // Only write what differs: rewriting an unchanged value isn't a no-op for
    // every attribute (e.g. reassigning a NoColor stroke can add an outline).
    try {
      const current = (attributes as unknown as AttributeBag)[name];
      if (valueKey(name, current) === valueKey(name, value)) continue;
    } catch (error) {
      // Unreadable attribute: fall through and try to set it.
    }
    try {
      // A NoColor read back from Illustrator draws a black stroke when
      // reassigned; a fresh NoColor really clears it.
      const next =
        value && (value as ColorLike).typename === "NoColor"
          ? new NoColor()
          : value;
      (attributes as unknown as AttributeBag)[name] = next;
    } catch (error) {
      // Some attributes can't be set on every frame type; keep the rest.
    }
  }
}

// Illustrator separates paragraphs with \r; the panel's textarea uses \n.
function toPanelText(text: string): string {
  return escapeStyledText(text.replace(/\r/g, "\n"));
}

function toIllustratorText(text: string): string {
  return text.replace(/\r\n|\n/g, "\r");
}

function readStyleRuns(frame: TextFrame, contents: string): StyleRun[] | null {
  const characters = frame.textRange.characters;
  const count = characters.length;
  const runs: StyleRun[] = [];
  let joined = "";
  for (let i = 0; i < count; i++) {
    const character = characters[i];
    const text = String(character.contents);
    const style = captureStyle(character.characterAttributes);
    const last = runs.length ? runs[runs.length - 1] : null;
    if (last && last.style.key === style.key) {
      last.text += text;
    } else {
      runs.push({ text, style });
    }
    joined += text;
  }
  // Character offsets must line up with contents for replacement to work.
  return joined === contents ? runs : null;
}

function findBaseStyle(runs: StyleRun[]): CapturedStyle {
  const lengths: Record<string, number> = {};
  let base = runs[0].style;
  let baseLength = -1;
  for (let i = 0; i < runs.length; i++) {
    const key = "$" + runs[i].style.key;
    lengths[key] = (lengths[key] || 0) + runs[i].text.length;
  }
  for (let i = 0; i < runs.length; i++) {
    const length = lengths["$" + runs[i].style.key];
    if (length > baseLength) {
      base = runs[i].style;
      baseLength = length;
    }
  }
  return base;
}

function signatureForRuns(runs: StyleRun[]): string {
  if (!runs || runs.length === 0) {
    throw new Error("Text with unreadable styles cannot be identified safely.");
  }
  const base = findBaseStyle(runs);
  const segments: Array<{ text: string; styleKey: string | null }> = [];
  for (let i = 0; i < runs.length; i++) {
    segments.push({
      text: runs[i].text.replace(/\r/g, "\n"),
      styleKey: runs[i].style.key === base.key ? null : runs[i].style.key,
    });
  }
  return JSON.stringify(segments);
}

export function getTextFrameStyleRuns(
  frame: TextFrame,
): Array<{ text: string; styleKey: string | null }> {
  const contents = String(frame.contents);
  const runs = readStyleRuns(frame, contents);
  if (!runs) return [];
  const base = findBaseStyle(runs);
  const segments: Array<{ text: string; styleKey: string | null }> = [];
  for (let i = 0; i < runs.length; i++) {
    segments.push({
      text: runs[i].text,
      styleKey: runs[i].style.key === base.key ? null : runs[i].style.key,
    });
  }
  return segments;
}

export function getTextFrameSemanticSignature(frame: TextFrame): string {
  const contents = String(frame.contents);
  const runs = readStyleRuns(frame, contents);
  if (!runs) {
    throw new Error(
      'Could not read character styles for "' +
        toPanelText(contents) +
        '". Text with unreadable styles cannot be identified safely.',
    );
  }
  return signatureForRuns(runs);
}

// Illustrator reports a paragraph return with the preceding character's
// style; keep line breaks outside tags so they read as plain structure.
function wrapRunText(text: string, styleId: number | null): string {
  if (styleId === null) return text;
  const parts = text.split("\n");
  let wrapped = "";
  for (let i = 0; i < parts.length; i++) {
    if (i > 0) wrapped += "\n";
    wrapped += parts[i] ? wrapStyledText(parts[i], styleId) : "";
  }
  return wrapped;
}

// Assign straddling frames to one artboard, using the largest overlap.
// Pasteboard text must not qualify a group or be changed with that group.
function findArtboard(frame: TextFrame, artboards: Artboards): number {
  const bounds = frame.geometricBounds;
  let best = -1;
  let bestArea = 0;
  for (let i = 0; i < artboards.length; i++) {
    const rect = artboards[i].artboardRect;
    const width = Math.min(bounds[2], rect[2]) - Math.max(bounds[0], rect[0]);
    const height = Math.min(bounds[1], rect[1]) - Math.max(bounds[3], rect[3]);
    const area = width > 0 && height > 0 ? width * height : 0;
    if (area > bestArea) {
      best = i;
      bestArea = area;
    }
  }
  return best;
}

// Copies whose text differs only in case, line breaks or typographic details
// (quotes, dashes, ellipses, spacing) are grouped as one.
function nearKey(text: string): string {
  return (
    "$" +
    text
      .toLowerCase()
      .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
      .replace(/[\u2010-\u2015\u2212]/g, "-")
      .replace(/\u2026/g, "...")
      .split(String.fromCharCode(3)) // forced line break
      .join(" ")
      .replace(/[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]+/g, " ")
      .replace(/^ +| +$/g, "")
  );
}

function repeatedAcrossArtboards(
  frames: ScannedFrame[],
): Record<string, boolean> {
  const firstArtboards: Record<string, number> = {};
  const repeated: Record<string, boolean> = {};
  for (let i = 0; i < frames.length; i++) {
    const key = nearKey(frames[i].text);
    if (typeof firstArtboards[key] !== "number") {
      firstArtboards[key] = frames[i].artboard;
    } else if (firstArtboards[key] !== frames[i].artboard) {
      repeated[key] = true;
    }
  }
  return repeated;
}

function compactStyles(
  frames: ScannedFrame[],
  styles: StyleEntry[],
): StyleEntry[] {
  const segments: StyledSegment[][] = [];
  const used: Record<string, boolean> = {};
  for (let i = 0; i < frames.length; i++) {
    const parsed = parseStyledText(frames[i].text);
    if (parsed.error) throw new Error(parsed.error);
    segments.push(parsed.segments);
    for (let j = 0; j < parsed.segments.length; j++) {
      const id = parsed.segments[j].styleId;
      if (id !== null) used[id] = true;
    }
  }

  const visibleStyles: StyleEntry[] = [];
  const ids: Record<string, number> = {};
  for (let i = 0; i < styles.length; i++) {
    if (!used[styles[i].id]) continue;
    const id = visibleStyles.length + 1;
    ids[styles[i].id] = id;
    visibleStyles.push({ id, style: styles[i].style });
  }

  for (let i = 0; i < frames.length; i++) {
    let text = "";
    for (let j = 0; j < segments[i].length; j++) {
      const segment = segments[i][j];
      const id = segment.styleId === null ? null : ids[segment.styleId];
      text += wrapStyledText(escapeStyledText(segment.text), id);
    }
    frames[i].text = text;
  }
  return visibleStyles;
}

// Ids are assigned in document order, so re-scanning an unchanged document
// gives the same ids the panel was shown.
function scanDocument(
  progress?: ScanProgress,
  includeAllText = false,
): DocScan {
  const doc = app.activeDocument;
  const docTextFrames = doc.textFrames;
  const total = docTextFrames.length;
  const candidates: ScannedFrame[] = [];
  const frames: ScannedFrame[] = [];
  const styles: StyleEntry[] = [];
  const styleIds: Record<string, number> = {};

  for (let i = 0; i < total; i++) {
    if (progress) progress("collect", i, total);
    const frame = docTextFrames[i];
    const contents = String(frame.contents);
    if (contents.length === 0) continue;
    const artboard = findArtboard(frame, doc.artboards);
    if (artboard < 0) continue;
    candidates.push({
      frame,
      artboard,
      text: toPanelText(contents),
      signature: "",
      base: null,
    });
  }
  if (progress) progress("collect", total, total);

  const plainRepeated = repeatedAcrossArtboards(candidates);
  let analyzed = total - candidates.length;
  if (!includeAllText) {
    for (let i = 0; i < candidates.length; i++) {
      if (!plainRepeated[nearKey(candidates[i].text)]) analyzed++;
    }
  }
  if (progress) progress("analyze", analyzed, total);

  for (let i = 0; i < candidates.length; i++) {
    const scanned = candidates[i];
    // Skip the slow per-character scan unless the plain text spans artboards.
    if (!includeAllText && !plainRepeated[nearKey(scanned.text)]) continue;

    const frame = scanned.frame;
    const contents = String(frame.contents);
    frames.push(scanned);

    const runs = readStyleRuns(frame, contents);
    if (!runs || runs.length === 0) {
      throw new Error(
        'Could not read character styles for "' +
          scanned.text +
          '". Text with unreadable styles cannot be grouped safely.',
      );
    }
    analyzed++;
    if (progress) progress("analyze", analyzed, total);

    const base = findBaseStyle(runs);
    scanned.base = base;
    let text = "";
    for (let j = 0; j < runs.length; j++) {
      const run = runs[j];
      let styleId: number | null = null;
      if (run.style.key !== base.key) {
        const styleKey = "$" + run.style.key;
        if (typeof styleIds[styleKey] !== "number") {
          styleIds[styleKey] = styles.length + 1;
          styles.push({ id: styles.length + 1, style: run.style });
        }
        styleId = styleIds[styleKey];
      }
      text += wrapRunText(toPanelText(run.text), styleId);
    }
    scanned.text = text;
    scanned.signature = signatureForRuns(runs);
  }

  // Test again after marking style runs: plain-text repetition alone must
  // never merge styled text with an unstyled copy (or another style pattern).
  const styledRepeated = repeatedAcrossArtboards(frames);
  const repeatedFrames: ScannedFrame[] = [];
  for (let i = 0; i < frames.length; i++) {
    if (includeAllText || styledRepeated[nearKey(frames[i].text)])
      repeatedFrames.push(frames[i]);
  }
  // Hidden groups must not leave unused chips or gaps in visible tag numbers.
  return {
    frames: repeatedFrames,
    styles: compactStyles(repeatedFrames, styles),
  };
}

function collectSelectors(
  progress?: ScanProgress,
  includeAllText = false,
): DocTextData {
  const scan = scanDocument(progress, includeAllText);
  const groups: TextFrameGroup[] = [];
  const groupIndexes: Record<string, number> = {};

  const variants: Array<{
    texts: string[];
    counts: Record<string, number>;
    signatures: Record<string, boolean>;
  }> = [];
  const groupStyleKeys: string[][] = [];

  for (let i = 0; i < scan.frames.length; i++) {
    const text = scan.frames[i].text;
    const key = nearKey(text);
    const groupIndex = groupIndexes[key];

    let group: TextFrameGroup;
    let variant: {
      texts: string[];
      counts: Record<string, number>;
      signatures: Record<string, boolean>;
    };
    if (typeof groupIndex === "number") {
      group = groups[groupIndex];
      variant = variants[groupIndex];
      group.count++;
    } else {
      groupIndexes[key] = groups.length;
      group = {
        text,
        count: 1,
        inconsistent: false,
        signature: "",
        styleKeys: [],
      };
      variant = { texts: [], counts: {}, signatures: {} };
      groups.push(group);
      variants.push(variant);
      groupStyleKeys.push([]);
    }
    variant.signatures["$" + scan.frames[i].signature] = true;
    const signatureSegments = JSON.parse(scan.frames[i].signature) as Array<{
      styleKey: string | null;
    }>;
    for (let j = 0; j < signatureSegments.length; j++) {
      const styleKey = signatureSegments[j].styleKey;
      let foundStyleKey = false;
      for (let k = 0; k < groupStyleKeys[groupIndexes[key]].length; k++) {
        if (groupStyleKeys[groupIndexes[key]][k] === styleKey) {
          foundStyleKey = true;
          break;
        }
      }
      if (styleKey && !foundStyleKey) {
        groupStyleKeys[groupIndexes[key]].push(styleKey);
      }
    }
    const variantKey = "$" + text;
    if (!variant.counts[variantKey]) {
      variant.counts[variantKey] = 0;
      variant.texts.push(text);
    }
    variant.counts[variantKey]++;
  }
  for (let i = 0; i < groups.length; i++) {
    // Show the most common variant; ties keep document order.
    const texts = variants[i].texts;
    let best = texts[0];
    for (let j = 1; j < texts.length; j++) {
      if (variants[i].counts["$" + texts[j]] > variants[i].counts["$" + best]) {
        best = texts[j];
      }
    }
    groups[i].text = best;
    groups[i].inconsistent = texts.length > 1;
    const signatures: string[] = [];
    for (const signatureKey in variants[i].signatures) {
      if (
        Object.prototype.hasOwnProperty.call(
          variants[i].signatures,
          signatureKey,
        )
      ) {
        signatures.push(signatureKey.slice(1));
      }
    }
    signatures.sort();
    groups[i].signature = JSON.stringify(signatures);
    groups[i].styleKeys = groupStyleKeys[i].sort();
  }

  const styles: TextStyleInfo[] = [];
  for (let i = 0; i < scan.styles.length; i++) {
    const values = scan.styles[i].style.values;
    const font = values.textFont as TextFont | undefined;
    const size = values.size;
    styles.push({
      id: scan.styles[i].id,
      key: scan.styles[i].style.key,
      font: font ? String(font.name) : "",
      size: typeof size === "number" ? Math.round(size * 10) / 10 : 0,
    });
  }

  return { groups, styles };
}

export function getDocumentFrameGroupSignatures(): Record<string, string> {
  const scan = scanDocument(undefined, true);
  const groupSignatures: Record<
    string,
    { seen: Record<string, boolean>; variants: string[] }
  > = {};
  for (let i = 0; i < scan.frames.length; i++) {
    const key = nearKey(scan.frames[i].text);
    if (!groupSignatures[key]) {
      groupSignatures[key] = { seen: {}, variants: [] };
    }
    const signature = scan.frames[i].signature;
    if (!groupSignatures[key].seen["$" + signature]) {
      groupSignatures[key].seen["$" + signature] = true;
      groupSignatures[key].variants.push(signature);
    }
  }

  const frameToGroup: Record<string, string> = {};
  for (const key in groupSignatures) {
    if (!Object.prototype.hasOwnProperty.call(groupSignatures, key)) continue;
    const variants = groupSignatures[key].variants.sort();
    const groupSignature = JSON.stringify(variants);
    for (let i = 0; i < variants.length; i++) {
      frameToGroup[variants[i]] = groupSignature;
    }
  }
  return frameToGroup;
}

export function fetchSelectors(
  showProgress = false,
  includeAllText = false,
): DocTextData {
  const ui = showProgress
    ? createProgressWindow("Scanning Illustrator text")
    : null;
  let lastUpdate = 0;
  let lastPhase = "";
  const report: ScanProgress | undefined = ui
    ? (phase, done, total) => {
        const now = new Date().getTime();
        if (phase === lastPhase && done !== total && now - lastUpdate < 250) {
          return;
        }
        lastUpdate = now;
        lastPhase = phase;
        const fraction = total > 0 ? done / total : 1;
        if (phase === "collect") {
          ui.panel.text = includeAllText
            ? "Finding text"
            : "Finding repeated text";
        } else {
          ui.panel.text = "Analyzing text styles";
        }
        ui.label.text =
          (phase === "collect" ? "Checked " : "Analyzed ") +
          done +
          " of " +
          total +
          " text elements";
        ui.bar.value = phase === "collect" ? fraction * 20 : 20 + fraction * 80;
        ui.window.update();
      }
    : undefined;
  try {
    return collectSelectors(report, includeAllText);
  } finally {
    if (ui) ui.window.close();
  }
}

function replaceFrameText(
  scanned: ScannedFrame,
  segments: StyledSegment[],
  styles: StyleEntry[],
) {
  let plain = "";
  for (let i = 0; i < segments.length; i++) {
    plain += toIllustratorText(segments[i].text);
  }

  const frame = scanned.frame;
  frame.contents = plain;
  if (!scanned.base) return;

  // Setting contents spreads the first character's style over everything, so
  // reset to the frame's normal style before restoring marked runs.
  applyStyle(frame.textRange.characterAttributes, scanned.base);

  const characters = frame.textRange.characters;
  let offset = 0;
  for (let i = 0; i < segments.length; i++) {
    const length = toIllustratorText(segments[i].text).length;
    const styleId = segments[i].styleId;
    if (styleId !== null) {
      const style = styles[styleId - 1].style;
      for (let j = offset; j < offset + length; j++) {
        applyStyle(characters[j].characterAttributes, style);
      }
    }
    offset += length;
  }
}

// Lines only hold the characters Illustrator could lay out, excluding
// paragraph breaks, so fewer laid-out characters than text means overflow.
// Threaded frames are measured as one story.
function isOverflowing(frame: TextFrame): boolean {
  if (frame.kind === TextType.POINTTEXT) return false;
  const story = frame.story;
  const frames = story.textFrames;
  let shown = 0;
  for (let i = 0; i < frames.length; i++) {
    const lines = frames[i].lines;
    for (let j = 0; j < lines.length; j++) {
      shown += lines[j].characters.length;
    }
  }
  const text = String(story.textRange.contents)
    .replace(/[\r\n]/g, "")
    .split(String.fromCharCode(3)) // forced line break
    .join("");
  return shown < text.length;
}

export function replaceTextFrames(
  originalText: string,
  replacementText: string,
  includeAllText = false,
): TextReplacementResult {
  const result: TextReplacementResult = {
    updated: 0,
    failed: 0,
    firstError: "",
    overflowed: 0,
  };

  const parsed = parseStyledText(replacementText);
  if (parsed.error) {
    throw new Error(parsed.error);
  }

  const scan = scanDocument(undefined, includeAllText);
  for (let i = 0; i < parsed.segments.length; i++) {
    const styleId = parsed.segments[i].styleId;
    if (styleId !== null && (styleId < 1 || styleId > scan.styles.length)) {
      throw new Error("Style " + styleId + " doesn't exist in this document.");
    }
  }

  const overflowed: TextFrame[] = [];
  for (let i = 0; i < scan.frames.length; i++) {
    // Near-matches are one group; copies already identical are left alone.
    if (nearKey(scan.frames[i].text) !== nearKey(originalText)) continue;
    if (scan.frames[i].text === replacementText) continue;
    const frame = scan.frames[i].frame;
    try {
      replaceFrameText(scan.frames[i], parsed.segments, scan.styles);
      result.updated++;
    } catch (error) {
      result.failed++;
      if (!result.firstError) {
        result.firstError = String(error);
      }
      continue;
    }
    try {
      if (isOverflowing(frame)) overflowed.push(frame);
    } catch (error) {
      // Measuring is best-effort; the replacement itself succeeded.
    }
  }

  result.overflowed = overflowed.length;
  if (overflowed.length > 0) {
    try {
      // Without a redraw, earlier selections made in this script can linger.
      app.redraw();
      app.activeDocument.selection = null;
      for (let i = 0; i < overflowed.length; i++) {
        try {
          overflowed[i].selected = true;
        } catch (error) {
          // Locked or hidden frames can't be selected.
        }
      }
    } catch (error) {
      // Selection is only a convenience.
    }
  }

  return result;
}

// Selects the frameIndex-th frame (wrapping) whose text near-matches
// originalText and pans the view to centre on it.
export function revealStyledText(
  originalText: string,
  frameIndex: number,
  includeAllText = false,
): boolean {
  const scan = scanDocument(undefined, includeAllText);
  const matches: ScannedFrame[] = [];
  for (let i = 0; i < scan.frames.length; i++) {
    if (nearKey(scan.frames[i].text) === nearKey(originalText)) {
      matches.push(scan.frames[i]);
    }
  }
  if (matches.length === 0) return false;

  const frame = matches[frameIndex % matches.length].frame;
  const doc = app.activeDocument;
  try {
    doc.selection = null;
    frame.selected = true;
  } catch (error) {
    // Locked or hidden frames can't be selected; still pan to them.
  }

  const bounds = frame.geometricBounds;
  const view = doc.activeView;
  view.centerPoint = [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];
  app.redraw();
  return true;
}
