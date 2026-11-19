import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import fixtures from "../../../../scripts/visual-test/fixtures.json";

// Structural companion to the Playwright visual-test suite: catches output
// changes a pixel diff might miss (e.g. markup that renders the same but
// changed underneath). Populated by `pnpm test:visual:generate`, which needs
// real Illustrator — skipped if that hasn't been run.
describe("ai2svelte generated output (visual-test)", () => {
  for (const fixture of fixtures) {
    // multiple-export fixtures snapshot each component; one-file keeps the
    // original test name so existing snapshots still match
    const files: (string | null)[] = (fixture as { files?: string[] })
      .files ?? [null];
    for (const file of files) {
      const label = file ? `${fixture.name}/${file}` : fixture.name;
      const outputDir = path.resolve(
        __dirname,
        "../../../../",
        "scripts/visual-test/.output",
        fixture.name,
      );
      // skipped (listed by the reporter) until "pnpm test:visual:generate" runs
      it.skipIf(!existsSync(outputDir))(
        `${label} matches last-approved snapshot`,
        () => {
          const svelteFile = file
            ? `${file}.svelte`
            : readdirSync(outputDir).find((f) => f.endsWith(".svelte"));
          const content = readFileSync(
            path.join(outputDir, svelteFile as string),
            "utf8",
          );
          // ai2svelte stamps a generation timestamp in comments — strip it so this
          // snapshot only fails on actual output changes, not on wall-clock time.
          // Embedded raster data (svg_embed_images) is MBs of base64 that the
          // screenshot test already covers -- keep only a short hash of it.
          const normalized = content
            .replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/g, "<timestamp>")
            .replace(
              /data:image\/(\w+);base64,[A-Za-z0-9+/=\s]+/g,
              (m, type) =>
                `data:image/${type};base64,<${createHash("sha1").update(m).digest("hex").slice(0, 12)}>`,
            );
          expect(normalized).toMatchSnapshot();
        },
      );

      if ("translationHarness" in fixture && fixture.translationHarness) {
        const disabled =
          "settings" in fixture &&
          fixture.settings.include_translations === false;
        const stale =
          "translationFixture" in fixture &&
          "stale" in fixture.translationFixture &&
          fixture.translationFixture.stale === true;
        it.skipIf(!existsSync(outputDir))(
          `${label} renders actual generated translations in SSR`,
          () => {
            const svelteFile = readdirSync(outputDir).find(
              (file) =>
                file.endsWith(".svelte") &&
                file !== "translation-wrapper.svelte",
            );
            const filename = path.join(outputDir, svelteFile as string);
            const mode = disabled
              ? "disabled"
              : stale
                ? "stale"
                : "translations";
            const result = execFileSync(
              process.execPath,
              [
                path.resolve(
                  __dirname,
                  "../../../../scripts/visual-test/ssr-check.mjs",
                ),
                filename,
                mode,
              ],
              { encoding: "utf8" },
            );
            expect(result).toContain("SSR generated component passed");
          },
        );
      }
    }
  }
});
