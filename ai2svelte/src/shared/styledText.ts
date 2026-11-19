// Shared by the panel and ExtendScript, so keep it ES3-friendly.
// Marked text wraps a style run as <n>text</n>, typable on any keyboard.
// A backslash escapes a literal "<" or "\" ("\<1>" is the text "<1>").
export const STYLE_OPEN = "<";
export const STYLE_CLOSE = ">";

export interface StyledSegment {
  text: string;
  styleId: number | null;
}

export interface ParsedStyledText {
  segments: StyledSegment[];
  error: string;
}

export function styleOpenTag(id: number): string {
  return STYLE_OPEN + id + STYLE_CLOSE;
}

export function styleCloseTag(id: number): string {
  return STYLE_OPEN + "/" + id + STYLE_CLOSE;
}

// Escapes only what the parser would misread: "<" that opens a tag, and
// backslashes that precede "<" or "\".
export function escapeStyledText(text: string): string {
  return text.replace(/\\(?=[\\<])|<(?=\/?\d+>)/g, function (match) {
    return "\\" + match;
  });
}

export function wrapStyledText(text: string, styleId: number | null): string {
  if (styleId === null) return text;
  return styleOpenTag(styleId) + text + styleCloseTag(styleId);
}

// Brackets that don't form a <n> or </n> tag are kept as literal text.
export function parseStyledText(input: string): ParsedStyledText {
  const segments: StyledSegment[] = [];
  const tagPattern = /\\([\\<])|<(\/?)(\d+)>/g;
  let current: number | null = null;
  let buffer = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const flush = () => {
    if (buffer) {
      segments.push({ text: buffer, styleId: current });
      buffer = "";
    }
  };

  while ((match = tagPattern.exec(input)) !== null) {
    buffer += input.substring(lastIndex, match.index);
    lastIndex = match.index + match[0].length;
    if (match[1]) {
      buffer += match[1];
      continue;
    }
    const id = parseInt(match[3], 10);

    if (match[2] === "/") {
      if (current !== id) {
        return {
          segments: [],
          error:
            "Closing tag " +
            styleCloseTag(id) +
            " has no matching opening tag.",
        };
      }
      flush();
      current = null;
    } else {
      if (current !== null) {
        return {
          segments: [],
          error:
            "Style " +
            styleOpenTag(id) +
            " starts inside " +
            styleOpenTag(current) +
            "; styles can't be nested.",
        };
      }
      flush();
      current = id;
    }
  }

  buffer += input.substring(lastIndex);
  if (current !== null) {
    return {
      segments: [],
      error: "Style " + styleOpenTag(current) + " is missing its closing tag.",
    };
  }
  flush();
  return { segments, error: "" };
}
