import { describe, expect, it } from "vitest";
import { settingsEqual } from "../utils";

describe("settingsEqual", () => {
  it("ignores the slider's string -> number coercion", () => {
    expect(settingsEqual({ image_quality: "90" }, { image_quality: 90 })).toBe(true);
  });
  it("ignores key order", () => {
    expect(settingsEqual({ a: "1", b: "2" }, { b: "2", a: "1" })).toBe(true);
  });
  it("catches real changes, added and removed keys", () => {
    expect(settingsEqual({ image_quality: 90 }, { image_quality: 80 })).toBe(false);
    expect(settingsEqual({}, { a: "1" })).toBe(false);
    expect(settingsEqual({ a: "1" }, { b: "1" })).toBe(false);
  });
});
