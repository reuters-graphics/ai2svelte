import JSON5 from "json5";
import animationsRaw from "../Tabs/data/animations.json?raw";
import shadowsRaw from "../Tabs/data/shadows.json?raw";
import type {
  AnimationItem,
  ShadowCardItem,
  ShadowItem,
  Style,
} from "../Tabs/types";
// ponytail: postcss-safe-parser ships no types; ambient module declared in src/js/global.d.ts
import safeParser from "postcss-safe-parser";
import postcss from "postcss";
import type { Result, Root } from "postcss";
import * as prettier from "prettier/standalone";
import parserPostCSS from "prettier/plugins/postcss";
import { readFile } from "./utils";

let animations: AnimationItem[];
let shadows: ShadowItem[];

if (window.cep) {
  const userAnimations = readFile("user-animations.json") as
    | AnimationItem[]
    | null;
  if (userAnimations && Object.keys(userAnimations).length !== 0) {
    animations = userAnimations;
  } else {
    animations = JSON5.parse(animationsRaw);
  }

  const userShadows = readFile("user-shadows.json") as ShadowItem[] | null;
  if (userShadows && Object.keys(userShadows).length !== 0) {
    shadows = userShadows;
  } else {
    shadows = JSON5.parse(shadowsRaw);
  }
} else {
  animations = JSON5.parse(animationsRaw);
  shadows = JSON5.parse(shadowsRaw);
}

function getShadowAlpha(sh: ShadowCardItem) {
  const shadowAlphaTest = sh.shadow.match(/rgba\(0,\s*0,\s*0,\s*([\d.]+)\)/);
  let alphaValue = 1;

  if (shadowAlphaTest) {
    alphaValue = parseFloat(shadowAlphaTest[1]);
  }

  return alphaValue;
}

export function createMixinsFile(shadows: ShadowCardItem[]) {
  const mixins: string[] = [];

  shadows.forEach((shadow) => {
    const sh = shadow.shadow;

    const name = "shadow-" + shadow.id.toLowerCase().replace(" ", "");
    let str = `@mixin ${name}($clr){\n`;
    str += sh.replaceAll("rgba(0,0,0", "rgba($clr");
    str += "\n}";
    mixins.push(str);
  });

}

/**
 * Converts a given string to camelCase format.
 *
 * This function transforms the input string by:
 * - Lowercasing the first word.
 * - Capitalizing the first letter of each subsequent word.
 * - Removing all spaces.
 *
 * @param {string} str - The string to convert to camelCase.
 * @returns {string} The camelCase formatted string.
 */
export function toCamelCase(str: string) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, "");
}

/**
 * Generates a SASS mixin string from a given ShadowCardItem object.
 * The mixin allows dynamic color substitution for the shadow.
 *
 * @param {ShadowCardItem} shadow - The shadow object containing an id and shadow CSS string.
 * @returns {string} The generated SASS mixin as a string.
 */
export function createShadowMixinFromCSS(shadow: ShadowCardItem) {
  if (shadow.id === undefined) return "";
  const name = "shadow-" + toCamelCase(shadow.id);
  let str = `@mixin ${name}($clr){\n`;
  // color.alpha needs `@use "sass:color"`, which ai2svelte.js hoists to the
  // top of the <style> block (the global alpha()/if() forms are deprecated).
  str += `$alpha: ${getShadowAlpha(shadow)};\n`;
  str += `@if color.alpha($clr) != 1 { $alpha: color.alpha($clr); }\n`;
  str += shadow.shadow.replaceAll(
    /rgba\(0,\s*0,\s*0,\s*[\d.]+\)/g,
    "rgba($clr, $alpha)",
  );
  str += "\n";
  str += "\n}";

  return str;
}

/**
 * Generates a SASS mixin string from a given AnimationItem object.
 *
 * @param {AnimationItem} animation - The animation object.
 * @returns {string} The generated SASS mixin as a string.
 */
export function createAnimationMixinFromCSS(animation: AnimationItem) {
  const name = "animation-" + animation.name;
  let str = `@mixin ${name}${animation.arguments}{\n`;

  // emit keyframes at root level to avoid SASS mixed-decls
  str += "@at-root {\n";
  str += animation.definition + "\n\r";
  str += "}\n";

  if (Object.keys(animation.cssVariables || {}).length > 0) {
    str += "&{\n";
    Object.keys(animation.cssVariables || {}).forEach((variableKey) => {
      str += `${variableKey}: ${animation?.cssVariables?.[variableKey] || ""};\n`;
    });
    str += "}\n\n";
  }

  str += "\n}";

  return str;
}

