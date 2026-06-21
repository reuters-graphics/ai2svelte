import type { Rule } from "postcss";
import postcss from "postcss";
import type { Plugin } from "postcss";
import * as prettier from "prettier/standalone";
import parserPostCSS from "prettier/plugins/postcss";
// @ts-ignore: postcss-scss has no TypeScript declarations
import scss from "postcss-scss";
import discardEmpty from "postcss-discard-empty";
// @ts-ignore: mixedDecls is a plain JS PostCSS plugin with no type declarations
import mixedDecls from "./mixedDecls";

export function removeIfEmpty(rule: Rule) {
  if (!rule.nodes || rule.nodes.length === 0) {
    rule.remove(); // Clean up empty rules
  }
}

export async function stringToStyles(string: string) {
  let object = {};
  let formatted = string;
  try {
    try {
      formatted = await prettier.format(string, {
        parser: "scss",
        plugins: [parserPostCSS],
      });
    } catch (error) {
      // console.log("Prettier formatting error:");
      // console.log(error);
    }

    object = await postcss([discardEmpty()]).process(formatted, {
      parser: scss,
      from: undefined,
    });
  } catch (error) {
    // ignore errors cause user might still be typing the style
  }

  return object;
}

export function removeSelectorFromResult(result, selector) {
  result.root.walkRules((rule) => {
    if (rule.selector === selector) {
      rule.remove();
    }
  });

  return result.root.toString();
}
