export const TEXT_TRANSLATIONS_SCHEMA_VERSION = 1;
export const TEXT_TRANSLATIONS_KEY = "text-translations";

export interface TranslationSegment {
  text: string;
  styleKey: string | null;
}

export interface TranslationMessage {
  id: string;
  signature: string;
  sourceText: string;
  reviewedSignature: string;
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
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  if (!Array.isArray(value)) return false;
  for (let i = 0; i < value.length; i++) {
    if (typeof value[i] !== "string") return false;
  }
  return true;
}

function isTranslationSegments(value: unknown): value is TranslationSegment[] {
  if (!Array.isArray(value)) return false;
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
    typeof value.reviewedSignature !== "string" ||
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
  if (
    typeof value.sourceLanguage !== "string" ||
    !isStringArray(value.languages) ||
    value.languages.length === 0 ||
    value.languages.indexOf(value.sourceLanguage) === -1 ||
    typeof value.nextMessageId !== "number" ||
    Math.floor(value.nextMessageId) !== value.nextMessageId ||
    value.nextMessageId < 1 ||
    !Array.isArray(value.messages)
  ) {
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
    reviewedSignature: signature,
    styleKeys: styleKeys.slice(0),
    translations: {},
  };
  store.nextMessageId++;
  store.messages.push(message);
  return message;
}

export function isTranslationMessageReviewed(
  message: TranslationMessage,
  signature: string,
): boolean {
  return message.reviewedSignature === signature;
}

export function resolveTranslationLanguage(
  requested: string,
  configured: string[],
  source: string,
): string {
  if (configured.indexOf(requested) !== -1) return requested;
  const separator = requested.indexOf("-");
  if (separator > 0) {
    const base = requested.slice(0, separator);
    if (configured.indexOf(base) !== -1) return base;
  }
  return source;
}
