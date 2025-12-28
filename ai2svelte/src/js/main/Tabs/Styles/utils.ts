import { get } from "svelte/store";
import { styles } from "../../stores";
import type { Rule } from "postcss";

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
export function toggleShadowCard(
  shadowName: string,
  operation: boolean,
  shadowColor: string
) {
  const rawStyles = { ...get(styles) };

  const shadowParam = `shadow-${shadowName}(${shadowColor})`;

  let rule =
    rawStyles.root?.nodes.find(
      (node) => node.type === "rule" && node.selector === cssSelector
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
      rule = postcss.rule({ selector: cssSelector });
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
