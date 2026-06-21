// @ts-nocheck
/**
 * Polyfills for APIs missing in older Chromium versions embedded in Adobe CEP panels.
 *
 * Adobe CEP uses an embedded Chromium browser whose version depends on the
 * Illustrator release:
 *   CEP 9  (Illustrator CC 2019) → Chromium 73
 *   CEP 10 (Illustrator CC 2020) → Chromium 83
 *   CEP 11 (Illustrator CC 2021) → Chromium 88
 *   CEP 12 (Illustrator CC 2022) → Chromium 99
 *
 * Vite's esbuild transforms syntax (arrow functions, private class methods,
 * optional chaining, etc.) for the configured `target: "chrome74"`, but it
 * does NOT polyfill runtime methods. bits-ui v2 uses Array.prototype.at()
 * in its keyboard navigation and floating-layer code, which first landed in
 * Chrome 92. Calling .at() on Chrome 74–91 throws TypeError and breaks all
 * components that use it.
 *
 * This file must be imported before any bits-ui code executes.
 */

// Array.prototype.at  — Chrome 92+ (bits-ui uses for keyboard Home/End and
// floating layer "highest layer" detection)
if (typeof Array.prototype.at !== "function") {
  Array.prototype.at = function at(index) {
    const len = this.length >>> 0;
    const relIndex = index < 0 ? len + index : index;
    return relIndex >= 0 && relIndex < len ? this[relIndex] : undefined;
  };
  Object.defineProperty(Array.prototype, "at", { enumerable: false });
}

// String.prototype.at  — Chrome 92+ (defensive; bits-ui may use for
// typeahead string indexing in future versions)
if (typeof String.prototype.at !== "function") {
  String.prototype.at = function at(index) {
    const str = String(this);
    const len = str.length;
    const relIndex = index < 0 ? len + index : index;
    return relIndex >= 0 && relIndex < len ? str[relIndex] : undefined;
  };
  Object.defineProperty(String.prototype, "at", { enumerable: false });
}
