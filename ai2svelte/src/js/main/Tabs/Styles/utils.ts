import type { Result, Root, Rule } from "postcss";
import postcss from "postcss";
import * as prettier from "prettier/standalone";
import parserPostCSS from "prettier/plugins/postcss";
import scss from "postcss-scss";
import discardEmpty from "postcss-discard-empty";

export function removeIfEmpty(rule: Rule) {
  if (!rule.nodes || rule.nodes.length === 0) {
    rule.remove(); // Clean up empty rules
  }
}

// Resolves undefined when the SCSS doesn't parse, so callers keep the last good styles.
export async function stringToStyles(
  string: string,
): Promise<Result<Root> | undefined> {
  let object: Result<Root> | undefined;
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

export function removeSelectorFromResult(
  result: Result<Root>,
  selector: string,
) {
  result.root.walkRules((rule) => {
    if (rule.selector === selector) {
      rule.remove();
    }
  });

  return result.root.toString();
}
