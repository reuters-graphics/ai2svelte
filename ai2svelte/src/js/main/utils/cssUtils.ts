import type { ShadowItem, AnimationItem } from "../Tabs/types";

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
export function createMixinFromCSS(shadow: ShadowItem) {
    const name = "shadow-" + toCamelCase(shadow.id);
    let str = `@mixin ${name}($clr){\n`;
    str += shadow.shadow.replaceAll("rgba(0,0,0", "rgba($clr");
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
            return `${style.prop} : ${style.value}${style.important ? ' !important' : ''}`;

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