import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canonicalizeLanguageTag,
  canonicalizeLanguageTags,
  languageDisplayName,
} from "../main/utils/languages";

describe("language tags", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("canonicalizes language, script, and region subtags", () => {
    expect(canonicalizeLanguageTag(" EN-us ")).toBe("en-US");
    expect(canonicalizeLanguageTag("zh-hant-tw")).toBe("zh-Hant-TW");
  });

  it("rejects malformed or empty tags", () => {
    expect(() => canonicalizeLanguageTag("")).toThrow("Enter a language tag");
    expect(() => canonicalizeLanguageTag("en_US")).toThrow(
      "not a valid BCP 47",
    );
  });

  it("deduplicates equivalent canonical tags without changing order", () => {
    expect(canonicalizeLanguageTags(["en-us", "fr", "EN-US"])).toEqual([
      "en-US",
      "fr",
    ]);
  });

  it("falls back to the canonical tag if display names are unavailable", () => {
    vi.stubGlobal("Intl", { ...Intl, DisplayNames: undefined });
    expect(languageDisplayName("fr")).toBe("fr");
  });
});
