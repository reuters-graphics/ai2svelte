import { test, expect } from "@playwright/test";
import path from "node:path";
import fixtures from "./fixtures.json" with { type: "json" };

for (const fixture of fixtures) {
  test(`visual: ${fixture.name}`, async ({ page }) => {
    const outputDir = `${path.dirname(fixture.aiPath)}/visual-test-output`;
    await page.goto(
      `/scripts/visual-test/harness.html?bundle=/${outputDir}/bundle.js&assetsPath=/${outputDir}`,
    );
    await expect(page.locator("#frameContent")).toHaveScreenshot(`${fixture.name}.png`);
  });
}
