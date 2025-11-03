import type { ShadowItem } from "../Tabs/types";

// Convert rgba(...) to #RRGGBBAA
function rgbaToHex(rgba: string): string {
  const match = rgba.match(
    /rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0|1|0?\.\d+)\s*\)/
  );
  if (!match) return rgba;

  const [, r, g, b, a] = match;
  const toHex = (val: string): string =>
    Math.max(0, Math.min(255, parseInt(val, 10)))
      .toString(16)
      .padStart(2, "0");
  const alphaHex = Math.round(parseFloat(a) * 255)
    .toString(16)
    .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}${alphaHex}`;
}

// Replace all rgba(...) substrings inside a string
function replaceRgbaInString(str: string): string {
  return str.replace(
    /rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)/g,
    rgbaToHex
  );
}

// Traverse and transform
function traverse(obj: unknown): unknown {
  if (typeof obj === "string") {
    return replaceRgbaInString(obj);
  } else if (Array.isArray(obj)) {
    return obj.map((item) => traverse(item));
  } else if (typeof obj === "object" && obj !== null) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, traverse(value)])
    );
  }
  return obj;
}

export function bakeShadows(rawShadows: ShadowItem[]): ShadowItem[] {
  try {
    const updated = traverse(rawShadows);
    return Array.isArray(updated) ? (updated as ShadowItem[]) : [];
  } catch (err: unknown) {
    console.error(`❌ Error: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}
