import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import fixtures from "./fixtures.json" with { type: "json" };

for (const fixture of fixtures) {
  if ("translationHarness" in fixture && fixture.translationHarness) {
    const outputDir = `scripts/visual-test/.output/${fixture.name}`;
    const disabled =
      "settings" in fixture && fixture.settings.include_translations === false;
    const legacyReviewMarker =
      "translationFixture" in fixture &&
      "legacyReviewMarker" in fixture.translationFixture &&
      fixture.translationFixture.legacyReviewMarker === true;
    const sourceLanguage =
      "translationFixture" in fixture
        ? fixture.translationFixture.sourceLanguage
        : undefined;
    test(`${fixture.name}: generated component ${disabled ? "keeps source-only output" : "switches language and falls back safely"}`, async ({
      page,
    }) => {
      const generated = readFileSync(`${outputDir}/translation.svelte`, "utf8");
      if (disabled) {
        expect(generated).not.toContain("__a2sTranslationData");
        expect(generated).not.toContain("__a2sTranslationGetTextTranslation");
        expect(generated).not.toContain("{#if __a2sTranslation");
      }
      await page.goto(
        `/scripts/visual-test/harness.html?bundle=/${outputDir}/bundle.js&assetsPath=/${outputDir}`,
      );
      await page.waitForFunction(() => (window as any).__aiMounted === true);
      const content = page.locator("#frameContent");
      if (sourceLanguage === "fr") {
        await expect(content).not.toContainText("Layers fixture");
      } else {
        await expect(content).toContainText("Layers fixture");
      }

      if (legacyReviewMarker) {
        await page.getByRole("button", { name: "French", exact: true }).click();
        await expect(content).toContainText("Carte");
        return;
      }

      if (sourceLanguage === "fr") {
        await page.getByRole("button", { name: "French", exact: true }).click();
        await expect(content.locator("#g-translation-box")).toHaveAttribute(
          "lang",
          "fr",
        );
        await expect(content).toContainText("Layers fixture");
        await expect(content).not.toContainText("Ancienne traduction");
        return;
      }

      if (disabled) {
        await page.getByRole("button", { name: "French", exact: true }).click();
        await expect(content.locator("#g-translation-box")).toHaveAttribute(
          "lang",
          "fr",
        );
        await expect(content).toContainText("Layers fixture");
        await expect(content.locator('p[lang="fr"]')).toHaveCount(0);
        return;
      }

      await page.getByRole("button", { name: "French", exact: true }).click();
      const french = content.locator('p[lang="fr"]');
      await expect(french.first()).toContainText("Carte </script> &");
      await expect(french).toHaveCount(2);
      await page.getByRole("button", { name: "French uppercase" }).click();
      await expect(content.locator('p[lang="fr"]')).toHaveCount(2);
      await expect(content.locator('p[lang="fr"]').first()).toContainText(
        "Carte </script> &",
      );
      await page.getByRole("button", { name: "Malformed French tag" }).click();
      await expect(content.locator('p[lang="fr"]')).toHaveCount(0);
      await expect(content).toContainText("Layers fixture");
      await page.getByRole("button", { name: "French", exact: true }).click();
      const baseStyleTranslation = french.first().locator("span");
      await expect(baseStyleTranslation).toContainText("Carte");
      await expect(baseStyleTranslation).toHaveAttribute("class", /cstyle/);
      const colors = await french.first().evaluate((paragraph) => ({
        paragraph: getComputedStyle(paragraph).color,
        baseStyle: getComputedStyle(paragraph.querySelector("span")!).color,
      }));
      expect(colors).toEqual({
        paragraph: "rgb(220, 38, 38)",
        baseStyle: "rgb(0, 0, 0)",
      });
      expect(await content.locator("script").count()).toBe(0);

      await page.getByRole("button", { name: "French Canada" }).click();
      await expect(content.locator('p[lang="fr"]')).toHaveCount(2);

      await page.getByRole("button", { name: "Arabic" }).click();
      const arabic = content.locator('p[lang="ar"]');
      await expect(arabic).toContainText("خريطة");
      await expect(arabic).toHaveAttribute("dir", "auto");

      await page.getByRole("button", { name: "German" }).click();
      await expect(content.locator("#g-translation-box")).toHaveAttribute(
        "lang",
        "de",
      );
      await expect(content.locator('p[lang="de"]')).toHaveCount(0);
      await expect(content).not.toContainText("Layers fixture");

      await page.getByRole("button", { name: "Unknown language" }).click();
      await expect(content.locator('p[lang="ar"], p[lang="fr"]')).toHaveCount(
        0,
      );
      await expect(content).toContainText("Layers fixture");
      await content.evaluate((element) => {
        (element as HTMLElement).style.width = "400px";
      });
      await page.getByRole("button", { name: "French", exact: true }).click();
      await expect(content.locator('p[lang="fr"]').first()).toContainText(
        "Carte </script> &",
      );
    });
    continue;
  }

  // multiple exports (project_name "x{1,3}y" + layers ending 1/2/3): one
  // component per number, each checked on its own
  if ("files" in fixture) {
    const outputDir = `scripts/visual-test/.output/${fixture.name}`;
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
    const outputDir = `scripts/visual-test/.output/${fixture.name}`;
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
      expect(await page.locator(selector).count(), `${selector} absent`).toBe(
        0,
      );
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
