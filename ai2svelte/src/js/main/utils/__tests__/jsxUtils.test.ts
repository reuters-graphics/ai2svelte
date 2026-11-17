import { describe, it, expect } from "vitest";
// ts-ignore, not expect-error: only some of our tsconfigs see this as an error
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore plain ExtendScript JS module, no types
import * as utilsModule from "../../../../jsx/ilst/ai2svelte/utils.js";

// Characterization tests: they pin what the helpers do today, odd bits included.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const utils = utilsModule as any;
const {
  encodeHtmlEntities,
  cleanHtmlText,
  escapeBraces,
  escapeSvelteText,
  makeKeyword,
  applyTemplate,
  pathJoin,
  pathSplit,
  straightenCurlyQuotes,
  straightenCurlyQuotesInsideAngleBrackets,
  formatCssRule,
  getCssColor,
} = utils;

describe("encodeHtmlEntities", () => {
  it.each([
    ["a&b", "a&amp;b"],
    ['say "hi"', "say &quot;hi&quot;"],
    ["a<b>c", "a&lt;b&gt;c"],
    ["© 2024", "&copy; 2024"],
    ["—", "&mdash;"],
    ["plain", "plain"],
    // not in the replacement table, so passed through
    ["é", "é"],
    // known gap: pre-existing entities are double-encoded
    ["&quot;", "&amp;quot;"],
  ])("%j -> %j", (input, expected) => {
    expect(encodeHtmlEntities(input)).toBe(expected);
  });
});

describe("cleanHtmlText", () => {
  it.each([
    ["a&b", "a&b"],
    ["©", "&copy;"],
    [" ", "&nbsp;"],
    ["—", "&mdash;"],
    ["é", "é"],
  ])("%j -> %j", (input, expected) => {
    expect(cleanHtmlText(input)).toBe(expected);
  });
});

describe("makeKeyword", () => {
  it.each([
    ["a b", "a_b"],
    ["a.b/c", "a_b_c"],
    ["a   b", "a_b"],
    ["", ""],
    ["a--b__c", "a--b__c"],
    ["é", "_"],
    ["Layer 1 {x}", "Layer_1_x_"],
  ])("%j -> %j", (input, expected) => {
    expect(makeKeyword(input)).toBe(expected);
  });
});

describe("applyTemplate", () => {
  it("replaces {{k}}, {{{k}}} and <%= k %> forms", () => {
    expect(
      applyTemplate("{{k}}|{{{k}}}|<%= k %>|<% k %>|{{ k }}", { k: "V" }),
    ).toBe("V|V|V|V|V");
  });
  it("leaves unknown keys untouched", () => {
    expect(applyTemplate("{{zz}} <%=zz%>", { k: "V" })).toBe("{{zz}} <%=zz%>");
  });
  it("falls back to a lower-cased key", () => {
    expect(applyTemplate("{{K}}", { k: "v" })).toBe("v");
  });
  it("allows hyphens in key names", () => {
    expect(applyTemplate("{{a-b}}", { "a-b": 1 })).toBe("1");
  });
});

describe("pathJoin", () => {
  it.each([
    [["a", "b"], "a/b"],
    [["/a/", "/b/"], "/a/b"],
    [["..\\images", "x.png"], "../images/x.png"],
    [["a", "", "b"], "a/b"],
    [["a", null, "b"], "a/b"],
    [[], ""],
  ])("%j -> %j", (args, expected) => {
    expect(pathJoin(...(args as unknown[]))).toBe(expected);
  });
});

describe("pathSplit", () => {
  it.each([
    ["a/b/c.png", ["a/b", "c.png"]],
    ["c.png", ["", "c.png"]],
    ["/c.png", ["", "c.png"]],
  ])("%j -> %j", (input, expected) => {
    expect(pathSplit(input)).toEqual(expected);
  });
});

describe("straightenCurlyQuotes", () => {
  it("converts curly quotes to straight ones", () => {
    expect(straightenCurlyQuotes("‘a’ “b”")).toBe("'a' \"b\"");
  });
  it("only touches quotes inside angle brackets", () => {
    expect(
      straightenCurlyQuotesInsideAngleBrackets("<a href=“x”>“hi”</a>"),
    ).toBe('<a href="x">“hi”</a>');
  });
});

describe("formatCssRule", () => {
  it("formats declarations with tabs and CR line breaks", () => {
    expect(formatCssRule(".a", { color: "red", margin: "0" })).toBe(
      ".a {\r\tcolor: red;\r\tmargin: 0;\r}\r",
    );
  });
  it("formats an empty rule", () => {
    expect(formatCssRule(".a", {})).toBe(".a {\r}\r");
  });
});

describe("getCssColor", () => {
  it.each([
    [[1, 2, 3, 100], "rgb(1,2,3)"],
    [[1, 2, 3, 50], "rgba(1,2,3,0.5)"],
    [[1, 2, 3, 0], "rgb(1,2,3)"],
    [[1, 2, 3, 33.333], "rgba(1,2,3,0.33)"],
    [[1, 2, 3, undefined], "rgb(1,2,3)"],
  ])("%j -> %j", (args, expected) => {
    expect(getCssColor(...(args as [number, number, number, number]))).toBe(
      expected,
    );
  });
});

describe("escapeBraces", () => {
  it.each([
    ["{x}", "&#123;x&#125;"],
    ["{{a}} {b}", "&#123;&#123;a&#125;&#125; &#123;b&#125;"],
    ["no braces", "no braces"],
    ["", ""],
  ])("%j -> %j", (input, expected) => {
    expect(escapeBraces(input)).toBe(expected);
  });
});

describe("escapeSvelteText", () => {
  it("encodes entities and braces", () => {
    expect(escapeSvelteText('a & "{b}" <c>')).toBe(
      "a &amp; &quot;&#123;b&#125;&quot; &lt;c&gt;",
    );
  });
  it("re-encodes the & of an already-encoded entity (existing behaviour)", () => {
    expect(escapeSvelteText("&#123;")).toBe("&amp;#123;");
  });
});
