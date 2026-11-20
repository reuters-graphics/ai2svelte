import { describe, expect, it } from "vitest";
import { getRasterTileBounds } from "../../../jsx/ilst/ai2svelte/aiUtils.js";

describe("raster tile crop bounds", () => {
  it.each([565.2941, 565.1])(
    "keeps exact outer bounds when a %s-point extent rounds up or down",
    (extent) => {
      const rect = [2802.1387, 3599.779, 2802.1387 + extent, 3599.779 - extent];
      const total = Math.round(extent * 2);
      const crop = getRasterTileBounds(rect, [624, 624, total, total], 2);

      expect(crop).toEqual([rect[0] + 312, rect[1] - 312, rect[2], rect[3]]);
    },
  );

  it("preserves interior grid edges and opaque-tile bleed", () => {
    expect(
      getRasterTileBounds([10, 600, 940, 34.7059], [0, 0, 626, 514], 2),
    ).toEqual([10, 600, 323, 343]);
  });

  it("keeps integer-size terminal tiles unchanged", () => {
    expect(
      getRasterTileBounds([10, 600, 940, 35], [1248, 512, 1860, 1130], 2),
    ).toEqual([634, 344, 940, 35]);
  });
});
