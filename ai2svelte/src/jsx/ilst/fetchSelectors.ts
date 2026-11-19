import {
  escapeStyledText,
  parseStyledText,
  StyledSegment,
  wrapStyledText,
} from "../../shared/styledText";

export interface TextFrameGroup {
  text: string;
  count: number;
}

export interface TextStyleInfo {
  id: number;
  font: string;
  size: number;
}

export interface DocTextData {
  groups: TextFrameGroup[];
  styles: TextStyleInfo[];
}

export interface TextReplacementResult {
  updated: number;
  failed: number;
  firstError: string;
}

// Every character attribute counts towards a "style": setting contents spreads
// the first character's attributes over the frame, so anything left out here
// (e.g. leading) would be silently lost on replacement. Kerning is left out
// because it describes a character pair, not the character. Order matters when
// applying: font first, and autoLeading after leading (setting leading turns
// auto leading off).
const STYLE_ATTRIBUTES = [
  "textFont",
  "size",
  "horizontalScale",
  "verticalScale",
  "tracking",
  "leading",
  "autoLeading",
  "kerningMethod",
  "baselineShift",
  "baselinePosition",
  "baselineDirection",
  "rotation",
  "capitalization",
  "underline",
  "strikeThrough",
  "fillColor",
  "strokeColor",
  "strokeWeight",
  "overprintFill",
  "overprintStroke",
  "language",
  "noBreak",
  "ligature",
  "discretionaryLigature",
  "contextualLigature",
  "alternateGlyphs",
  "figureStyle",
  "fractions",
  "ordinals",
  "ornaments",
  "swash",
  "titling",
  "stylisticAlternates",
  "openTypePosition",
  "proportionalMetrics",
  "italics",
  "alignment",
  "akiLeft",
  "akiRight",
  "Tsume",
  "connectionForms",
  "tateChuYokoHorizontal",
  "tateChuYokoVertical",
  "wariChuEnabled",
];

type StyleValues = Record<string, unknown>;

interface CapturedStyle {
  key: string;
  values: StyleValues;
}

interface ScannedFrame {
  frame: TextFrame;
  text: string;
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
  let key = "";
  for (let i = 0; i < STYLE_ATTRIBUTES.length; i++) {
    const name = STYLE_ATTRIBUTES[i];
    let value: unknown;
    try {
      value = (attributes as unknown as AttributeBag)[name];
    } catch (error) {
      value = undefined;
    }
    values[name] = value;
    key += "|" + valueKey(name, value);
  }
  return { key, values };
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
  const runs: StyleRun[] = [];
  let joined = "";
  for (let i = 0; i < characters.length; i++) {
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

// Ids are assigned in document order, so re-scanning an unchanged document
// gives the same ids the panel was shown.
function scanDocument(): DocScan {
  const docTextFrames = app.activeDocument.textFrames;
  const plainCounts: Record<string, number> = {};
  const frames: ScannedFrame[] = [];
  const styles: StyleEntry[] = [];
  const styleIds: Record<string, number> = {};

  for (let i = 0; i < docTextFrames.length; i++) {
    const key = "$" + String(docTextFrames[i].contents);
    plainCounts[key] = (plainCounts[key] || 0) + 1;
  }

  for (let i = 0; i < docTextFrames.length; i++) {
    const frame = docTextFrames[i];
    const contents = String(frame.contents);
    const scanned: ScannedFrame = {
      frame,
      text: toPanelText(contents),
      base: null,
    };
    frames.push(scanned);

    // Only repeated text can form a group, so skip the slow per-character
    // scan for everything else.
    if (plainCounts["$" + contents] < 2 || contents.length === 0) continue;

    const runs = readStyleRuns(frame, contents);
    if (!runs || runs.length === 0) continue;

    const base = findBaseStyle(runs);
    scanned.base = base;
    if (runs.length === 1) continue;

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
  }

  return { frames, styles };
}

export function fetchSelectors(): DocTextData {
  const scan = scanDocument();
  const groups: TextFrameGroup[] = [];
  const groupIndexes: Record<string, number> = {};

  for (let i = 0; i < scan.frames.length; i++) {
    const text = scan.frames[i].text;
    const key = "$" + text;
    const groupIndex = groupIndexes[key];

    if (typeof groupIndex === "number") {
      groups[groupIndex].count++;
    } else {
      groupIndexes[key] = groups.length;
      groups.push({ text, count: 1 });
    }
  }

  const styles: TextStyleInfo[] = [];
  for (let i = 0; i < scan.styles.length; i++) {
    const values = scan.styles[i].style.values;
    const font = values.textFont as TextFont | undefined;
    const size = values.size;
    styles.push({
      id: scan.styles[i].id,
      font: font ? String(font.name) : "",
      size: typeof size === "number" ? Math.round(size * 10) / 10 : 0,
    });
  }

  return { groups, styles };
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

export function replaceTextFrames(
  originalText: string,
  replacementText: string,
): TextReplacementResult {
  const result: TextReplacementResult = {
    updated: 0,
    failed: 0,
    firstError: "",
  };

  if (originalText === replacementText) {
    return result;
  }

  const parsed = parseStyledText(replacementText);
  if (parsed.error) {
    throw new Error(parsed.error);
  }

  const scan = scanDocument();
  for (let i = 0; i < parsed.segments.length; i++) {
    const styleId = parsed.segments[i].styleId;
    if (styleId !== null && (styleId < 1 || styleId > scan.styles.length)) {
      throw new Error("Style " + styleId + " doesn't exist in this document.");
    }
  }

  for (let i = 0; i < scan.frames.length; i++) {
    if (scan.frames[i].text !== originalText) continue;
    try {
      replaceFrameText(scan.frames[i], parsed.segments, scan.styles);
      result.updated++;
    } catch (error) {
      result.failed++;
      if (!result.firstError) {
        result.firstError = String(error);
      }
    }
  }

  return result;
}

// Selects the frameIndex-th frame (wrapping) whose text is
// originalText and pans the view to centre on it.
export function revealStyledText(
  originalText: string,
  frameIndex: number,
): boolean {
  const scan = scanDocument();
  const matches: ScannedFrame[] = [];
  for (let i = 0; i < scan.frames.length; i++) {
    if (scan.frames[i].text === originalText) matches.push(scan.frames[i]);
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
