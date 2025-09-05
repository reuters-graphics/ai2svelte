import JSON5 from "json5";
import animationsRaw from "../Tabs/data/animations.json?raw";
import shadowsRaw from "../Tabs/data/shadows.json?raw";
import type { AnimationItem, ShadowItem } from "../Tabs/types";

const animations = JSON5.parse(animationsRaw);
const shadows = JSON5.parse(shadowsRaw);

export function createMixinsFile(shadows: ShadowItem[]) {
  const mixins: string[] = [];

  shadows.forEach((shadow) => {
    const sh = shadow.shadow;
    const name = "shadow-" + shadow.id.toLowerCase().replace(" ", "");
    let str = `@mixin ${name}($clr){\n`;
    str += sh.replaceAll("rgba(0,0,0", "rgba($clr");
    str += "\n}";
    mixins.push(str);
  });

  console.log(mixins.join("\n\n"));
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
 * Generates a SASS mixin string from a given ShadowItem object.
 * The mixin allows dynamic color substitution for the shadow.
 *
 * @param {ShadowItem} shadow - The shadow object containing an id and shadow CSS string.
 * @returns {string} The generated SASS mixin as a string.
 */
export function createShadowMixinFromCSS(shadow: ShadowItem) {
  const name = "shadow-" + toCamelCase(shadow.id);
  let str = `@mixin ${name}($clr){\n`;
  str += shadow.shadow.replaceAll("rgba(0, 0, 0", "rgba($clr");
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
  str += animation.definition + "\n\r";
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
export function parseSCSS(style) {
  switch (style.type) {
    case "decl":
      return `${style.prop} : ${style.value}${style.important ? " !important" : ""}`;

    case "atrule":
      return `@${style.name} ${style.params}`;

    case "rule":
      const styles = style.nodes.map((x) => parseSCSS(x)).join(";\n");
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

export function styleObjectToString(stylesObject) {
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
 * Generates all unique CSS mixins for shadow styles used in the current styles.
 *
 * @returns {string} A string containing all generated mixin code, joined by newlines.
 */
export function generateAllMixins(stylesObject) {
  const mixinShadowRegex = new RegExp(
    /@include\sshadow-(.*)\((#[0-9a-fA-F]+)\)/
  );
  const mixinAnimationRegex = new RegExp(/@include\sanimation-(.*)\((.*)\)/);

  // get all unique shadow styles
  const allShadowStyles = new Set(
    Object.keys(stylesObject)
      .map((x) => stylesObject[x])
      .flat()
      .filter((x) => mixinShadowRegex.test(x))
      .map((x) => {
        const match = x.match(mixinShadowRegex);
        return match ? match[1] : undefined;
      })
  );

  // get all unique animation styles
  const allAnimationStyles = new Set(
    Object.keys(stylesObject)
      .map((x) => stylesObject[x])
      .flat()
      .filter((x) => mixinAnimationRegex.test(x))
      .flatMap((x) => {
        const match = x.match(mixinAnimationRegex);
        return match ? match[1] : undefined;
      })
  );

  // get all shadows CSS
  const allShadowStylesCSS = Array.from(allShadowStyles).map((x) =>
    shadows.find((s) => s.id.toLowerCase().replace(" ", "") == x.toLowerCase())
  );

  // get all animations CSS
  const allAnimationStylesCSS = Array.from(allAnimationStyles).map((x) =>
    animations.find((s) => s.name.toLowerCase() == x.toLowerCase())
  );

  // generate all shadow mixins
  const allShadowMixins = allShadowStylesCSS.map((shadow) =>
    createShadowMixinFromCSS({ ...shadow, active: false } as ShadowItem)
  );

  // generate all animation mixins
  const allAnimationMixins = allAnimationStylesCSS.map((animation) =>
    createAnimationMixinFromCSS(animation as AnimationItem)
  );

  let allMixins = [...allShadowMixins, ...allAnimationMixins].join("\n\n");

  return allMixins;
}
