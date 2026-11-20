export const TEXT_TRANSLATIONS_SCHEMA_VERSION = 1;
export const TEXT_TRANSLATIONS_KEY = "text-translations";

export function isSupportedLanguageTagShape(tag: unknown): tag is string {
  return (
    typeof tag === "string" &&
    /^(?:[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*|x(?:-[A-Za-z0-9]{1,8})+)$/.test(
      tag,
    )
  );
}

export interface TranslationSegment {
  text: string;
  styleKey: string | null;
}

export interface TranslationMessage {
  id: string;
  signature: string;
  sourceText: string;
  styleKeys: string[];
  translations: Record<string, TranslationSegment[]>;
}

export interface TextTranslationStore {
  schemaVersion: number;
  sourceLanguage: string;
  languages: string[];
  nextMessageId: number;
  messages: TranslationMessage[];
}

export function createDefaultTextTranslationStore(): TextTranslationStore {
  return {
    schemaVersion: TEXT_TRANSLATIONS_SCHEMA_VERSION,
    sourceLanguage: "en",
    languages: ["en"],
    nextMessageId: 1,
    messages: [],
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !isArray(value);
}

function isArray(value: unknown): value is unknown[] {
  return Object.prototype.toString.call(value) === "[object Array]";
}

function containsString(values: string[], expected: string): boolean {
  for (let i = 0; i < values.length; i++) {
    if (values[i] === expected) return true;
  }
  return false;
}

function isStringArray(value: unknown): value is string[] {
  if (!isArray(value)) return false;
  for (let i = 0; i < value.length; i++) {
    if (typeof value[i] !== "string") return false;
  }
  return true;
}

function isTranslationSegments(value: unknown): value is TranslationSegment[] {
  if (!isArray(value)) return false;
  for (let i = 0; i < value.length; i++) {
    const segment = value[i] as Record<string, unknown> | null;
    if (
      !isObject(segment) ||
      typeof segment.text !== "string" ||
      (segment.styleKey !== null && typeof segment.styleKey !== "string")
    ) {
      return false;
    }
  }
  return true;
}

function isTranslationMessage(value: unknown): value is TranslationMessage {
  if (!isObject(value) || !isObject(value.translations)) return false;
  if (
    typeof value.id !== "string" ||
    !/^m[1-9]\d*$/.test(value.id) ||
    typeof value.signature !== "string" ||
    typeof value.sourceText !== "string" ||
    !isStringArray(value.styleKeys)
  ) {
    return false;
  }

  for (const language in value.translations) {
    if (
      Object.prototype.hasOwnProperty.call(value.translations, language) &&
      !isTranslationSegments(value.translations[language])
    ) {
      return false;
    }
    if (Object.prototype.hasOwnProperty.call(value.translations, language)) {
      const segments = value.translations[language] as TranslationSegment[];
      const styleKeys = value.styleKeys as string[];
      for (let i = 0; i < segments.length; i++) {
        const styleKey = segments[i].styleKey;
        if (
          typeof styleKey === "string" &&
          !containsString(styleKeys, styleKey)
        ) {
          return false;
        }
      }
    }
  }
  return true;
}

export function parseTextTranslationStore(
  value: unknown,
): TextTranslationStore {
  if (value === null || value === undefined) {
    return createDefaultTextTranslationStore();
  }
  if (!isObject(value)) {
    throw new Error("The document's text translations data is malformed.");
  }
  let hasProperties = false;
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      hasProperties = true;
      break;
    }
  }
  if (!hasProperties) return createDefaultTextTranslationStore();
  if (value.schemaVersion !== TEXT_TRANSLATIONS_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported text translations schema version: ${String(value.schemaVersion)}.`,
    );
  }
  const languagesValue = value.languages;
  if (
    typeof value.sourceLanguage !== "string" ||
    !isStringArray(languagesValue) ||
    languagesValue.length === 0 ||
    !containsString(languagesValue, value.sourceLanguage) ||
    typeof value.nextMessageId !== "number" ||
    Math.floor(value.nextMessageId) !== value.nextMessageId ||
    value.nextMessageId < 1 ||
    !isArray(value.messages)
  ) {
    throw new Error("The document's text translations data is malformed.");
  }

  const languages = languagesValue;
  const languageSet: Record<string, boolean> = {};
  for (let i = 0; i < languages.length; i++) {
    const language = languages[i];
    if (
      !isSupportedLanguageTagShape(language) ||
      languageSet["$" + language.toLowerCase()]
    ) {
      throw new Error("The document's text translations data is malformed.");
    }
    languageSet["$" + language.toLowerCase()] = true;
  }
  if (!isSupportedLanguageTagShape(value.sourceLanguage)) {
    throw new Error("The document's text translations data is malformed.");
  }

  const ids: Record<string, boolean> = {};
  const signatures: Record<string, boolean> = {};
  let maxMessageNumber = 0;
  for (let i = 0; i < value.messages.length; i++) {
    const message = value.messages[i];
    if (
      !isTranslationMessage(message) ||
      ids[message.id] ||
      signatures[message.signature]
    ) {
      throw new Error("The document's text translations data is malformed.");
    }
    ids[message.id] = true;
    signatures[message.signature] = true;
    maxMessageNumber = Math.max(maxMessageNumber, Number(message.id.slice(1)));
    for (const language in message.translations) {
      if (
        Object.prototype.hasOwnProperty.call(message.translations, language) &&
        !languageSet["$" + language.toLowerCase()]
      ) {
        throw new Error("The document's text translations data is malformed.");
      }
    }
  }
  if (value.nextMessageId <= maxMessageNumber) {
    throw new Error("The document's text translations data is malformed.");
  }

  return value as unknown as TextTranslationStore;
}

export function cloneTextTranslationStore(
  store: TextTranslationStore,
): TextTranslationStore {
  return JSON.parse(JSON.stringify(store)) as TextTranslationStore;
}

export function canonicalizeTextTranslationStore(
  store: TextTranslationStore,
  canonicalizeLanguageTag: (tag: string) => string,
): TextTranslationStore {
  const result = cloneTextTranslationStore(store);
  const languages: string[] = [];
  for (let i = 0; i < result.languages.length; i++) {
    const tag = canonicalizeLanguageTag(result.languages[i]);
    if (!languages.includes(tag)) languages.push(tag);
  }
  result.languages = languages;
  result.sourceLanguage = canonicalizeLanguageTag(result.sourceLanguage);
  if (!languages.includes(result.sourceLanguage)) {
    throw new Error("The source language must be in the document languages.");
  }

  for (let i = 0; i < result.messages.length; i++) {
    delete (
      result.messages[i] as TranslationMessage & {
        reviewedSignature?: string;
      }
    ).reviewedSignature;
    const translations: Record<string, TranslationSegment[]> = {};
    for (const language in result.messages[i].translations) {
      if (
        !Object.prototype.hasOwnProperty.call(
          result.messages[i].translations,
          language,
        )
      ) {
        continue;
      }
      const canonical = canonicalizeLanguageTag(language);
      if (!languages.includes(canonical)) {
        throw new Error(
          `A saved translation uses unconfigured language ${language}.`,
        );
      }
      const segments = result.messages[i].translations[language];
      if (
        translations[canonical] &&
        JSON.stringify(translations[canonical]) !== JSON.stringify(segments)
      ) {
        throw new Error(
          `Conflicting translations use equivalent language tags for ${canonical}.`,
        );
      }
      translations[canonical] = segments;
    }
    result.messages[i].translations = translations;
  }
  return result;
}

export function findMessageBySignature(
  store: TextTranslationStore,
  signature: string,
): TranslationMessage | undefined {
  for (let i = 0; i < store.messages.length; i++) {
    if (store.messages[i].signature === signature) {
      return store.messages[i];
    }
  }
  return undefined;
}

export function allocateTranslationMessage(
  store: TextTranslationStore,
  signature: string,
  sourceText: string,
  styleKeys: string[],
): TranslationMessage {
  const existing = findMessageBySignature(store, signature);
  if (existing) return existing;

  const message: TranslationMessage = {
    id: `m${store.nextMessageId}`,
    signature,
    sourceText,
    styleKeys: styleKeys.slice(0),
    translations: {},
  };
  store.nextMessageId++;
  store.messages.push(message);
  return message;
}

export function resolveTranslationLanguage(
  requested: string,
  configured: string[],
  source: string,
): string {
  let canonicalRequested: string;
  try {
    canonicalRequested = Intl.getCanonicalLocales(requested)[0];
    if (!canonicalRequested) return source;
  } catch {
    return source;
  }
  const canonicalConfigured: string[] = [];
  for (let i = 0; i < configured.length; i++) {
    try {
      canonicalConfigured.push(Intl.getCanonicalLocales(configured[i])[0]);
    } catch {
      // Invalid document metadata must never match a request.
    }
  }
  if (canonicalConfigured.indexOf(canonicalRequested) !== -1) {
    return canonicalRequested;
  }
  const separator = canonicalRequested.indexOf("-");
  if (separator > 0) {
    const base = canonicalRequested.slice(0, separator);
    if (canonicalConfigured.indexOf(base) !== -1) return base;
  }
  return source;
}

export function translationLanguageResolverSource(
  functionName: string,
  sourceName: string,
  configuredName: string,
): string {
  return (
    "function " +
    functionName +
    "(requested) {\r" +
    "\tvar canonical;\r" +
    "\ttry {\r" +
    "\t\tvar locales = Intl.getCanonicalLocales(String(requested || " +
    sourceName +
    "));\r" +
    "\t\tif (!locales.length) return " +
    sourceName +
    ";\r" +
    "\t\tcanonical = locales[0];\r" +
    "\t} catch (e) {\r" +
    "\t\treturn " +
    sourceName +
    ";\r" +
    "\t}\r" +
    "\tif (" +
    configuredName +
    ".indexOf(canonical) >= 0) return canonical;\r" +
    "\tvar dash = canonical.indexOf('-');\r" +
    "\tif (dash > 0) {\r" +
    "\t\tvar base = canonical.slice(0, dash);\r" +
    "\t\tif (" +
    configuredName +
    ".indexOf(base) >= 0) return base;\r" +
    "\t}\r" +
    "\treturn " +
    sourceName +
    ";\r" +
    "}"
  );
}
