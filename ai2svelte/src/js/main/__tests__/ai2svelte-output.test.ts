import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import fixtures from "../../../../scripts/visual-test/fixtures.json";

// Structural companion to the Playwright visual-test suite: catches output
// changes a pixel diff might miss (e.g. markup that renders the same but
// changed underneath). Populated by `pnpm test:visual:generate`, which needs
// real Illustrator — skips quietly if that hasn't been run.
describe("ai2svelte generated output (visual-test)", () => {
  for (const fixture of fixtures) {
    it(`${fixture.name} matches last-approved snapshot`, () => {
      const outputDir = path.resolve(
        __dirname,
        "../../../../",
        path.dirname(fixture.aiPath),
        "visual-test-output"
      );
      if (!existsSync(outputDir)) {
        console.warn(`Skipping ${fixture.name}: run "pnpm test:visual:generate" first.`);
        return;
      }
      const svelteFile = readdirSync(outputDir).find((f) => f.endsWith(".svelte"));
      const content = readFileSync(path.join(outputDir, svelteFile as string), "utf8");
      // ai2svelte stamps a generation timestamp in comments — strip it so this
      // snapshot only fails on actual output changes, not on wall-clock time.
      const normalized = content.replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/g, "<timestamp>");
      expect(normalized).toMatchSnapshot();
    });
  }
});
