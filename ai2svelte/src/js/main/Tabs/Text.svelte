<script lang="ts">
  import { onMount, tick } from "svelte";
  import { tooltip } from "svooltip";
  import Dialog from "../Components/Dialog.svelte";
  import Dropdown from "../Components/Dropdown.svelte";
  import { tooltipSettings } from "../utils/utils";
  import {
    TextHistory,
    createHistoryGrouper,
    historyShortcut,
    type TextSnapshot,
  } from "../utils/textHistory";
  import { csi, evalTS } from "../../lib/utils/bolt";
  import {
    escapeStyledText,
    parseStyledText,
    styleCloseTag,
    styleOpenTag,
    type StyledSegment,
  } from "../../../shared/styledText";
  import {
    allocateTranslationMessage,
    canonicalizeTextTranslationStore,
    cloneTextTranslationStore,
    createDefaultTextTranslationStore,
    findMessageBySignature,
    parseTextTranslationStore,
    type TextTranslationStore,
    type TranslationMessage,
  } from "../../../shared/textTranslations";
  import {
    canonicalizeLanguageTag,
    languageDisplayName,
  } from "../utils/languages";
  import {
    settingsObject,
    ai2svelteInProgress,
    updateInProgress,
  } from "../stores";
  import {
    textPreview,
    reconcileTextPreview,
    returnToOriginal,
    selectPreviewLanguage,
  } from "../utils/textPreview.svelte";

  interface TextFrameGroup {
    text: string;
    count: number;
    signature: string;
    styleKeys: string[];
    hasStableIdentity?: boolean;
    inconsistent?: boolean;
  }

  interface TextStyleInfo {
    id: number;
    key: string;
    font: string;
    size: number;
  }

  interface DocTextData {
    groups: TextFrameGroup[];
    styles: TextStyleInfo[];
    identity?: string;
  }

  interface TextReplacementResult {
    updated: number;
    failed: number;
    firstError: string;
    overflowed?: number;
  }

  interface HighlightedPart {
    text: string;
    hit: boolean;
  }

  interface HighlightedSegment {
    styleId: number | null;
    parts: HighlightedPart[];
  }

  let rows = $state<TextFrameGroup[]>([]);
  let searchText = $state("");
  let includeAllText = $state(false);
  let styles = $state<TextStyleInfo[]>([]);
  const SORT_DOCUMENT = "Document order";
  const SORT_COPIES = "Most copies";
  const SORT_ALPHABETICAL = "A–Z";
  const SORT_UNTRANSLATED = "Most untranslated";
  const sortOptions = [
    SORT_DOCUMENT,
    SORT_COPIES,
    SORT_ALPHABETICAL,
    SORT_UNTRANSLATED,
  ];
  const CUSTOM_LANGUAGE_TAG = "__custom__";
  const commonLanguages = [
    { tag: "ar", name: "Arabic" },
    { tag: "bn", name: "Bengali" },
    { tag: "zh-Hans", name: "Chinese (Simplified)" },
    { tag: "zh-Hant", name: "Chinese (Traditional)" },
    { tag: "cs", name: "Czech" },
    { tag: "da", name: "Danish" },
    { tag: "nl", name: "Dutch" },
    { tag: "en", name: "English" },
    { tag: "fi", name: "Finnish" },
    { tag: "fr", name: "French" },
    { tag: "de", name: "German" },
    { tag: "el", name: "Greek" },
    { tag: "he", name: "Hebrew" },
    { tag: "hi", name: "Hindi" },
    { tag: "hu", name: "Hungarian" },
    { tag: "id", name: "Indonesian" },
    { tag: "it", name: "Italian" },
    { tag: "ja", name: "Japanese" },
    { tag: "ko", name: "Korean" },
    { tag: "ms", name: "Malay" },
    { tag: "no", name: "Norwegian" },
    { tag: "fa", name: "Persian" },
    { tag: "pl", name: "Polish" },
    { tag: "pt-BR", name: "Portuguese (Brazil)" },
    { tag: "pt-PT", name: "Portuguese (Portugal)" },
    { tag: "ro", name: "Romanian" },
    { tag: "ru", name: "Russian" },
    { tag: "sr", name: "Serbian" },
    { tag: "es", name: "Spanish" },
    { tag: "sw", name: "Swahili" },
    { tag: "sv", name: "Swedish" },
    { tag: "th", name: "Thai" },
    { tag: "tr", name: "Turkish" },
    { tag: "uk", name: "Ukrainian" },
    { tag: "ur", name: "Urdu" },
    { tag: "vi", name: "Vietnamese" },
  ];
  let sortBy = $state(SORT_DOCUMENT);
  let loading = $state(false);
  let unmounted = false;
  let applying = $state(false);
  let errorMessage = $state("");
  let statusMessage = $state("");
  let selectedRow = $state<TextFrameGroup | null>(null);
  let replacementText = $state("");
  let dialogErrorMessage = $state("");
  let replacementDialog = $state<HTMLDialogElement>();
  let replacementInput = $state<HTMLTextAreaElement>();
  let translationInput = $state<HTMLTextAreaElement>();
  let languageDialog = $state<HTMLDialogElement>();
  let previewLanguageField = $state<HTMLDivElement>();
  let documentIdentity = $state("");
  let loadGeneration = 0;
  let translationStore = $state<TextTranslationStore>(
    createDefaultTextTranslationStore(),
  );
  let selectedPreviewLanguage = $derived(
    textPreview.active ? textPreview.language : translationStore.sourceLanguage,
  );
  let translationDataInvalid = $state(false);
  let stableIdentityAvailable = $state(true);
  let translationError = $state("");
  let translationStatus = $state("");
  let editingLanguage = $state("");
  let targetLanguage = $state("");
  let translationText = $state("");
  let drafts = $state<Record<string, string>>({});
  let dirtyLanguages = $state<Record<string, boolean>>({});
  let newLanguageTag = $state("");
  let customLanguageTag = $state("");
  let languageError = $state("");
  let pendingRemoval = $state("");
  let promptedSourceLanguage = $state("");
  let promptedNewSource = $state("");
  let promptedNewSourceError = $state("");
  let selectedOrphanId = $state("");
  let saveQueue: Promise<unknown> = Promise.resolve();
  let pendingSaves = $state(0);
  const saving = $derived(pendingSaves > 0);
  const previewLanguageLabels = $derived.by(() => {
    const labels: Record<string, string> = {};
    for (const language of translationStore.languages) {
      labels[language] =
        `${languageDisplayName(language)} (${language})` +
        (language === translationStore.sourceLanguage ? " · Source" : "");
    }
    return labels;
  });

  export function confirmLeave() {
    const dirty = Object.keys(dirtyLanguages).some(
      (key) => dirtyLanguages[key],
    );
    return !dirty || window.confirm("Discard unsaved translation drafts?");
  }

  async function changePreview(language: string) {
    const currentLanguage = textPreview.active
      ? textPreview.language
      : translationStore.sourceLanguage;
    if ($updateInProgress || $ai2svelteInProgress) {
      selectedPreviewLanguage = currentLanguage;
      return;
    }
    if (language === currentLanguage) return;
    if (language === translationStore.sourceLanguage) {
      if (!confirmLeave()) {
        selectedPreviewLanguage = currentLanguage;
        return;
      }
      await returnToOriginal();
    } else {
      await selectPreviewLanguage(documentIdentity, language);
    }
    selectedPreviewLanguage = textPreview.active
      ? textPreview.language
      : translationStore.sourceLanguage;
  }

  const searchableRows = $derived(
    rows.map((row) => ({
      row,
      text: normalizeSearchText(
        toSegments(row.text)
          .map((segment) => segment.text)
          .join(""),
      ),
    })),
  );
  const searchQuery = $derived(normalizeSearchText(searchText));
  const searchPattern = $derived(toSearchPattern(searchQuery));

  const filteredRows = $derived.by(() => {
    const entries = searchableRows.filter(
      (entry) => !searchQuery || entry.text.includes(searchQuery),
    );
    if (sortBy === SORT_COPIES) {
      entries.sort((a, b) => b.row.count - a.row.count);
    } else if (sortBy === SORT_ALPHABETICAL) {
      entries.sort((a, b) => a.text.localeCompare(b.text));
    } else if (sortBy === SORT_UNTRANSLATED) {
      entries.sort(
        (a, b) =>
          translationCompletionCount(messageForRow(a.row)) -
          translationCompletionCount(messageForRow(b.row)),
      );
    }
    return entries.map((entry) => entry.row);
  });

  const parsedReplacement = $derived(parseStyledText(replacementText));
  // Every style found in the document can be applied to any text.
  const rowStyles = $derived(styles);
  const targetLanguages = $derived(
    translationStore.languages.filter(
      (language) => language !== translationStore.sourceLanguage,
    ),
  );
  const isEditingSource = $derived(
    editingLanguage === translationStore.sourceLanguage,
  );
  function translationCompletionCount(message: TranslationMessage | undefined) {
    if (!message) return 0;
    return targetLanguages.filter(
      (language) => (message.translations[language]?.length || 0) > 0,
    ).length;
  }
  const currentSignatures = $derived(new Set(rows.map((row) => row.signature)));
  const orphanMessages = $derived(
    includeAllText
      ? translationStore.messages.filter(
          (message) => !currentSignatures.has(message.signature),
        )
      : [],
  );
  const replacementError = $derived.by(() => {
    if (parsedReplacement.error) return parsedReplacement.error;
    for (const segment of parsedReplacement.segments) {
      if (
        segment.styleId !== null &&
        !rowStyles.some((style) => style.id === segment.styleId)
      ) {
        return `Style ${segment.styleId} doesn't exist in this document.`;
      }
    }
    return "";
  });

  function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  function toSegments(text: string): StyledSegment[] {
    const parsed = parseStyledText(text);
    return parsed.error ? [{ text, styleId: null }] : parsed.segments;
  }

  function normalizeSearchText(text: string) {
    return text.trim().replace(/\s+/g, " ").toLowerCase();
  }

  // Mirrors normalizeSearchText: any run of whitespace matches a space.
  function toSearchPattern(query: string): RegExp | null {
    const words = query.split(" ").filter(Boolean);
    if (words.length === 0) return null;
    return new RegExp(
      words
        .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("\\s+"),
      "gi",
    );
  }

  function toHighlightedSegments(
    text: string,
    pattern: RegExp | null,
  ): HighlightedSegment[] {
    const segments = toSegments(text);
    const plain = segments.map((segment) => segment.text).join("");
    const hits: Array<[number, number]> = [];
    if (pattern) {
      for (const match of plain.matchAll(pattern)) {
        const start = match.index ?? 0;
        hits.push([start, start + match[0].length]);
      }
    }

    let offset = 0;
    return segments.map((segment) => {
      const start = offset;
      const end = start + segment.text.length;
      offset = end;
      const parts: HighlightedPart[] = [];
      let cursor = start;
      for (const [hitStart, hitEnd] of hits) {
        if (hitEnd <= cursor || hitStart >= end) continue;
        const from = Math.max(hitStart, cursor);
        const to = Math.min(hitEnd, end);
        if (from > cursor) {
          parts.push({ text: plain.slice(cursor, from), hit: false });
        }
        parts.push({ text: plain.slice(from, to), hit: true });
        cursor = to;
      }
      if (cursor < end)
        parts.push({ text: plain.slice(cursor, end), hit: false });
      return { styleId: segment.styleId, parts };
    });
  }

  // Opaque badge colors keep white numbers above 7:1 contrast.
  const stylePalette = [
    { hue: 262, background: "#5b21b6" },
    { hue: 226, background: "#1e40af" },
    { hue: 202, background: "#075985" },
    { hue: 198, background: "#155e75" },
    { hue: 175, background: "#115e59" },
    { hue: 163, background: "#065f46" },
    { hue: 86, background: "#3f6212" },
    { hue: 24, background: "#78350f" },
    { hue: 17, background: "#9a3412" },
    { hue: 0, background: "#991b1b" },
    { hue: 343, background: "#9f1239" },
    { hue: 295, background: "#86198f" },
  ];

  function styleColor(id: number) {
    return stylePalette[(id - 1) % stylePalette.length];
  }

  function styleTitle(id: number) {
    const style = styles.find((item) => item.id === id);
    if (!style) return `Style ${id}`;
    return `Style ${id}: ${styleSummary(style)}`;
  }

  function styleSummary(style: TextStyleInfo) {
    return `${style.font || "unknown font"}${style.size ? `, ${style.size}pt` : ""}`;
  }

  function canonicalStore(value: unknown): TextTranslationStore {
    const parsed = parseTextTranslationStore(value);
    return canonicalizeTextTranslationStore(parsed, canonicalizeLanguageTag);
  }

  async function loadTranslationStore(expectedGeneration: number) {
    const result = (await evalTS("fetchTextTranslationDocument")) as
      { identity: string; saved: boolean; data: unknown } | undefined;
    if (expectedGeneration !== loadGeneration) return false;
    if (!result) {
      documentIdentity = "";
      translationStore = createDefaultTextTranslationStore();
      translationDataInvalid = false;
      return true;
    }
    documentIdentity = result.identity || "";
    try {
      translationStore = canonicalStore(result.data);
    } catch (error) {
      translationDataInvalid = true;
      translationError = getErrorMessage(error);
      throw error;
    }
    translationDataInvalid = false;
    if (
      translationStore.languages.length > 1 &&
      !Object.prototype.hasOwnProperty.call(
        $settingsObject,
        "include_translations",
      )
    ) {
      $settingsObject = { ...$settingsObject, include_translations: true };
    }
    return true;
  }

  function reportTranslationSaveFailure(message: string) {
    translationError = message;
    console.error("[ai2svelte] text translations could not be saved:", message);
  }

  async function saveTranslationStore(candidate: TextTranslationStore) {
    if (translationDataInvalid || saving) {
      reportTranslationSaveFailure(
        translationDataInvalid
          ? "Translation data could not be validated and was not overwritten."
          : "Another language change is still being saved.",
      );
      return false;
    }
    const identity = documentIdentity;
    const generation = loadGeneration;
    const snapshot = cloneTextTranslationStore(candidate);
    translationError = "";
    if (!identity) {
      reportTranslationSaveFailure(
        "Save this Illustrator document before saving translations.",
      );
      return false;
    }

    const operation = saveQueue.then(() =>
      evalTS("saveTextTranslations", identity, snapshot),
    );
    saveQueue = operation.catch(() => undefined);
    pendingSaves++;
    try {
      const result = (await operation) as
        { ok: boolean; identity?: string; reason?: string } | undefined;
      if (generation !== loadGeneration || identity !== documentIdentity) {
        return false;
      }
      if (!result?.ok) {
        reportTranslationSaveFailure(
          result?.reason || "Could not save text translations to the document.",
        );
        return false;
      }
      translationStore = candidate;
      window.dispatchEvent(
        new CustomEvent("text-translations-updated", {
          detail: { languageCount: candidate.languages.length },
        }),
      );
      return true;
    } catch (error) {
      if (generation === loadGeneration && identity === documentIdentity) {
        reportTranslationSaveFailure(getErrorMessage(error));
      }
      return false;
    } finally {
      pendingSaves = Math.max(0, pendingSaves - 1);
    }
  }

  function messageForRow(row: TextFrameGroup): TranslationMessage | undefined {
    return findMessageBySignature(translationStore, row.signature);
  }

  function rowHasTranslations(row: TextFrameGroup) {
    const message = messageForRow(row);
    return (
      !!message &&
      targetLanguages.some(
        (language) => (message.translations[language]?.length || 0) > 0,
      )
    );
  }

  function currentStyleKey(id: number): string | undefined {
    return styles.find((style) => style.id === id)?.key;
  }

  function sourceTextForMessage(row: TextFrameGroup) {
    return row.text;
  }

  function translationToEditor(
    segments: TranslationMessage["translations"][string],
  ) {
    return segments
      .map((segment) => {
        if (segment.styleKey === null) return escapeStyledText(segment.text);
        const style = styles.find((item) => item.key === segment.styleKey);
        if (!style) {
          throw new Error(
            "A saved translation uses a style that is no longer available. Remove or replace the style mark before editing.",
          );
        }
        return `${styleOpenTag(style.id)}${escapeStyledText(segment.text)}${styleCloseTag(style.id)}`;
      })
      .join("");
  }

  function editorToTranslation(text: string) {
    const parsed = parseStyledText(text);
    if (parsed.error) throw new Error(parsed.error);
    return parsed.segments.map((segment) => {
      if (segment.styleId === null) {
        return { text: segment.text, styleKey: null };
      }
      const styleKey = currentStyleKey(segment.styleId);
      if (!styleKey) {
        throw new Error(
          `Style ${segment.styleId} is not available in this document.`,
        );
      }
      return { text: segment.text, styleKey };
    });
  }

  function hasUnsupportedTranslationStyles(
    message: TranslationMessage,
    availableStyleKeys: string[],
  ) {
    for (const language in message.translations) {
      if (!Object.prototype.hasOwnProperty.call(message.translations, language))
        continue;
      const segments = message.translations[language];
      for (let i = 0; i < segments.length; i++) {
        const styleKey = segments[i].styleKey;
        if (
          typeof styleKey === "string" &&
          !availableStyleKeys.includes(styleKey)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  function registerAvailableTranslationStyles(
    message: TranslationMessage,
    row: TextFrameGroup,
  ) {
    message.styleKeys = Array.from(
      new Set([
        ...message.styleKeys,
        ...row.styleKeys,
        ...styles.map((style) => style.key),
      ]),
    );
  }

  async function refreshText(clearFeedback = true): Promise<boolean> {
    if (textPreview.busy || textPreview.blocked) return false;
    if (clearFeedback) {
      errorMessage = "";
      statusMessage = "";
    }

    if (!window.cep) {
      rows = [];
      styles = [];
      errorMessage = "Text editing is available in Illustrator only.";
      return false;
    }

    loading = true;
    const generation = ++loadGeneration;
    rows = [];
    styles = [];
    documentIdentity = "";
    translationDataInvalid = true;
    translationStore = createDefaultTextTranslationStore();
    translationError = "";
    translationStatus = "";
    // A single rAF still runs before paint; leave a frame for the loading message.
    await tick();
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
    if (unmounted) {
      loading = false;
      return false;
    }
    try {
      const data = (await (includeAllText
        ? evalTS("fetchDocSelectors", true, true)
        : evalTS("fetchDocSelectors", true))) as DocTextData | undefined;
      if (unmounted || generation !== loadGeneration) return false;
      if (!data || !Array.isArray(data.groups)) {
        throw new Error("No active Illustrator document is available.");
      }
      stableIdentityAvailable = data.groups.every(
        (group) =>
          typeof group.signature === "string" && Array.isArray(group.styleKeys),
      );
      if (!(await loadTranslationStore(generation))) return false;
      const currentIdentity = (await evalTS("getActiveDocumentIdentity")) as
        string | undefined;
      if (generation !== loadGeneration) return false;
      if (
        !textPreview.active &&
        typeof currentIdentity === "string" &&
        (currentIdentity !== documentIdentity ||
          (typeof data.identity === "string" &&
            data.identity !== currentIdentity))
      ) {
        throw new Error("The active document changed. Refresh and try again.");
      }
      rows = data.groups
        .filter((group) => includeAllText || group.count > 1)
        .map((group, index) => ({
          ...group,
          signature: group.signature || `legacy-scan-${index}-${group.text}`,
          styleKeys: group.styleKeys || [],
          hasStableIdentity:
            typeof group.signature === "string" &&
            Array.isArray(group.styleKeys),
        }));
      styles = Array.isArray(data.styles) ? data.styles : [];
      return true;
    } catch (error) {
      console.error("[ai2svelte] fetchDocSelectors failed:", error);
      if (!unmounted) {
        errorMessage = `Could not load Illustrator text: ${getErrorMessage(error)}`;
      }
      return false;
    } finally {
      if (!unmounted && generation === loadGeneration) loading = false;
    }
  }

  const inconsistentTitle = "Copies differ slightly";
  const inconsistencyNote = (count: number) =>
    `Some copies differ slightly in capitalization, line breaks, spacing, quotes, dashes or ellipses. Applying makes all ${count} copies match the replacement text.`;

  // Re-applying the same text still unifies inconsistent copies.
  function canApply(row: TextFrameGroup) {
    return replacementText !== row.text || !!row.inconsistent;
  }

  function openReplacement(row: TextFrameGroup) {
    if (applying || loading) return;
    selectedRow = row;
    editingLanguage = textPreview.active
      ? textPreview.language
      : translationStore.sourceLanguage;
    revealCount = 0;
    replacementText = row.text;
    historyGroup = createHistoryGrouper();
    replacementHistory.reset({
      value: row.text,
      selectionStart: row.text.length,
      selectionEnd: row.text.length,
    });
    drafts = {};
    dirtyLanguages = {};
    dialogErrorMessage = "";
    targetLanguage = textPreview.active
      ? textPreview.language
      : targetLanguages[0] || "";
    translationText = targetLanguage
      ? loadTranslationDraft(targetLanguage)
      : "";
    selectedOrphanId = "";
    replacementDialog?.showModal();
  }

  async function addLanguage() {
    if (textPreview.active || textPreview.busy) return;
    languageError = "";
    if (translationDataInvalid || saving) return;
    let tag: string;
    try {
      tag = canonicalizeLanguageTag(
        newLanguageTag === CUSTOM_LANGUAGE_TAG
          ? customLanguageTag
          : newLanguageTag,
      );
    } catch (error) {
      languageError = getErrorMessage(error);
      return;
    }
    if (
      translationStore.languages.some(
        (language) => language.toLowerCase() === tag.toLowerCase(),
      )
    ) {
      languageError = `${tag} is already in this document.`;
      return;
    }
    const next = cloneTextTranslationStore(translationStore);
    next.languages.push(tag);
    if (targetLanguages.length === 0) targetLanguage = tag;
    if (
      !Object.prototype.hasOwnProperty.call(
        $settingsObject,
        "include_translations",
      )
    ) {
      $settingsObject = { ...$settingsObject, include_translations: true };
    }
    const saved = await saveTranslationStore(next);
    if (saved) {
      newLanguageTag = "";
      customLanguageTag = "";
      translationStatus = `${languageDisplayName(tag)} added.`;
    } else {
      languageError = translationError;
    }
  }

  async function changeSourceLanguage(tag: string) {
    if (textPreview.active || textPreview.busy) return;
    if (translationDataInvalid || saving) return;
    if (tag === translationStore.sourceLanguage) return;
    if (
      !window.confirm(
        `Declare ${tag} as the language the document is written in? Illustrator text will not be changed.`,
      )
    ) {
      return;
    }
    const next = cloneTextTranslationStore(translationStore);
    next.sourceLanguage = tag;
    if (!(await saveTranslationStore(next))) languageError = translationError;
  }

  function beginRemoveLanguage(tag: string) {
    if (translationDataInvalid || saving) return;
    if (tag !== translationStore.sourceLanguage) {
      if (
        !window.confirm(
          `Remove ${tag}? All saved ${tag} translations will be permanently deleted from this document. Illustrator text will not be changed.`,
        )
      ) {
        return;
      }
      void removeLanguage(tag);
      return;
    }
    languageError = "";
    pendingRemoval = tag;
    promptedSourceLanguage =
      translationStore.languages.find((language) => language !== tag) || "";
    promptedNewSource = "";
    promptedNewSourceError = "";
    if (!languageDialog?.open) languageDialog?.showModal();
  }

  function deleteLanguageData(store: TextTranslationStore, tag: string) {
    store.languages = store.languages.filter((language) => language !== tag);
    for (let i = 0; i < store.messages.length; i++) {
      delete store.messages[i].translations[tag];
    }
  }

  function clearLanguageEditorState(tag: string) {
    delete drafts[tag];
    delete dirtyLanguages[tag];
    if (editingLanguage === tag) {
      editingLanguage = translationStore.sourceLanguage;
    }
    if (targetLanguage === tag || !targetLanguages.includes(targetLanguage)) {
      targetLanguage = targetLanguages[0] || "";
      translationText = targetLanguage
        ? loadTranslationDraft(targetLanguage)
        : "";
    }
  }

  async function removeLanguage(tag: string, nextSource?: string) {
    if (textPreview.active || textPreview.busy) return;
    if (saving || translationDataInvalid) return;
    const next = cloneTextTranslationStore(translationStore);
    deleteLanguageData(next, tag);
    if (nextSource) next.sourceLanguage = nextSource;
    if (next.languages.length === 0) return;
    if (!(await saveTranslationStore(next))) {
      languageError = translationError;
      return;
    }
    clearLanguageEditorState(tag);
    translationStatus = "";
  }

  async function useNewSourceLanguage() {
    if (saving) return;
    try {
      const tag = canonicalizeLanguageTag(promptedNewSource);
      if (
        translationStore.languages.some(
          (language) => language.toLowerCase() === tag.toLowerCase(),
        )
      ) {
        throw new Error(`${tag} is already in this document.`);
      }
      const next = cloneTextTranslationStore(translationStore);
      next.languages.push(tag);
      promptedSourceLanguage = tag;
      promptedNewSource = "";
      promptedNewSourceError = "";
    } catch (error) {
      promptedNewSourceError = getErrorMessage(error);
    }
  }

  async function confirmSourceRemoval() {
    if (saving || !pendingRemoval || !promptedSourceLanguage) return;
    const nextSource = promptedSourceLanguage;
    const next = cloneTextTranslationStore(translationStore);
    if (next.languages.indexOf(nextSource) < 0) next.languages.push(nextSource);
    deleteLanguageData(next, pendingRemoval);
    next.sourceLanguage = nextSource;
    if (!(await saveTranslationStore(next))) {
      languageError = translationError;
      return;
    }
    const removed = pendingRemoval;
    languageDialog?.close();
    pendingRemoval = "";
    clearLanguageEditorState(removed);
    clearLanguageEditorState(nextSource);
    translationStatus = "";
  }

  function loadTranslationDraft(language: string) {
    const row = selectedRow;
    if (!row) return "";
    if (Object.prototype.hasOwnProperty.call(drafts, language)) {
      return drafts[language];
    }
    const segments = messageForRow(row)?.translations[language];
    if (!segments) return "";
    try {
      return translationToEditor(segments);
    } catch (error) {
      dialogErrorMessage = getErrorMessage(error);
      return "";
    }
  }

  function switchEditingLanguage(event: Event) {
    const language = (event.currentTarget as HTMLSelectElement).value;
    if (!language || language === editingLanguage) return;
    if (
      language !== translationStore.sourceLanguage &&
      !stableIdentityAvailable
    ) {
      (event.currentTarget as HTMLSelectElement).value = editingLanguage;
      dialogErrorMessage =
        "Translation identity is unavailable for this scan. Refresh with the current extension build.";
      return;
    }
    if (targetLanguage && targetLanguages.includes(targetLanguage)) {
      drafts[targetLanguage] = translationText;
    }
    editingLanguage = language;
    dialogErrorMessage = "";
    if (language === translationStore.sourceLanguage) return;
    targetLanguage = language;
    translationText = loadTranslationDraft(language);
  }

  async function saveTranslations() {
    const row = selectedRow;
    if (
      !row ||
      isEditingSource ||
      !targetLanguage ||
      applying ||
      saving ||
      translationDataInvalid
    )
      return;
    dialogErrorMessage = "";
    drafts[targetLanguage] = translationText;
    dirtyLanguages[targetLanguage] = true;
    const next = cloneTextTranslationStore(translationStore);
    let message = findMessageBySignature(next, row.signature);
    const changed = Object.keys(dirtyLanguages).filter(
      (language) => dirtyLanguages[language],
    );
    if (!changed.length) return;
    if (
      replacementText !== row.text &&
      !window.confirm(
        "Saving this translation will discard the unsaved source text change. Continue?",
      )
    ) {
      return;
    }
    try {
      for (let i = 0; i < changed.length; i++) {
        try {
          editorToTranslation(drafts[changed[i]] || "");
        } catch (error) {
          targetLanguage = changed[i];
          editingLanguage = changed[i];
          translationText = drafts[changed[i]] || "";
          dialogErrorMessage = getErrorMessage(error);
          await tick();
          translationInput?.focus();
          return;
        }
      }
      if (!message) {
        message = allocateTranslationMessage(
          next,
          row.signature,
          sourceTextForMessage(row),
          row.styleKeys,
        );
      }
      message.sourceText = sourceTextForMessage(row);
      registerAvailableTranslationStyles(message, row);
      for (let i = 0; i < changed.length; i++) {
        const language = changed[i];
        const text = drafts[language] || "";
        if (text.trim() === "") {
          delete message.translations[language];
        } else {
          message.translations[language] = editorToTranslation(text);
        }
      }
      const saved = await saveTranslationStore(next);
      if (saved) {
        dirtyLanguages = {};
        drafts = {};
        translationStatus = textPreview.active
          ? "Translations saved to the original document."
          : "Translations saved to this document.";
        replacementDialog?.close();
        if (textPreview.active) {
          const refreshed = await selectPreviewLanguage(
            documentIdentity,
            textPreview.language,
          );
          if (!refreshed) {
            translationStatus =
              "Translations saved to the original; preview refresh failed.";
          }
        }
      } else {
        dialogErrorMessage = translationError;
      }
    } catch (error) {
      dialogErrorMessage = getErrorMessage(error);
    }
  }

  function handleEditClose() {
    const hasDrafts = Object.keys(dirtyLanguages).some(
      (language) => dirtyLanguages[language],
    );
    if (hasDrafts && !window.confirm("Discard unsaved translation drafts?")) {
      void tick().then(() => replacementDialog?.showModal());
      return;
    }
    selectedRow = null;
    dialogErrorMessage = "";
    drafts = {};
    dirtyLanguages = {};
    editingLanguage = translationStore.sourceLanguage;
  }

  async function reassignOrphan() {
    if (textPreview.active || textPreview.busy) return;
    const row = selectedRow;
    const orphan = translationStore.messages.find(
      (message) => message.id === selectedOrphanId,
    );
    if (!row || !orphan) return;
    const next = cloneTextTranslationStore(translationStore);
    if (
      hasUnsupportedTranslationStyles(
        orphan,
        rowStyles.map((style) => style.key),
      )
    ) {
      dialogErrorMessage =
        "The unmatched translation uses styles no longer available in this document. Clear those style marks first.";
      return;
    }
    let message = findMessageBySignature(next, row.signature);
    if (message) {
      for (const language in orphan.translations) {
        if (
          !Object.prototype.hasOwnProperty.call(orphan.translations, language)
        )
          continue;
        const incoming = orphan.translations[language];
        const existing = message.translations[language];
        if (
          existing?.length &&
          incoming?.length &&
          JSON.stringify(existing) !== JSON.stringify(incoming)
        ) {
          dialogErrorMessage = `The current source already has a different ${language} translation. Remove or resolve that translation before reassigning.`;
          return;
        }
      }
    } else {
      message = allocateTranslationMessage(
        next,
        row.signature,
        row.text,
        row.styleKeys,
      );
    }
    for (const language in orphan.translations) {
      if (!Object.prototype.hasOwnProperty.call(orphan.translations, language))
        continue;
      if (!message.translations[language]?.length) {
        message.translations[language] = JSON.parse(
          JSON.stringify(orphan.translations[language]),
        );
      }
    }
    message.sourceText = row.text;
    registerAvailableTranslationStyles(message, row);
    if (await saveTranslationStore(next)) {
      selectedOrphanId = "";
      dialogErrorMessage = "";
    }
  }

  const replacementHistory = new TextHistory();
  let historyGroup = createHistoryGrouper();
  const isMac = navigator.platform.startsWith("Mac");

  function recordReplacement(group: string | null = null) {
    const input = replacementInput;
    if (!input) return;
    replacementHistory.record(
      {
        value: input.value,
        selectionStart: input.selectionStart ?? input.value.length,
        selectionEnd: input.selectionEnd ?? input.value.length,
      },
      group,
    );
  }

  async function restoreReplacement(snapshot: TextSnapshot | null) {
    const input = replacementInput;
    if (!snapshot || !input) return;
    replacementText = snapshot.value;
    await tick();
    input.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
  }

  function stepReplacementHistory(action: "undo" | "redo") {
    restoreReplacement(
      action === "undo" ? replacementHistory.undo() : replacementHistory.redo(),
    );
  }

  // Our history replaces the native one, and keeps the shortcut away from
  // Illustrator so it can't undo a document change.
  function handleReplacementKeydown(event: KeyboardEvent) {
    const action = historyShortcut(event, isMac);
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    stepReplacementHistory(action);
  }

  function handleReplacementBeforeInput(event: InputEvent) {
    if (
      event.inputType === "historyUndo" ||
      event.inputType === "historyRedo"
    ) {
      event.preventDefault();
      stepReplacementHistory(
        event.inputType === "historyUndo" ? "undo" : "redo",
      );
    }
  }

  let revealCount = 0;

  async function revealInDocument() {
    if (textPreview.active || textPreview.busy) return;
    const row = selectedRow;
    if (!row || !window.cep) return;
    try {
      if (row.hasStableIdentity && includeAllText) {
        await evalTS(
          "revealDocText",
          row.text,
          revealCount++,
          true,
          documentIdentity,
          row.signature,
          styles.map(({ id, key }) => ({ id, key })),
        );
      } else if (row.hasStableIdentity) {
        await evalTS(
          "revealDocText",
          row.text,
          revealCount++,
          false,
          documentIdentity,
          row.signature,
          styles.map(({ id, key }) => ({ id, key })),
        );
      } else if (includeAllText) {
        await evalTS("revealDocText", row.text, revealCount++, true);
      } else {
        await evalTS("revealDocText", row.text, revealCount++);
      }
    } catch (error) {
      console.error("[ai2svelte] revealDocText failed:", error);
    }
  }

  function closeReplacement() {
    replacementDialog?.close();
  }

  async function wrapSelection(id: number) {
    const input = replacementInput;
    if (!input) return;
    const start = input.selectionStart ?? replacementText.length;
    const end = input.selectionEnd ?? start;
    const open = styleOpenTag(id);
    replacementText =
      replacementText.slice(0, start) +
      open +
      replacementText.slice(start, end) +
      styleCloseTag(id) +
      replacementText.slice(end);
    await tick();
    input.focus();
    input.setSelectionRange(start + open.length, end + open.length);
    recordReplacement();
  }

  async function wrapTranslationSelection(id: number) {
    const input = translationInput;
    if (!input) return;
    const start = input.selectionStart ?? translationText.length;
    const end = input.selectionEnd ?? start;
    const open = styleOpenTag(id);
    translationText =
      translationText.slice(0, start) +
      open +
      translationText.slice(start, end) +
      styleCloseTag(id) +
      translationText.slice(end);
    if (targetLanguage) {
      drafts[targetLanguage] = translationText;
      dirtyLanguages[targetLanguage] = true;
    }
    await tick();
    input.focus();
    input.setSelectionRange(start + open.length, end + open.length);
  }

  async function applyReplacement() {
    if (textPreview.active || textPreview.busy) return;
    const row = selectedRow;
    if (
      !row ||
      !isEditingSource ||
      applying ||
      loading ||
      replacementError ||
      !canApply(row)
    ) {
      return;
    }
    const hasTranslations = rowHasTranslations(row);
    if (
      Object.keys(dirtyLanguages).some(
        (language) => dirtyLanguages[language],
      ) &&
      !window.confirm(
        "Applying source text will discard unsaved translation drafts. Continue?",
      )
    ) {
      return;
    }

    applying = true;
    dialogErrorMessage = "";
    try {
      const hasSnapshot = row.hasStableIdentity === true;
      const result = (await (includeAllText
        ? hasSnapshot
          ? evalTS(
              "replaceDocText",
              row.text,
              replacementText,
              true,
              documentIdentity,
              row.signature,
              styles.map(({ id, key }) => ({ id, key })),
            )
          : evalTS("replaceDocText", row.text, replacementText, true)
        : hasSnapshot
          ? evalTS(
              "replaceDocText",
              row.text,
              replacementText,
              false,
              documentIdentity,
              row.signature,
              styles.map(({ id, key }) => ({ id, key })),
            )
          : evalTS("replaceDocText", row.text, replacementText))) as
        TextReplacementResult | undefined;
      if (
        !result ||
        typeof result.updated !== "number" ||
        typeof result.failed !== "number"
      ) {
        throw new Error("Illustrator returned an invalid replacement result.");
      }

      drafts = {};
      dirtyLanguages = {};
      replacementDialog?.close();
      if (!(await refreshText(false))) return;

      if (result.failed > 0) {
        errorMessage = `Updated ${result.updated} text frame(s); ${result.failed} could not be changed.${result.firstError ? ` ${result.firstError}` : ""}`;
      } else if (result.updated === 0) {
        statusMessage = "No matching text frames remained to update.";
      } else {
        statusMessage = `Updated ${result.updated} text frame(s).`;
      }
      if (result.updated > 0 && hasTranslations) {
        const warning = "Saved translations may need updating.";
        if (errorMessage) errorMessage += ` ${warning}`;
        else statusMessage += ` ${warning}`;
      }
      const overflowed = result.overflowed ?? 0;
      if (overflowed > 0) {
        const warning = `${overflowed} ${overflowed === 1 ? "frame no longer fits its" : "frames no longer fit their"} text box. ${overflowed === 1 ? "It is" : "They are"} selected in Illustrator.`;
        // Shown as an alert, so carry the success message along with it.
        errorMessage = `${errorMessage || statusMessage} ${warning}`.trim();
        statusMessage = "";
      }
    } catch (error) {
      console.error("[ai2svelte] replaceDocText failed:", error);
      dialogErrorMessage = `Could not update Illustrator text: ${getErrorMessage(error)}`;
    } finally {
      applying = false;
    }
  }

  onMount(() => {
    if (!window.cep) {
      errorMessage = "Text editing is available in Illustrator only.";
      return;
    }

    const handleDocumentChange = async () => {
      const generation = loadGeneration;
      if (
        textPreview.busy ||
        ((textPreview.active || textPreview.blocked) &&
          (await reconcileTextPreview()))
      )
        return;
      try {
        const identity = await evalTS("getActiveDocumentIdentity");
        if (unmounted || generation !== loadGeneration || textPreview.busy)
          return;
        if (
          identity &&
          identity === documentIdentity &&
          !translationDataInvalid
        )
          return;
      } catch (error) {
        console.error("[ai2svelte] document identity check failed:", error);
        errorMessage = `Could not check the active document: ${getErrorMessage(error)}`;
        return;
      }
      loadGeneration++;
      drafts = {};
      dirtyLanguages = {};
      if (replacementDialog?.open) {
        replacementDialog.close();
      }
      void refreshText();
    };

    csi.addEventListener("documentAfterActivate", handleDocumentChange);
    void refreshText();

    return () => {
      unmounted = true;
      loadGeneration++;
      csi.removeEventListener("documentAfterActivate", handleDocumentChange);
    };
  });
</script>

{#snippet warningIcon()}
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M12 3 2 20h20L12 3Z" />
    <path d="M12 10v4M12 17v.01" />
  </svg>
{/snippet}

{#snippet highlightedText(parts: HighlightedPart[])}
  {#each parts as part, index (index)}{#if part.hit}<mark>{part.text}</mark
      >{:else}{part.text}{/if}{/each}
{/snippet}

{#snippet styledText(
  text: string,
  reveal: boolean = false,
  highlight: boolean = false,
)}
  {#each toHighlightedSegments(text, highlight ? searchPattern : null) as segment, index (index)}
    {#if segment.styleId === null}{@render highlightedText(
        segment.parts,
      )}{:else if reveal}<span
        class="styled clickable"
        style:--style-hue={styleColor(segment.styleId).hue}
        style:--style-color={styleColor(segment.styleId).background}
        title={`${styleTitle(segment.styleId)} (click to show in Illustrator)`}
        role="button"
        tabindex="0"
        onclick={() => revealInDocument()}
        onkeydown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            revealInDocument();
          }
        }}
        ><span class="style-tag" aria-hidden="true">{segment.styleId}</span
        >{@render highlightedText(segment.parts)}</span
      >{:else}<span
        class="styled"
        style:--style-hue={styleColor(segment.styleId).hue}
        style:--style-color={styleColor(segment.styleId).background}
        title={styleTitle(segment.styleId)}
        ><span class="style-tag" aria-hidden="true">{segment.styleId}</span
        >{@render highlightedText(segment.parts)}</span
      >{/if}
  {/each}
{/snippet}

<section class="text-tab">
  {#if loading}
    <p class="feedback loading" role="status">Scanning Illustrator text…</p>
  {:else}
    <div class="toolbar">
      <p>Update matching text across multiple artboards together.</p>
      <button
        class="refresh-button"
        type="button"
        onclick={() =>
          textPreview.active
            ? selectPreviewLanguage(documentIdentity, textPreview.language)
            : refreshText()}
        disabled={loading ||
          applying ||
          saving ||
          textPreview.busy ||
          textPreview.blocked ||
          !window.cep}
      >
        Refresh
      </button>
    </div>

    <div class="preview-language-control" bind:this={previewLanguageField}>
      <div class="preview-language-header">
        <span class="preview-language-label">Preview language</span>
      </div>
      <div class="preview-language-picker">
        <Dropdown
          id="preview-language"
          ariaLabel="Preview language"
          menuAnchor={previewLanguageField}
          options={translationStore.languages}
          optionLabels={previewLanguageLabels}
          badge={translationStore.languages.length}
          actionLabel="Manage languages"
          actionDisabled={translationDataInvalid ||
            loading ||
            applying ||
            saving ||
            textPreview.active ||
            textPreview.busy ||
            textPreview.blocked}
          onAction={() => {
            pendingRemoval = "";
            languageDialog?.showModal();
          }}
          bind:value={selectedPreviewLanguage}
          disabled={loading ||
            applying ||
            saving ||
            textPreview.busy ||
            textPreview.blocked ||
            $updateInProgress ||
            $ai2svelteInProgress ||
            !documentIdentity}
          onValueChange={changePreview}
        />
      </div>
    </div>
    {#if textPreview.active}
      <div class="preview-warning" role="status">
        <span class="preview-warning-icon">{@render warningIcon()}</span>
        <p class="preview-explanation">
          Temporary preview: switching languages, saving translations, or
          leaving Text discards canvas edits. Missing translations show source
          text in red with a white outline. Export fonts remain from the
          original document; set a language-specific font in export CSS, e.g.
          <code
            >.ai2svelte[lang="hi"], .ai2svelte [lang="hi"] &#123; font-family: …
            &#125;</code
          >.
        </p>
        <p class="preview-counts">
          {textPreview.translated} translated · {textPreview.untranslated}
          untranslated · {textPreview.overflowed} overflowing
        </p>
      </div>
      <button
        type="button"
        disabled={textPreview.busy || saving}
        onclick={async () => {
          if (confirmLeave()) await returnToOriginal();
        }}>Return to original</button
      >
    {/if}
    {#if textPreview.error}
      <p class="feedback error" role="alert">{textPreview.error}</p>
    {/if}
    {#if translationError}
      <p class="feedback error" role="alert">{translationError}</p>
    {:else if translationStatus}
      <p class="feedback" role="status">{translationStatus}</p>
    {/if}
    {#if languageError}
      <p class="feedback error" role="alert">{languageError}</p>
    {/if}
    {#if !documentIdentity}
      <p class="feedback">Save the document before saving language changes.</p>
    {/if}
    {#if orphanMessages.length > 0}
      <p class="feedback warning" role="status">
        {orphanMessages.length} saved translation group(s) no longer match current
        text. Reassign them to matching text, or leave them unused.
      </p>
    {/if}

    <div class="toolbar">
      <div class="search-field">
        <svg
          class="search-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
        <input
          class="search-input"
          type="search"
          name="text-search"
          aria-label="Search text"
          placeholder="Search text…"
          autocomplete="off"
          bind:value={searchText}
          disabled={!window.cep || saving}
        />
      </div>

      {#if rows.length > 0}
        <div class="sort-control">
          <span class="control-label">Sort</span>
          <Dropdown
            id="text-sort"
            ariaLabel="Sort text"
            options={sortOptions}
            bind:value={sortBy}
          />
        </div>
      {/if}
    </div>

    <hr class="section-divider" />

    {#if rows.length === 0 && !errorMessage}
      <p class="feedback">
        {includeAllText
          ? "No text found in this document."
          : "No matching text found across multiple artboards."}
      </p>
    {:else if filteredRows.length === 0 && !errorMessage}
      <p class="feedback" role="status">No text matches your search.</p>
    {/if}

    {#if errorMessage}
      <p class="feedback error" role="alert">{errorMessage}</p>
    {:else if statusMessage}
      <p class="feedback" role="status">{statusMessage}</p>
    {/if}

    <div class="text-results">
      {#if filteredRows.length > 0}
        <ul
          class="text-list"
          aria-label={includeAllText ? "All text" : "Repeated text"}
        >
          {#each filteredRows as row, index (row.signature)}
            {@const message = messageForRow(row)}
            <li>
              <button
                class="text-card"
                type="button"
                aria-label={`Edit text: ${row.text}`}
                aria-describedby={`text-matches-${index}`}
                onclick={() => openReplacement(row)}
                disabled={applying || loading || saving}
              >
                <span
                  class="count-badge"
                  aria-hidden="true"
                  title={`${row.count} matches`}>{row.count}</span
                >
                {#if row.inconsistent}
                  <span
                    class="inconsistent-icon"
                    aria-hidden="true"
                    use:tooltip={{
                      ...tooltipSettings,
                      content: inconsistencyNote(row.count),
                      placement: "bottom-end",
                      delay: 0,
                    }}>{@render warningIcon()}</span
                  >
                {/if}
                <span id={`text-matches-${index}`} hidden
                  >{row.count} matches{row.inconsistent
                    ? `. ${inconsistentTitle}`
                    : ""}</span
                >
                <span class="card-text"
                  >{@render styledText(row.text, false, true)}</span
                >
                {#if targetLanguages.length > 0}
                  <span class="translation-status">
                    {translationCompletionCount(message)} of {targetLanguages.length}
                    translations
                  </span>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
      <button
        class="refresh-button all-text-button"
        type="button"
        onclick={() => {
          includeAllText = !includeAllText;
          refreshText();
        }}
        disabled={loading ||
          applying ||
          saving ||
          textPreview.busy ||
          textPreview.blocked ||
          !window.cep}
      >
        {includeAllText ? "Show repeated text only" : "Show all text"}
      </button>
    </div>
  {/if}
</section>

<Dialog
  title="Edit text"
  titleId="replacement-title"
  bind:element={replacementDialog}
  busy={applying || saving}
  onclose={handleEditClose}
>
  {#if selectedRow}
    <div class="edit-content">
      <div class="editor-group">
        <div class="label-row original-label">
          <p class="dialog-label">Original text</p>
          {#if isEditingSource && selectedRow.inconsistent}
            <button
              class="label-icon inconsistency-help"
              type="button"
              aria-label="{inconsistentTitle}. {inconsistencyNote(
                selectedRow.count,
              )}"
              use:tooltip={{
                ...tooltipSettings,
                content: inconsistencyNote(selectedRow.count),
                target: 'dialog[aria-labelledby="replacement-title"]',
                placement: "bottom-end",
                delay: 0,
              }}
            >
              {@render warningIcon()}
            </button>
          {/if}
        </div>
        <p class="original-text">
          {@render styledText(selectedRow.text, isEditingSource)}
        </p>
      </div>
      <div class="editor-group">
        <label class="dialog-label" for="edit-language">Language</label>
        <div class="language-select">
          <select
            class="translation-select language-picker"
            id="edit-language"
            value={editingLanguage}
            onchange={switchEditingLanguage}
            disabled={applying || saving}
          >
            {#each translationStore.languages as language (language)}
              <option
                value={language}
                disabled={textPreview.active &&
                  language === translationStore.sourceLanguage}
              >
                {languageDisplayName(language)} ({language}){language ===
                translationStore.sourceLanguage
                  ? " — Source"
                  : " — Translation"}
              </option>
            {/each}
          </select>
        </div>
      </div>
      <div class="editor-group">
        <div class="label-row editor-label">
          <label class="dialog-label" for="edit-text">New text</label>
          {#if rowStyles.length > 0}
            <button
              class="label-icon style-help"
              type="button"
              aria-label="How to use styles"
              use:tooltip={{
                ...tooltipSettings,
                content: `Numbered marks preserve the highlighted styles. Keep ${styleOpenTag(rowStyles[0].id)}…${styleCloseTag(rowStyles[0].id)} around text to preserve its style. Remove the marks to use the normal style, or select text and choose a style below. To type a literal tag such as \\<1>, put a backslash before the <.`,
                target: 'dialog[aria-labelledby="replacement-title"]',
                placement: "bottom-end",
                delay: 0,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v6M12 7v2" />
              </svg>
            </button>
          {/if}
        </div>
        {#if isEditingSource}
          <textarea
            id="edit-text"
            aria-label="New text"
            bind:this={replacementInput}
            bind:value={replacementText}
            onkeydown={handleReplacementKeydown}
            onbeforeinput={handleReplacementBeforeInput}
            oninput={(event) =>
              recordReplacement(
                event instanceof InputEvent
                  ? historyGroup(event.inputType, event.data)
                  : null,
              )}
            rows="4"
            disabled={applying || saving}></textarea>
          {#if replacementText !== selectedRow.text && rowHasTranslations(selectedRow)}
            <div class="source-change-warning" role="status">
              Saved translations may need updating.
            </div>
          {/if}
          {#if rowStyles.length > 0}
            <div class="style-chips" role="group" aria-label="Apply style">
              {#each rowStyles as style (style.id)}
                <button
                  class="style-chip"
                  type="button"
                  style:--style-hue={styleColor(style.id).hue}
                  style:--style-color={styleColor(style.id).background}
                  title={styleTitle(style.id)}
                  aria-label={`Apply ${styleTitle(style.id)}`}
                  onclick={() => wrapSelection(style.id)}
                  disabled={applying || saving}
                >
                  {style.id}
                </button>
              {/each}
            </div>
          {/if}
          {#if replacementError}
            <p class="feedback error" role="alert">{replacementError}</p>
          {:else if replacementText !== selectedRow.text}
            <div class="preview-section">
              <p class="dialog-label">Preview</p>
              <p class="original-text preview">
                {@render styledText(replacementText)}
              </p>
            </div>
          {/if}
        {:else}
          <textarea
            id="edit-text"
            aria-label="New text"
            bind:this={translationInput}
            bind:value={translationText}
            oninput={() => {
              dialogErrorMessage = "";
              if (targetLanguage) {
                drafts[targetLanguage] = translationText;
                dirtyLanguages[targetLanguage] = true;
              }
            }}
            rows="4"
            disabled={applying || saving}></textarea>
          <button
            class="inline-action clear-translation"
            type="button"
            onclick={() => {
              translationText = "";
              drafts[targetLanguage] = "";
              dirtyLanguages[targetLanguage] = true;
              dialogErrorMessage = "";
            }}
            disabled={applying || saving || !targetLanguage}
            >Clear translation</button
          >
          {#if rowStyles.length > 0}
            <div
              class="style-chips"
              role="group"
              aria-label="Apply style to translation"
            >
              {#each rowStyles as style (style.id)}
                <button
                  class="style-chip"
                  type="button"
                  style:--style-hue={styleColor(style.id).hue}
                  style:--style-color={styleColor(style.id).background}
                  title={styleTitle(style.id)}
                  aria-label={`Apply ${styleTitle(style.id)} to translation`}
                  onclick={() => wrapTranslationSelection(style.id)}
                  disabled={applying || saving}>{style.id}</button
                >
              {/each}
            </div>
          {/if}
        {/if}
      </div>
      {#if !isEditingSource && orphanMessages.length > 0}
        <div class="orphan-reassign">
          <label for="orphan-message">Reassign saved translations</label>
          <select id="orphan-message" bind:value={selectedOrphanId}>
            <option value="">Choose an unmatched source…</option>
            {#each orphanMessages as orphan (orphan.id)}
              <option value={orphan.id}>{orphan.sourceText}</option>
            {/each}
          </select>
          <button
            class="inline-action"
            type="button"
            onclick={reassignOrphan}
            disabled={!selectedOrphanId ||
              textPreview.active ||
              textPreview.busy}>Reassign</button
          >
        </div>
      {/if}
      {#if dialogErrorMessage}
        <p class="feedback error" role="alert">{dialogErrorMessage}</p>
      {/if}
    </div>
  {/if}
  {#snippet actions()}
    {#if selectedRow}
      <button
        class="dialog-button"
        type="button"
        onclick={closeReplacement}
        disabled={applying || saving}
      >
        Cancel
      </button>
      {#if isEditingSource}
        <button
          class="dialog-button primary"
          type="button"
          onclick={applyReplacement}
          disabled={textPreview.active ||
            textPreview.busy ||
            applying ||
            saving ||
            !!replacementError ||
            !canApply(selectedRow)}
        >
          {applying ? "Applying…" : `Apply to ${selectedRow.count} frames`}
        </button>
      {:else}
        <button
          class="dialog-button primary"
          type="button"
          onclick={saveTranslations}
          disabled={applying ||
            saving ||
            !targetLanguage ||
            !Object.keys(dirtyLanguages).some(
              (language) => dirtyLanguages[language],
            )}>Save translation</button
        >
      {/if}
    {/if}
  {/snippet}
</Dialog>

<Dialog
  title="Document languages"
  titleId="source-language-title"
  bind:element={languageDialog}
  busy={saving}
  onclose={() => {
    pendingRemoval = "";
    promptedNewSource = "";
    promptedNewSourceError = "";
  }}
>
  {#if pendingRemoval}
    <p>
      Which language is the document written in? The source declaration does not
      change Illustrator text or update saved translations. Removing
      {pendingRemoval} permanently deletes all of its saved translations.
    </p>
    <label class="dialog-label" for="new-source-language"
      >Document language</label
    >
    <select
      class="translation-select"
      id="new-source-language"
      bind:value={promptedSourceLanguage}
      disabled={saving}
    >
      {#each translationStore.languages.filter((language) => language !== pendingRemoval) as language (language)}
        <option value={language}
          >{languageDisplayName(language)} ({language})</option
        >
      {/each}
      {#if promptedSourceLanguage && !translationStore.languages.includes(promptedSourceLanguage)}
        <option value={promptedSourceLanguage}>{promptedSourceLanguage}</option>
      {/if}
    </select>
    <label class="dialog-label" for="add-source-language"
      >Or add a language</label
    >
    <div class="language-add-row">
      <input
        id="add-source-language"
        name="source-language-tag"
        type="text"
        autocomplete="off"
        bind:value={promptedNewSource}
        placeholder="e.g. fr-CA…"
        disabled={saving}
      />
      <button
        class="inline-action"
        type="button"
        onclick={useNewSourceLanguage}
        disabled={saving}>Use tag</button
      >
    </div>
    {#if promptedNewSourceError}
      <p class="feedback error" role="alert">{promptedNewSourceError}</p>
    {/if}
    {#if languageError}
      <p class="feedback error" role="alert">{languageError}</p>
    {/if}
  {:else}
    <p class="feedback language-guidance">
      Select one source language. Removing a target keeps its saved
      translations.
    </p>
    <div class="language-list">
      {#each translationStore.languages as language (language)}
        <div class="language-chip">
          {#if language !== translationStore.sourceLanguage}
            <button
              type="button"
              class="language-source-button"
              onclick={() => changeSourceLanguage(language)}
              disabled={translationDataInvalid || loading || applying || saving}
              >Set source</button
            >
          {:else}
            <span class="source-language">Source</span>
          {/if}
          <span>{languageDisplayName(language)} ({language})</span>
          <button
            type="button"
            class="language-remove"
            aria-label={`Remove ${language}`}
            onclick={() => beginRemoveLanguage(language)}
            disabled={translationDataInvalid || loading || applying || saving}
            >Remove</button
          >
        </div>
      {/each}
    </div>
    <form
      class="language-add-row"
      onsubmit={(event) => {
        event.preventDefault();
        void addLanguage();
      }}
    >
      <div class="language-select">
        <select
          class="translation-select language-picker"
          aria-label="Add document language"
          bind:value={newLanguageTag}
          disabled={translationDataInvalid || loading || applying || saving}
        >
          <option value="" disabled>Select a language</option>
          {#each commonLanguages.filter(({ tag }) => !translationStore.languages.some((language) => language.toLowerCase() === tag.toLowerCase())) as language (language.tag)}
            <option value={language.tag}>{language.name}</option>
          {/each}
          <option value={CUSTOM_LANGUAGE_TAG}>Other / regional language…</option
          >
        </select>
      </div>
      {#if newLanguageTag === CUSTOM_LANGUAGE_TAG}
        <input
          aria-label="Custom language tag"
          name="custom-language-tag"
          type="text"
          autocomplete="off"
          placeholder="e.g. fr-CA…"
          bind:value={customLanguageTag}
          disabled={translationDataInvalid || loading || applying || saving}
        />
      {/if}
      <button
        class="inline-action"
        type="submit"
        disabled={!newLanguageTag ||
          (newLanguageTag === CUSTOM_LANGUAGE_TAG &&
            !customLanguageTag.trim()) ||
          loading ||
          translationDataInvalid ||
          saving}>Add</button
      >
    </form>
    {#if languageError}
      <p class="feedback error" role="alert">{languageError}</p>
    {/if}
    {#if !documentIdentity}
      <p class="feedback">Save this document before saving language changes.</p>
    {/if}
  {/if}
  {#snippet actions()}
    {#if pendingRemoval}
      <button
        class="dialog-button"
        type="button"
        onclick={() => languageDialog?.close()}
        disabled={saving}>Cancel</button
      >
      <button
        class="dialog-button primary"
        type="button"
        onclick={confirmSourceRemoval}
        disabled={saving ||
          !promptedSourceLanguage ||
          promptedSourceLanguage === pendingRemoval}
        >Remove {pendingRemoval}</button
      >
    {:else}
      <button
        class="dialog-button primary"
        type="button"
        onclick={() => languageDialog?.close()}
        disabled={saving}>Done</button
      >
    {/if}
  {/snippet}
</Dialog>

<style lang="scss">
  .text-tab {
    display: flex;
    flex-direction: column;
    gap: var(--space-m);
    height: 100%;
    min-height: 0;
  }

  .section-divider {
    flex-shrink: 0;
    width: 100%;
    height: 0;
    margin: 0;
    border: 0;
    border-top: 1px solid var(--color-field-border);
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-s);

    p {
      min-width: 0;
      margin: 0;
      color: var(--color-text-secondary);
      font-size: var(--font-size-base);
    }
  }

  .refresh-button {
    flex-shrink: 0;
    padding: var(--space-xs) var(--space-s);
    border: 0;
    border-radius: var(--space-2xs);
    background: var(--color-primary);
    color: var(--color-text);
    cursor: pointer;
    white-space: nowrap;
  }

  .toolbar {
    display: flex;
    gap: var(--space-s);
    flex-shrink: 0;
  }

  .search-field {
    position: relative;
    flex: 1;
    min-width: 0;
  }

  .sort-control {
    box-sizing: border-box;
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: var(--space-s);
    min-width: 0;
    min-height: 2.5rem;
    padding: 0 var(--space-m);
    border: 1px solid var(--color-field-border);
    border-radius: var(--space-s);
    background: var(--color-primary);
  }

  .preview-language-control {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    border: 1px solid var(--color-field-border);
    border-radius: var(--space-s);
    background: var(--color-primary);
  }

  .preview-language-header {
    display: flex;
    align-items: baseline;
    gap: var(--space-s);
    min-width: 0;
    padding: var(--space-xs) var(--space-m) 0;
  }

  .preview-language-label {
    min-width: 0;
    overflow: hidden;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .preview-language-picker {
    min-width: 0;
    padding: 0 var(--space-m) var(--space-xs);
  }

  .preview-language-picker :global(.dropdown-container),
  .preview-language-picker :global(.selected-option) {
    width: 100%;
    min-width: 0;
  }

  .preview-language-picker :global(.selected-option) {
    min-height: 2rem;
  }

  .preview-language-picker :global(.dropdown-value) {
    color: var(--color-text);
  }

  .source-language {
    min-width: 0;
    overflow: hidden;
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .language-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    max-height: 10rem;
    margin: var(--space-s) 0;
    overflow: auto;
  }

  .language-chip,
  .language-add-row {
    display: flex;
    align-items: center;
    gap: var(--space-s);
    min-width: 0;
  }

  .language-chip {
    justify-content: space-between;
    padding: var(--space-xs) var(--space-s);
    border: 1px solid var(--color-field-border);
    border-radius: var(--space-s);
    background: var(--color-primary);
    color: var(--color-text);
    font-size: var(--font-size-sm);
  }

  .language-add-row input,
  .translation-select {
    box-sizing: border-box;
    flex: 1;
    min-width: 0;
    width: 100%;
    min-height: 2.5rem;
    padding: 0 var(--space-m);
    border: 1px solid var(--color-field-border);
    border-radius: var(--space-2xs);
    background: var(--color-primary);
    color: var(--color-text);
    font: inherit;
  }

  .language-source-button,
  .language-remove,
  .inline-action {
    border: 0;
    background: transparent;
    color: var(--color-accent-primary);
    font: inherit;
    cursor: pointer;
  }

  .language-source-button {
    color: var(--color-text);
  }

  .language-source-button,
  .language-remove {
    padding: 0;
    line-height: 1.4;
  }

  .language-remove {
    color: var(--color-text-secondary);
  }

  .language-select {
    position: relative;
    flex: 1;
    min-width: 0;
  }

  .language-picker {
    appearance: none;
    padding-left: var(--space-s);
    padding-right: calc(var(--space-m) + 1rem);
  }

  .language-select::after {
    position: absolute;
    top: 50%;
    right: var(--space-m);
    width: 0.45rem;
    height: 0.45rem;
    border-right: 2px solid var(--color-text-muted);
    border-bottom: 2px solid var(--color-text-muted);
    content: "";
    pointer-events: none;
    transform: translateY(-65%) rotate(45deg);
  }

  .inline-action {
    padding: var(--space-xs) var(--space-s);
    border-radius: var(--space-2xs);
    background: var(--color-secondary);
    color: var(--color-text);
    white-space: nowrap;
  }

  .inline-action:disabled,
  .language-remove:disabled,
  .language-source-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .orphan-reassign {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    margin: var(--space-xs) 0 var(--space-s);
    padding: var(--space-s);
    border-radius: var(--space-2xs);
    background: var(--color-secondary);
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  .source-change-warning {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  .translation-status {
    display: block;
    margin-top: var(--space-xs);
    color: var(--color-text-secondary);
    font-size: var(--font-size-base);
  }

  .all-text-button {
    display: block;
    margin: var(--space-m) auto 0;
  }

  /* Fits the longest option, so the trigger and its menu keep one width. */
  .sort-control :global(.dropdown-container) {
    width: 17ch;
  }

  .sort-control :global(.dropdown-value),
  .sort-control :global(.li-item span) {
    white-space: nowrap;
  }

  .sort-control :global(.selected-option) {
    gap: var(--space-s);
  }

  .control-label {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  mark {
    border-radius: 2px;
    background: var(--color-accent-primary);
    color: var(--color-white);
    font: inherit;
  }

  .search-icon {
    position: absolute;
    top: 50%;
    left: var(--space-m);
    width: 1em;
    height: 1em;
    transform: translateY(-50%);
    color: var(--color-text-secondary);
    pointer-events: none;
  }

  .search-input {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    min-height: 2.5rem;
    padding: var(--space-s) var(--space-m);
    padding-left: calc(var(--space-m) + 1em + var(--space-s));
    border: 1px solid var(--color-field-border);
    border-radius: var(--space-s);
    background: var(--color-primary);
    color: var(--color-text);
    font: inherit;
  }

  .search-input::placeholder {
    color: var(--color-text-secondary);
  }

  .search-input:focus-visible,
  .refresh-button:focus-visible {
    outline: 2px solid var(--color-accent-primary);
    outline-offset: -2px;
  }

  button:disabled,
  textarea:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .feedback {
    margin: 0;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  .preview-warning {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-s);
    padding: var(--space-m);
    border: 1px solid var(--color-warning);
    border-radius: var(--space-s);
    background: var(--color-secondary);
    color: var(--color-text);
    font-size: var(--font-size-base);
  }

  .preview-warning p {
    margin: 0;
  }

  .preview-counts {
    font-variant-numeric: tabular-nums;
  }

  .preview-warning-icon {
    display: inline-flex;
    flex-shrink: 0;
    width: 1.25em;
    height: 1.25em;
    color: var(--color-warning);
  }

  .preview-warning-icon svg {
    width: 100%;
    height: 100%;
  }

  .language-guidance {
    color: var(--color-text-secondary);
    font-size: var(--font-size-base);
  }

  .loading {
    display: grid;
    flex: 1;
    place-items: center;
    text-align: center;
    font-size: var(--font-size-base);
  }

  .error {
    color: #d82028;
  }

  .text-results {
    flex: 1;
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
  }

  .text-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .text-list li + li {
    margin-top: var(--space-s);
  }

  .text-card {
    display: block;
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    padding: var(--space-m);
    border: 1px solid var(--color-field-border);
    border-radius: var(--space-s);
    background: var(--color-primary);
    color: var(--color-text);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .text-card:hover:not(:disabled) {
    background: var(--color-secondary);
  }

  .text-card:focus-visible {
    outline: 2px solid var(--color-accent-primary);
    outline-offset: -2px;
  }

  .count-badge {
    float: right;
    min-width: 1.5em;
    margin-left: var(--space-s);
    padding: var(--space-3xs) var(--space-2xs);
    border-radius: 999px;
    background: var(--color-secondary);
    font-size: inherit;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    text-align: center;
  }

  .inconsistent-icon {
    float: right;
    display: inline-flex;
    margin-left: var(--space-xs);
    color: var(--color-warning);
  }

  .inconsistent-icon svg,
  .inconsistency-help svg {
    width: 1.25em;
    height: 1.25em;
    flex-shrink: 0;
  }

  .card-text {
    display: block;
    width: 100%;
    min-width: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-family: "Inter", sans-serif;
  }

  textarea {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    resize: vertical;
    padding: var(--space-xs);
    border: 1px solid var(--color-ruler);
    border-radius: var(--space-2xs);
    background: var(--color-secondary);
    color: var(--color-text);
    font: inherit;
  }

  textarea {
    margin-top: var(--space-xs);
    background: var(--color-primary);
    font-family: "Geist Mono", monospace;
  }

  .dialog-label {
    margin: 0;
    color: var(--color-text);
    font-size: var(--font-size-base);
    font-weight: 600;
  }

  .original-text {
    max-height: 8rem;
    overflow: auto;
    margin: var(--space-xs) 0 var(--space-m);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-family: "Inter", sans-serif;
  }

  .edit-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-m);
  }

  .editor-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  .edit-content .original-text {
    margin: 0;
  }

  .label-row {
    display: flex;
    position: relative;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-xs);
    min-height: 1.75rem;
  }

  .edit-content .label-row {
    min-height: 0;
    padding-right: 2rem;
  }

  .original-label .label-icon,
  .editor-label .label-icon {
    position: absolute;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
  }

  .editor-label {
    margin-top: 0;
  }

  .edit-content #edit-text {
    margin-top: 0;
  }

  .edit-content .style-chips {
    margin-top: 0;
  }

  .clear-translation {
    align-self: flex-end;
  }

  .edit-content > .orphan-reassign {
    margin: 0;
  }

  .label-icon {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    border: 0;
    border-radius: var(--space-2xs);
    background: transparent;
    color: var(--color-text-secondary);
    cursor: help;
  }

  .label-icon:hover,
  .label-icon:focus-visible {
    color: var(--color-text);
    background: var(--color-primary);
  }

  .inconsistency-help,
  .inconsistency-help:hover,
  .inconsistency-help:focus-visible {
    color: var(--color-warning);
  }

  .styled {
    border-radius: 2px;
    background: hsl(var(--style-hue) 70% 55% / 0.3);
    box-shadow: inset 0 -2px hsl(var(--style-hue) 70% 55%);
    font-family: "Inter", sans-serif;
  }

  .style-tag {
    margin-right: 2px;
    padding: 0 3px;
    border-radius: 2px;
    background: var(--style-color);
    color: var(--color-white);
    font-family: "Inter", sans-serif;
    font-size: 0.75em;
    vertical-align: 0.15em;
  }

  .styled.clickable {
    cursor: pointer;
  }

  .style-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2xs);
    margin-top: var(--space-xs);
  }

  .style-chip {
    min-width: 2rem;
    min-height: 2rem;
    padding: 4px var(--space-xs);
    border: 1px solid hsl(var(--style-hue) 70% 55%);
    border-radius: var(--space-2xs);
    background: var(--style-color);
    color: var(--color-white);
    font: inherit;
    font-family: "Inter", sans-serif;
    font-size: var(--font-size-base);
    font-variant-numeric: tabular-nums;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    max-width: 100%;
  }

  .style-chip:hover:not(:disabled) {
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.6);
  }

  .style-chip:active:not(:disabled) {
    box-shadow: inset 0 0 0 2px rgb(255 255 255 / 0.8);
  }

  .style-chip:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .preview-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    margin-top: var(--space-xs);
    padding-top: var(--space-m);
    border-top: 1px solid var(--color-ruler);
  }
</style>
