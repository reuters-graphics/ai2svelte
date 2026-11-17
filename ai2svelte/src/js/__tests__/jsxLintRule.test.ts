import { describe, expect, it } from "vitest";
import { ESLint } from "eslint";

// ExtendScript evaluates `a || b && c` wrongly, so eslint.config.js bans it
// in src/jsx. Lint snippets with the repo's real config to keep that true.
const lint = async (code: string) => {
  const eslint = new ESLint({ cwd: process.cwd() });
  const [res] = await eslint.lintText(code, {
    filePath: "src/jsx/ilst/ai2svelte/sample.js",
  });
  return res.messages.filter((m) => m.ruleId === "no-restricted-syntax");
};

describe("jsx lint: a || b && c", () => {
  it("flags the mixed operators", async () => {
    expect(await lint("var x = a || b && c;")).toHaveLength(1);
  });
  it("accepts plain ifs and single-operator chains", async () => {
    expect(
      await lint("var x = a && b && c; var y = a || b || c;"),
    ).toHaveLength(0);
  });
});
