import { describe, expect, it } from "vitest";
import {
  allocateTranslationMessage,
  canonicalizeTextTranslationStore,
  createDefaultTextTranslationStore,
  isTranslationMessageReviewed,
  parseTextTranslationStore,
  resolveTranslationLanguage,
  translationLanguageResolverSource,
} from "../../shared/textTranslations";
import { parseStoredJson } from "../../shared/storedJson";

describe("text translation model", () => {
  it("defaults missing metadata to English without allocating an ID", () => {
    expect(parseTextTranslationStore({})).toEqual(
      createDefaultTextTranslationStore(),
    );
  });

  it("propagates corrupt JSON instead of treating saved data as absent", () => {
    expect(() => parseStoredJson("{broken")).toThrow(SyntaxError);
    expect(parseStoredJson(null)).toEqual({});
  });

  it("rejects unknown schemas and malformed messages instead of erasing them", () => {
    expect(() => parseTextTranslationStore({ schemaVersion: 2 })).toThrow(
      "Unsupported text translations schema version",
    );
    expect(() => parseTextTranslationStore("corrupt")).toThrow(
      "text translations data is malformed",
    );

    const malformed = createDefaultTextTranslationStore();
    malformed.messages = [
      {
        id: "m1",
        signature: "source",
        sourceText: "Source",
        reviewedSignature: "source",
        styleKeys: [],
        translations: {
          fr: [{ text: "Nested", styleKey: 10 as unknown as string }],
        },
      },
    ];
    expect(() => parseTextTranslationStore(malformed)).toThrow(
      "text translations data is malformed",
    );
  });

  it("rejects non-monotonic message IDs and duplicate source signatures", () => {
    const store = createDefaultTextTranslationStore();
    allocateTranslationMessage(store, "same", "Source", []);
    store.nextMessageId = 1;
    expect(() => parseTextTranslationStore(store)).toThrow(
      "text translations data is malformed",
    );

    store.nextMessageId = 2;
    store.messages.push({
      ...store.messages[0],
      id: "m2",
    });
    expect(() => parseTextTranslationStore(store)).toThrow(
      "text translations data is malformed",
    );
  });

  it("rejects stored translation marks not present in the message's style registry", () => {
    const store = createDefaultTextTranslationStore();
    const message = allocateTranslationMessage(store, "sig", "Source", [
      "bold",
    ]);
    message.translations.fr = [{ text: "Texte", styleKey: "unknown" }];
    store.languages.push("fr");
    expect(() => parseTextTranslationStore(store)).toThrow(
      "text translations data is malformed",
    );
  });

  it("canonicalizes stored language keys and rejects conflicting equivalent tags", () => {
    const store = createDefaultTextTranslationStore();
    store.languages.push("fr");
    const message = allocateTranslationMessage(store, "sig", "Source", []);
    message.translations.FR = [{ text: "Texte", styleKey: null }];
    expect(
      canonicalizeTextTranslationStore(
        store,
        (tag) => Intl.getCanonicalLocales(tag)[0],
      ).messages[0].translations,
    ).toEqual({ fr: [{ text: "Texte", styleKey: null }] });
    message.translations.fr = [{ text: "Autre", styleKey: null }];
    expect(() =>
      canonicalizeTextTranslationStore(
        store,
        (tag) => Intl.getCanonicalLocales(tag)[0],
      ),
    ).toThrow("Conflicting translations");
  });

  it("allocates monotonic IDs by exact semantic signature", () => {
    const store = createDefaultTextTranslationStore();
    const first = allocateTranslationMessage(store, "semantic-a", "one", []);
    expect(allocateTranslationMessage(store, "semantic-a", "one", [])).toBe(
      first,
    );
    expect(
      allocateTranslationMessage(store, "semantic-b", "two", ["bold"]),
    ).toMatchObject({ id: "m2", styleKeys: ["bold"] });
    expect(store.nextMessageId).toBe(3);
  });

  it("marks changed source signatures for review", () => {
    const message = allocateTranslationMessage(
      createDefaultTextTranslationStore(),
      "before",
      "Source",
      [],
    );
    expect(isTranslationMessageReviewed(message, "before")).toBe(true);
    expect(isTranslationMessageReviewed(message, "after")).toBe(false);
  });

  it("uses exact, then configured base, then source language fallback", () => {
    expect(resolveTranslationLanguage("fr-CA", ["en", "fr"], "en")).toBe("fr");
    expect(resolveTranslationLanguage("fr", ["en", "fr"], "en")).toBe("fr");
    expect(resolveTranslationLanguage("FR", ["en", "fr"], "en")).toBe("fr");
    expect(resolveTranslationLanguage("fr-@", ["en", "fr"], "en")).toBe("en");
    expect(resolveTranslationLanguage("de-AT", ["en", "de-CH"], "en")).toBe(
      "en",
    );
  });

  it("emits the same canonical exact/base/source language resolver for Svelte", () => {
    const source = translationLanguageResolverSource(
      "resolve",
      "source",
      "langs",
    );
    expect(source).toContain("Intl.getCanonicalLocales");
    expect(source).toContain("catch (e)");
    expect(source).toContain("langs.indexOf(canonical)");
    expect(source).toContain("return source");
  });
});
