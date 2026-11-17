import { describe, expect, it } from "vitest";
import { compareVersions } from "../utils";

describe("compareVersions", () => {
  it("compares numerically, not as strings (1.0.10 > 1.0.9)", () => {
    expect(compareVersions("1.0.10", "1.0.9")).toBe(1);
    expect(compareVersions("1.0.9", "1.0.10")).toBe(-1);
  });
  it("returns 0 for equal versions, padding missing parts", () => {
    expect(compareVersions("1.0.10", "1.0.10")).toBe(0);
    expect(compareVersions("1.0", "1.0.0")).toBe(0);
  });
  it("compares the major and minor first", () => {
    expect(compareVersions("2.0.0", "1.9.9")).toBe(1);
    expect(compareVersions("1.1.0", "1.0.99")).toBe(1);
  });
});
