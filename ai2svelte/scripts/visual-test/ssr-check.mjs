import assert from "node:assert/strict";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { compile, preprocess } from "svelte/compiler";
import sveltePreprocess from "svelte-preprocess";
import { render } from "svelte/server";

const filename = path.resolve(process.argv[2]);
const mode = process.argv[3];
if (
  !filename ||
  !existsSync(filename) ||
  !["disabled", "stale", "translations", "source-language"].includes(mode)
) {
  throw new Error("Usage: node ssr-check.mjs <generated .svelte> <mode>");
}

const compiledFilename = path.join(
  path.dirname(filename),
  `${path.basename(filename, ".svelte")}.ssr.mjs`,
);
try {
  const processed = await preprocess(
    readFileSync(filename, "utf8"),
    sveltePreprocess(),
    { filename },
  );
  const compiled = compile(processed.code, {
    filename,
    generate: "server",
  });
  writeFileSync(compiledFilename, compiled.js.code);
  const Component = (
    await import(`${pathToFileURL(compiledFilename).href}?run=${Date.now()}`)
  ).default;
  const french = render(Component, { props: { lang: "fr" } }).body;
  assert.match(french, /lang="fr"/);
  if (mode === "source-language") {
    assert.ok(french.includes("Layers") && french.includes("fixture"));
    assert.doesNotMatch(french, /Ancienne traduction/);
  } else if (mode === "disabled" || mode === "stale") {
    assert.ok(french.includes("Layers") && french.includes("fixture"));
    assert.doesNotMatch(french, /Carte/);
  } else {
    assert.match(french, /Carte/);
    assert.match(french, /&lt;\/script> &amp;/);
    const fallback = render(Component, { props: { lang: "it" } }).body;
    assert.ok(fallback.includes("Layers") && fallback.includes("fixture"));
    assert.doesNotMatch(fallback, /Carte/);
    const uppercaseFrench = render(Component, { props: { lang: "FR" } }).body;
    assert.match(uppercaseFrench, /Carte/);
    const malformed = render(Component, { props: { lang: "fr-@" } }).body;
    assert.ok(malformed.includes("Layers") && malformed.includes("fixture"));
    assert.doesNotMatch(malformed, /Carte/);
  }
  console.log("SSR generated component passed");
} finally {
  if (existsSync(compiledFilename)) unlinkSync(compiledFilename);
}
