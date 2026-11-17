// Builds the CSS string the panel sends to the engine (RunButton's
// $stylesString): mixins for every shadow/animation the styles @include, from
// the real library code, followed by the user's SCSS. Loaded through Vite so
// cssUtils.ts (TS, `?raw` imports) runs unmodified.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import postcss from "postcss";
import scss from "postcss-scss";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// ponytail: cssUtils reads `window.cep` at import; outside CEP it falls back to the bundled library
globalThis.window ??= {};

let vite;
async function cssUtils() {
  vite ??= await createServer({
    root: rootDir,
    configFile: path.join(rootDir, "vitest.config.ts"),
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    logLevel: "error",
    optimizeDeps: { noDiscovery: true },
  });
  return vite.ssrLoadModule("/src/js/main/utils/cssUtils.ts");
}

export async function toCamelCase(str) {
  return (await cssUtils()).toCamelCase(str);
}

export async function buildStylesString(userScss) {
  const { generateAllMixins } = await cssUtils();
  const result = await postcss().process(userScss, { from: undefined, parser: scss });
  return generateAllMixins(result) + "\n" + result.root.toString();
}

export async function closeStyles() {
  await vite?.close();
}