/**
 * Parses a SCSS AST node and returns its string representation.
 *
 * @param style - The SCSS AST node to parse. The node should have a `type` property
 *   which can be "decl", "atrule", "rule", or "comment", and other properties
 *   depending on the type.
 * @returns The string representation of the SCSS node. Returns an empty string
 *   for unknown node types.
 */
type SCSSNode = {
  type: string;
  prop?: string;
  value?: string;
  important?: boolean;
  name?: string;
  params?: string;
  text?: string;
  selector?: string;
  nodes?: SCSSNode[];
};

export function parseSCSS(style: SCSSNode): string {
  switch (style.type) {
    case "decl":
      return `${style.prop} : ${style.value}${style.important ? " !important" : ""}`;

    case "atrule":
      return `@${style.name} ${style.params}`;

    case "rule":
      const styles = (style.nodes ?? []).map((x) => parseSCSS(x)).join(";\n");
      const str = `${style.selector} {
${styles};
}`;
      return str;

    case "comment":
      return `/* ${style.text} */`;

    default:
      return "";
  }
}

export function styleObjectToString(stylesObject: Style) {
  const selectors = Object.keys(stylesObject);
  let string = "";

  selectors.forEach((selector) => {
    string += selector + " {\n\t";
    string += (stylesObject[selector]?.join(";\n\t") || "") + ";";
    string += "\n}\n\n";
  });

  return string;
}

/**
 * Collects the unique shadow/animation names used via @include in the styles
 * and looks each up in the local style library. Unknown names resolve to
 * undefined.
 */
function resolveUsedStyles(stylesObject: Result<Root> | undefined) {
  const mixinShadowRegex = new RegExp(/shadow-(.*)\((#[0-9a-fA-F]+)\)/);
  const mixinAnimationRegex = new RegExp(/animation-(.*)\((.*)\)/);

  const shadowNames: Set<string> = new Set();
  const animationNames: Set<string> = new Set();

  stylesObject?.root?.walkAtRules((rule) => {
    const shadowMatch = rule.params.match(mixinShadowRegex);
    if (shadowMatch) shadowNames.add(shadowMatch[1]);

    const animationMatch = rule.params.match(mixinAnimationRegex);
    if (animationMatch) animationNames.add(animationMatch[1]);
  });

  return {
    shadows: Array.from(shadowNames).map((name) => ({
      name,
      spec: shadows.find(
        (s) => s.id.toLowerCase().replace(" ", "") == name.toLowerCase(),
      ),
    })),
    animations: Array.from(animationNames).map((name) => ({
      name,
      spec: animations.find((s) => s.name.toLowerCase() == name.toLowerCase()),
    })),
  };
}

/**
 * Returns the used styles that aren't in the local style library, formatted
 * as they appear in CSS (e.g. "shadow-foo", "animation-bar").
 */
export function findMissingStyles(stylesObject: Result<Root> | undefined) {
  const used = resolveUsedStyles(stylesObject);
  return [
    ...used.shadows.filter((s) => !s.spec).map((s) => "shadow-" + s.name),
    ...used.animations.filter((a) => !a.spec).map((a) => "animation-" + a.name),
  ];
}

/**
 * Generates all unique CSS mixins for shadow and animation styles used in the
 * current styles. Styles missing from the local library get an empty mixin so
 * their @include still compiles; the export path warns via findMissingStyles.
 *
 * @returns {string} A string containing all generated mixin code, joined by newlines.
 */
export function generateAllMixins(stylesObject: Result<Root> | undefined) {
  if (!stylesObject?.root) return "";

  const used = resolveUsedStyles(stylesObject);
  const emptyMixin = (name: string) => `@mixin ${name}($args...) {}`;

  const allShadowMixins = used.shadows.map((s) =>
    s.spec
      ? createShadowMixinFromCSS({ ...s.spec, active: false } as ShadowCardItem)
      : emptyMixin("shadow-" + s.name),
  );

  const allAnimationMixins = used.animations.map((a) =>
    a.spec
      ? createAnimationMixinFromCSS(a.spec)
      : emptyMixin("animation-" + a.name),
  );

  return [...allShadowMixins, ...allAnimationMixins].join("\n\n");
}

export async function parseCSS(css: string) {
  let parsedAST;
  if (css) {
    const formatted = await prettier.format(css, {
      parser: "css", // or "scss" if you're using SCSS
      plugins: [parserPostCSS],
    });

    parsedAST = await postcss().process(formatted, { parser: safeParser });
  } else {
    parsedAST = await postcss().process("", { parser: safeParser });
  }

  return parsedAST;
}
