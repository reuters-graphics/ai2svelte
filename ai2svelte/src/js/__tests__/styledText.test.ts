import { describe, expect, it } from "vitest";
import { escapeStyledText, parseStyledText } from "../../shared/styledText";

describe("styledText escaping", () => {
  it("parses backslash-escaped tags as literal text", () => {
    const parsed = parseStyledText("Type \\<1>x\\<2> and <1>y</1>");
    expect(parsed.error).toBe("");
    expect(parsed.segments).toEqual([
      { text: "Type <1>x<2> and ", styleId: null },
      { text: "y", styleId: 1 },
    ]);
  });

  it("round-trips arbitrary text through escape then parse", () => {
    for (const text of [
      "<1>",
      "a \\<1>",
      "\\\\",
      "C:\\dir\\",
      "a < b",
      "</3>",
    ]) {
      const parsed = parseStyledText(escapeStyledText(text));
      expect(parsed.error).toBe("");
      expect(parsed.segments.map((s) => s.text).join("")).toBe(text);
    }
  });
});
