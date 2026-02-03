import { get } from "svelte/store";
import { styles } from "../../stores";
import type { Rule } from "postcss";
import postcss from "postcss";
import type { Plugin } from "postcss";
import { stylesState } from "./stylesState.svelte";
import * as prettier from "prettier/standalone";
import parserPostCSS from "prettier/plugins/postcss";
// @ts-ignore
// import safeParser from "postcss-safe-parser";
import scss from "postcss-scss";
import discardEmpty from "postcss-discard-empty";
// @ts-ignore
import mixedDecls from "./mixedDecls";

/**
 * Toggles a shadow mixin string in the styles object for a given CSS selector.
 *
 * @param {string} shadowName - The name of the shadow mixin to toggle.
 * @param {boolean} operation - If true, adds the shadow; if false, removes it.
 *
 * The function constructs a shadow mixin string using the provided shadowName and a global shadowColor.
 * If the array becomes empty after removal, the selector is deleted from the styles object.
 * The styles store is updated at the end to trigger reactivity.
 */
function toggleShadowCard(
  shadowName: string,
  operation: boolean,
  shadowColor: string
) {
  const rawStyles = { ...get(styles) };

  const shadowParam = `shadow-${shadowName}(${shadowColor})`;

  let rule =
    rawStyles.root?.nodes.find(
      (node) =>
        node.type === "rule" && node.selector === stylesState.cssSelector
    ) || null;

  // true to add
  // false to remove
  if (operation) {
    // Create an @include AtRule
    const shadowInclude = postcss.atRule({
      name: "include",
      params: shadowParam,
    });

    // if rule doesn't exist already,
    //  create it
    if (!rule) {
      rule = postcss.rule({ selector: stylesState.cssSelector });
      rawStyles.root.append(rule);
    }

    // Add or update a declaration
    (rule as Rule).append(shadowInclude);
  } else {
    if (rule && "walkDecls" in rule && typeof rule.walkDecls === "function") {
      rule.walkAtRules("include", (atRule) => {
        if (atRule.params === shadowParam) {
          atRule.remove();
        }
      });

      if (rule.type == "rule") {
        removeIfEmpty(rule);
      }
    }
  }

  return rawStyles;
}

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
