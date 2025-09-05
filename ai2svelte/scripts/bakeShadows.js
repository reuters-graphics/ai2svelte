import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Setup __dirname for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse CLI args
const args = process.argv.slice(2);
const inputArg = args.find((arg) => arg.startsWith("--input="));
const outputArg = args.find((arg) => arg.startsWith("--output="));

const inputPath = inputArg
  ? path.resolve(inputArg.split("=")[1])
  : path.resolve(__dirname, "colors.json");

const outputPath = outputArg
  ? path.resolve(outputArg.split("=")[1])
  : path.resolve(__dirname, "colors-hex.json");

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

// Execute
try {
  const raw = fs.readFileSync(inputPath, "utf-8");
  const json = JSON.parse(raw);
  const updated = traverse(json);

  fs.writeFileSync(outputPath, JSON.stringify(updated, null, 2));
  console.log(
    `✅ Embedded rgba values converted to hex and saved to:\n${outputPath}`
  );
} catch (err) {
  console.error(`❌ Error: ${err.message}`);
}
