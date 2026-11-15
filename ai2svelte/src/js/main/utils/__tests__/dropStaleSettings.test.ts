import { describe, expect, it, vi } from "vitest";
import { evalTS } from "../../../lib/utils/bolt";
import { dropStaleSettings } from "../utils";

const savedBy = (version?: string) =>
  vi.mocked(evalTS).mockResolvedValueOnce(version ? { version } : {});

describe("dropStaleSettings", () => {
  it("drops use_lazy_loader saved before 1.0.10 (an old no-op default)", async () => {
    savedBy("1.0.9");
    expect(
      await dropStaleSettings({ use_lazy_loader: true, max_width: 1 }),
    ).toEqual({
      max_width: 1,
    });
    savedBy(undefined); // no saved version: pre-1.0.2 file
    expect(await dropStaleSettings({ use_lazy_loader: true })).toEqual({});
  });

  it("keeps use_lazy_loader saved by 1.0.10 or later", async () => {
    savedBy("1.0.10");
    expect(await dropStaleSettings({ use_lazy_loader: true })).toEqual({
      use_lazy_loader: true,
    });
  });
});
