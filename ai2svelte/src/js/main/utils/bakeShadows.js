import JSON5 from "json5";

// Convert rgba(...) to #RRGGBBAA
function rgbaToHex(rgba) {
  const match = rgba.match(
    /rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0|1|0?\.\d+)\s*\)/
  );
  if (!match) return rgba;

  const [_, r, g, b, a] = match;
  const toHex = (val) =>
    Math.max(0, Math.min(255, parseInt(val)))
      .toString(16)
      .padStart(2, "0");
  const alphaHex = Math.round(parseFloat(a) * 255)
    .toString(16)
    .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}${alphaHex}`;
}

// Replace all rgba(...) substrings inside a string
function replaceRgbaInString(str) {
  return str.replace(
    /rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)/g,
    rgbaToHex
  );
}

// Traverse and transform
function traverse(obj) {
  if (typeof obj === "string") {
    return replaceRgbaInString(obj);
  } else if (Array.isArray(obj)) {
    return obj.map(traverse);
  } else if (typeof obj === "object" && obj !== null) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, traverse(value)])
    );
  }
  return obj;
}

export function bakeShadows(rawShadows) {
  // Execute
  try {
    const json = rawShadows;
    const updated = traverse(json);
    return updated;
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    return {};
  }
}
