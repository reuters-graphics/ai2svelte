import { test, expect } from "@playwright/test";
import { readdirSync } from "node:fs";
import path from "node:path";
import fixtures from "./fixtures.json" with { type: "json" };

for (const fixture of fixtures) {
  // multiple exports (project_name "x{1,3}y" + layers ending 1/2/3): one
  // component per number, each checked on its own
  if ("files" in fixture) {
    const outputDir = `${path.dirname(fixture.aiPath)}/visual-test-output-${fixture.name}`;
    test(`visual: ${fixture.name} writes one .svelte per layer number`, () => {
      const written = readdirSync(outputDir)
        .filter((f) => f.endsWith(".svelte"))
        .map((f) => f.replace(/\.svelte$/, ""))
        .sort();
      expect(written).toEqual(fixture.files);
    });
    for (const file of fixture.files) {
      test(`visual: ${fixture.name}/${file}`, async ({ page }) => {
        await page.goto(
          `/scripts/visual-test/harness.html?bundle=/${outputDir}/bundle-${file}.js&assetsPath=/${outputDir}`,
        );
        await expect(page.locator("#frameContent")).toHaveScreenshot(
          `${fixture.name}-${file}.png`,
        );
      });
    }
    continue;
  }

  test(`visual: ${fixture.name}`, async ({ page }) => {
    const outputDir = `${path.dirname(fixture.aiPath)}/visual-test-output-${fixture.name}`;
    const chunkRequests: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/chunks/")) chunkRequests.push(req.url());
    });
    await page.goto(
      `/scripts/visual-test/harness.html?bundle=/${outputDir}/bundle.js&assetsPath=/${outputDir}`,
    );
    // onAiMounted must fire; onArtboardChange fires for the artboard on show
    await page.waitForFunction(() => (window as any).__aiMounted === true);
    const frozen = "freezeAnimations" in fixture && fixture.freezeAnimations;
    if (frozen) {
      // every preset animation parked on the same frame (400ms in): pausing
      // alone freezes wherever the clock happened to be, which varies per run
      await page.evaluate(() =>
        document.getAnimations().forEach((a) => {
          a.pause();
          a.currentTime = 400;
        }),
      );
    }
    // "expect": elements that must (not) be in the output, e.g. data-* attributes
    const expected = "expect" in fixture ? fixture.expect : undefined;
    for (const selector of expected?.present ?? []) {
      expect(
        await page.locator(selector).count(),
        `${selector} present`,
      ).toBeGreaterThan(0);
    }
    for (const selector of expected?.absent ?? []) {
      expect(await page.locator(selector).count(), `${selector} absent`).toBe(0);
    }
    // "baseline": render must match another fixture's screenshot (e.g. chunked
    // output must look identical to the unchunked export)
    // A borrowed baseline gets a small tolerance: the tiles reassemble to the
    // whole image within JPEG noise, but Chrome composites a mix-blend-mode
    // layer over 9 tile layers slightly differently than over 1 (1px shifts on
    // the blended edge, ~0.1% of pixels).
    const borrowed = "baseline" in fixture;
    const baseline = borrowed ? fixture.baseline : fixture.name;
    await expect(page.locator("#frameContent")).toHaveScreenshot(
      `${baseline}.png`,
      {
        // "allow": the default "disabled" resets infinite animations to frame 0,
        // undoing the frozen frame set above
        ...(frozen ? { animations: "allow" as const } : {}),
        ...(borrowed ? { maxDiffPixelRatio: 0.003 } : {}),
      },
    );

    if (fixture.name.includes("chunked")) {
      // only the visible breakpoint's tiles may load (#81): every requested tile
      // must be the background of a tile that's actually displayed
      const shown = await page.evaluate(() =>
        [...document.querySelectorAll(".g-aiTile")]
          .filter((el) => (el as HTMLElement).offsetParent)
          .map((el) =>
            getComputedStyle(el).backgroundImage.replace(/^url\("?|"?\)$/g, ""),
          ),
      );
      expect(shown.length).toBeGreaterThan(1);
      expect(chunkRequests.length).toBeGreaterThan(0);
      for (const url of chunkRequests) expect(shown).toContain(url);
    }
  });
}
