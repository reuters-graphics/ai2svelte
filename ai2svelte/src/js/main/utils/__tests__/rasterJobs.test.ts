import { describe, expect, it } from "vitest";
import { deflateSync, inflateSync } from "node:zlib";
import {
  encodeRgbPng,
  relinkImage,
  removeTiles,
  scanAlpha,
} from "../rasterJobs";

// Reverses PNG filters on an 8-bit RGB IDAT stream, to round-trip the encoder
function decodeRgb(png: Uint8Array) {
  const view = new DataView(png.buffer, png.byteOffset);
  const w = view.getUint32(16);
  const h = view.getUint32(20);
  const idatLen = view.getUint32(33);
  const raw = inflateSync(png.subarray(41, 41 + idatLen));
  const stride = w * 3;
  const out = new Uint8Array(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    for (let i = 0; i < stride; i++) {
      const a = i >= 3 ? out[y * stride + i - 3] : 0;
      const b = y ? out[(y - 1) * stride + i] : 0;
      const c = y && i >= 3 ? out[(y - 1) * stride + i - 3] : 0;
      const p = a + b - c;
      const paeth =
        Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c)
          ? a
          : Math.abs(p - b) <= Math.abs(p - c)
            ? b
            : c;
      const pred = [0, a, b, (a + b) >> 1, paeth][f];
      out[y * stride + i] = (raw[y * (stride + 1) + 1 + i] + pred) & 0xff;
    }
  }
  return { w, h, colourType: png[25], rgb: out };
}

describe("scanAlpha", () => {
  it("tells clear, opaque and mixed apart", () => {
    expect(scanAlpha(new Uint8Array([9, 9, 9, 0, 1, 2, 3, 0]))).toEqual({
      clear: true,
      opaque: false,
    });
    expect(scanAlpha(new Uint8Array([9, 9, 9, 255, 1, 2, 3, 255]))).toEqual({
      clear: false,
      opaque: true,
    });
    expect(scanAlpha(new Uint8Array([9, 9, 9, 0, 1, 2, 3, 255]))).toEqual({
      clear: false,
      opaque: false,
    });
  });
});

describe("encodeRgbPng", () => {
  it("round-trips opaque pixels as an RGB png", () => {
    const w = 13;
    const h = 7;
    const rgba = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      rgba.set(
        [(i * 37) & 255, (i * 11) & 255, i < 40 ? 200 : i & 255, 255],
        i * 4,
      );
    }
    const {
      w: dw,
      h: dh,
      colourType,
      rgb,
    } = decodeRgb(
      encodeRgbPng(rgba, w, h, (raw) => new Uint8Array(deflateSync(raw))),
    );
    expect([dw, dh, colourType]).toEqual([w, h, 2]);
    const expected = rgba.filter((_, i) => i % 4 !== 3);
    expect(Array.from(rgb)).toEqual(Array.from(expected));
  });
});

describe("removeTiles", () => {
  const svelte = [
    '<link rel="preload" as="image" fetchpriority="high" media="" href="{processedPath}img/chunks/a-r0c1.webp"/>\r',
    '<div id="box" style:--g-a-r0c0={`url("${processedPath}img/chunks/a-r0c0.webp")`}\r' +
      'style:--g-a-r0c1={seen["g-a-r0c1"] ? `url("${processedPath}img/chunks/a-r0c1.webp")` : null}>',
    '\t\t\t<div id="g-a-r0c0" class="g-aiTile" style="left:0%"></div>\r',
    '\t\t\t<div id="g-a-r0c1" class="g-aiTile" style="left:50%"></div>\r',
    "#g-a-r0c0 {\n\rbackground-image: var(--g-a-r0c0);\n\r}\n\r",
    "#g-a-r0c1 {\n\rbackground-image: var(--g-a-r0c1);\n\r}\n\r",
  ].join("");

  it("removes only the dropped tile's div, var, rule and preload", () => {
    const out = removeTiles(svelte, [
      {
        id: "g-a-r0c1",
        varKey: "g-a-r0c1",
        files: ["a-r0c1.webp", "a-r0c1@2x.webp"],
      },
    ]);
    expect(out).not.toContain("r0c1");
    expect(out).toContain('<div id="g-a-r0c0"');
    expect(out).toContain("style:--g-a-r0c0=");
    expect(out).toContain("var(--g-a-r0c0)");
  });

  it("keeps a div whose id repeats across artboards", () => {
    const twice = svelte + '\t\t\t<div id="g-a-r0c1" class="g-aiTile"></div>\r';
    const out = removeTiles(twice, [
      { id: "g-a-r0c1", varKey: "g-a-r0c1", files: [] },
    ]);
    expect(out.match(/<div id="g-a-r0c1"/g)).toHaveLength(2);
    expect(out).not.toContain("var(--g-a-r0c1)");
  });
});

describe("relinkImage", () => {
  it("swaps every reference to the file, not files that end with its name", () => {
    const svelte = [
      'style:--a={`url("${processedPath}/doc-md.webp")`}',
      '<link rel="preload" href="${processedPath}/doc-md.webp" />',
      'style:--b={`url("${processedPath}/big-doc-md.webp")`}',
      'style:--c={`url("${processedPath}/doc-md.webp.bak")`}',
    ].join("\n");
    expect(relinkImage(svelte, "doc-md.webp", "doc-md.png")).toBe(
      [
        'style:--a={`url("${processedPath}/doc-md.png")`}',
        '<link rel="preload" href="${processedPath}/doc-md.png" />',
        'style:--b={`url("${processedPath}/big-doc-md.webp")`}',
        'style:--c={`url("${processedPath}/doc-md.webp.bak")`}',
      ].join("\n"),
    );
  });
});
