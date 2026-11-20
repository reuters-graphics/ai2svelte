import type { TextPreviewStatus } from "../../shared/textPreview";
import {
  parseTextTranslationStore,
  TEXT_TRANSLATIONS_KEY,
  type TextTranslationStore,
} from "../../shared/textTranslations";
import { getHiddenData, storeHiddenData } from "./dataOperations";
import { documentIdentity, isDocumentOpen } from "./documentIdentity";
import { renderTextPreview } from "./fetchSelectors";

interface Session {
  source: Document;
  identity: string;
  directory: Folder;
  snapshot: File;
  files: File[];
  preview: Document | null;
  previewPath: string;
  status: TextPreviewStatus;
}

interface PreviewMarker {
  directoryPath?: unknown;
  previewPath?: unknown;
}

const TEMP_DIRECTORY_PREFIX = "ai2svelte-text-preview-";
const OWNER_MARKER_NAME = ".ai2svelte-preview-owner";
const PREVIEW_FILE_PATTERN = /^preview-\d+\.ai$/;

let session: Session | null = null;
let sequence = 0;

function emptyStatus(): TextPreviewStatus {
  return {
    active: false,
    sourceIdentity: "",
    language: "",
    translated: 0,
    untranslated: 0,
    overflowed: 0,
  };
}

function readPreviewMarker(marker: File): PreviewMarker | null {
  if (!marker.exists) return null;
  if (!marker.open("r")) {
    throw new Error("Cannot read preview ownership: " + marker.fsName);
  }
  let value: unknown;
  try {
    value = JSON.parse(marker.read());
  } finally {
    marker.close();
  }
  return value && typeof value === "object" ? (value as PreviewMarker) : null;
}

function readPreviewMarkerForCleanup(marker: File): PreviewMarker | null {
  try {
    return readPreviewMarker(marker);
  } catch (error) {
    $.writeln(
      "[ai2svelte] Skipping preview cleanup for " +
        marker.fsName +
        ": " +
        String(error),
    );
    return null;
  }
}

function hasPreviewMarker(doc: Document): boolean {
  try {
    const marker = new File(doc.fullName.fsName + ".ai2svelte-preview");
    const value = readPreviewMarker(marker);
    return !!value && value.previewPath === doc.fullName.fsName;
  } catch (error) {
    throw new Error("Could not verify preview ownership: " + String(error));
  }
}

function isPreviewOpen(path: string): boolean {
  for (let i = 0; i < app.documents.length; i++) {
    if (app.documents[i].fullName.fsName === path) return true;
  }
  return false;
}

function removePreviewFile(file: File) {
  if (file.exists && !file.remove()) {
    throw new Error("Could not remove temporary preview file: " + file.fsName);
  }
}

function cleanupOrphanedPreviews() {
  const entries = Folder.temp.getFiles(TEMP_DIRECTORY_PREFIX + "*");
  for (let i = 0; i < entries.length; i++) {
    const directory = entries[i];
    if (
      !(directory instanceof Folder) ||
      directory.parent.fsName !== Folder.temp.fsName ||
      directory.name.indexOf(TEMP_DIRECTORY_PREFIX) !== 0
    ) {
      continue;
    }

    const ownerMarker = new File(directory.fsName + "/" + OWNER_MARKER_NAME);
    const owner = readPreviewMarkerForCleanup(ownerMarker);
    const ownedDirectory = !!owner && owner.directoryPath === directory.fsName;
    const items = directory.getFiles();
    const ownedPreviewPaths: string[] = [];

    for (let j = 0; j < items.length; j++) {
      const item = items[j];
      if (!(item instanceof File) || !PREVIEW_FILE_PATTERN.test(item.name))
        continue;
      const marker = new File(item.fsName + ".ai2svelte-preview");
      const markerData = readPreviewMarkerForCleanup(marker);
      let isOwnedPreview = ownedDirectory;
      if (!isOwnedPreview && markerData) {
        isOwnedPreview = markerData.previewPath === item.fsName;
      }
      if (isOwnedPreview) {
        ownedPreviewPaths.push(item.fsName);
      }
    }

    if (!ownedDirectory && !ownedPreviewPaths.length) continue;
    let previewIsOpen = false;
    for (let j = 0; j < items.length && !previewIsOpen; j++) {
      const item = items[j];
      if (!(item instanceof File)) continue;
      let isOwnedPreview =
        ownedDirectory && PREVIEW_FILE_PATTERN.test(item.name);
      for (let k = 0; k < ownedPreviewPaths.length && !isOwnedPreview; k++) {
        isOwnedPreview = item.fsName === ownedPreviewPaths[k];
      }
      if (item.name === "source.ai" || isOwnedPreview) {
        if (isPreviewOpen(item.fsName)) previewIsOpen = true;
      }
    }
    if (previewIsOpen) continue;

    for (let j = 0; j < items.length; j++) {
      const item = items[j];
      if (!(item instanceof File)) continue;
      let isMarkedPreview = false;
      for (let k = 0; k < ownedPreviewPaths.length; k++) {
        if (
          item.fsName === ownedPreviewPaths[k] ||
          item.fsName === ownedPreviewPaths[k] + ".ai2svelte-preview"
        ) {
          isMarkedPreview = true;
          break;
        }
      }
      let shouldRemove = item.name === "source.ai" || isMarkedPreview;
      if (ownedDirectory) {
        if (
          PREVIEW_FILE_PATTERN.test(item.name) ||
          /^preview-\d+\.ai\.ai2svelte-preview$/.test(item.name) ||
          item.name === OWNER_MARKER_NAME
        ) {
          shouldRemove = true;
        }
      }
      if (shouldRemove) removePreviewFile(item);
    }

    if (!directory.getFiles().length && !directory.remove()) {
      throw new Error(
        "Could not remove temporary preview directory: " + directory.fsName,
      );
    }
  }
}

function requireSource() {
  if (
    !session ||
    !isDocumentOpen(session.source) ||
    documentIdentity(session.source) !== session.identity
  ) {
    throw new Error(
      "The original document changed or closed. Return to the original.",
    );
  }
  return session;
}

export function assertNotTextPreview() {
  let blocked = !!session;
  if (app.documents.length && hasPreviewMarker(app.activeDocument))
    blocked = true;
  if (blocked) {
    throw new Error(
      "Return to the original document before exporting or editing source settings.",
    );
  }
}

export function previewSourceDocument(): Document | undefined {
  return session ? requireSource().source : undefined;
}

export function endTextPreview(returnToSource = true): TextPreviewStatus {
  if (!session) return emptyStatus();
  const current = session;
  const active = app.documents.length ? app.activeDocument : null;
  if (current.preview && isDocumentOpen(current.preview)) {
    // A user-created Save As copy is no longer ours to close.
    if (current.preview.fullName.fsName === current.previewPath) {
      current.preview.close(SaveOptions.DONOTSAVECHANGES);
    }
  }
  current.preview = null;
  if (returnToSource && isDocumentOpen(current.source))
    current.source.activate();
  else if (active && isDocumentOpen(active)) active.activate();
  for (let i = current.files.length - 1; i >= 0; i--) {
    const file = current.files[i];
    if (file.exists && !file.remove()) {
      throw new Error(
        "Could not remove temporary preview file: " + file.fsName,
      );
    }
  }
  if (current.directory.exists && !current.directory.remove()) {
    throw new Error("Could not remove the temporary preview directory.");
  }
  session = null;
  return emptyStatus();
}

export function getTextPreviewStatus(): TextPreviewStatus {
  if (!session) {
    cleanupOrphanedPreviews();
    if (app.documents.length && hasPreviewMarker(app.activeDocument)) {
      throw new Error(
        "This is an orphaned language preview. Close it without saving and activate the original document.",
      );
    }
    return emptyStatus();
  }
  const current = session;
  if (
    !isDocumentOpen(current.source) ||
    !current.preview ||
    !isDocumentOpen(current.preview) ||
    !app.documents.length ||
    app.activeDocument !== current.preview ||
    documentIdentity(current.source) !== current.identity
  ) {
    return endTextPreview(false);
  }
  return current.status;
}

export function beginTextPreview(expectedIdentity: string, language: string) {
  const progress = { phase: "checking preview ownership" };
  try {
    return createTextPreview(expectedIdentity, language, progress);
  } catch (error) {
    if (session && !session.preview) endTextPreview();
    throw new Error(
      "Could not start language preview while " +
        progress.phase +
        ": " +
        String(error),
    );
  }
}

function createTextPreview(
  expectedIdentity: string,
  language: string,
  progress: { phase: string },
) {
  if (session) {
    const current = requireSource();
    if (
      current.identity !== expectedIdentity ||
      app.activeDocument !== current.preview
    ) {
      throw new Error("The active document changed. Return to the original.");
    }
  } else {
    assertNotTextPreview();
    progress.phase = "checking the saved original";
    const source = app.activeDocument;
    if (
      expectedIdentity &&
      documentIdentity(source) === expectedIdentity &&
      !source.saved &&
      String(source.name).toLowerCase().slice(-3) === ".ai"
    ) {
      // The preview is copied from the file on disk, so save pending edits.
      progress.phase = "saving the original";
      const saveOptions = new IllustratorSaveOptions();
      // @ts-expect-error -- types-for-adobe wrongly declares pdfCompatible static; it is an instance property
      saveOptions.pdfCompatible = false;
      source.saveAs(new File(source.fullName.fsName), saveOptions);
      progress.phase = "checking the saved original";
    }
    if (
      !expectedIdentity ||
      documentIdentity(source) !== expectedIdentity ||
      !source.saved ||
      String(source.name).toLowerCase().slice(-3) !== ".ai"
    ) {
      throw new Error(
        "Save the original as a native .ai document in Illustrator, then retry.",
      );
    }
    progress.phase = "creating the temporary directory";
    const directory = new Folder(
      Folder.temp.fsName +
        "/ai2svelte-text-preview-" +
        new Date().getTime() +
        "-" +
        sequence++,
    );
    if (directory.exists || !directory.create()) {
      throw new Error("Could not create a unique temporary preview directory.");
    }
    const snapshot = new File(directory.fsName + "/source.ai");
    const ownerMarker = new File(directory.fsName + "/" + OWNER_MARKER_NAME);
    session = {
      source,
      identity: expectedIdentity,
      directory,
      snapshot,
      files: [ownerMarker, snapshot],
      preview: null,
      previewPath: "",
      status: emptyStatus(),
    };
    progress.phase = "marking the temporary directory";
    if (!ownerMarker.open("w")) {
      throw new Error("Could not mark temporary preview ownership.");
    }
    try {
      if (
        !ownerMarker.write(JSON.stringify({ directoryPath: directory.fsName }))
      ) {
        throw new Error("Could not write temporary preview ownership.");
      }
    } finally {
      ownerMarker.close();
    }
    progress.phase = "copying the saved original";
    if (!source.fullName.copy(snapshot.fsName)) {
      endTextPreview();
      throw new Error("Could not copy the saved original for preview.");
    }
  }
  progress.phase = "resolving the original document";
  const current = requireSource();
  progress.phase = "reading translation metadata";
  const store = parseTextTranslationStore(
    getHiddenData(TEXT_TRANSLATIONS_KEY, true, current.source),
  );
  progress.phase = "validating the selected language";
  if (language === store.sourceLanguage) return endTextPreview();
  let configured = false;
  for (let i = 0; i < store.languages.length; i++) {
    if (store.languages[i] === language) configured = true;
  }
  if (!configured) throw new Error("This preview language is not configured.");
  progress.phase = "preparing preview files";
  const file = new File(
    current.directory.fsName + "/preview-" + sequence++ + ".ai",
  );
  const marker = new File(file.fsName + ".ai2svelte-preview");
  current.files.push(file, marker);
  let next: Document | null = null;
  let phase = "copying the source snapshot";
  progress.phase = "reading Illustrator interaction settings";
  const interaction = app.userInteractionLevel;
  progress.phase = "building the translated copy";
  try {
    if (!current.snapshot.copy(file.fsName))
      throw new Error("Could not create preview copy.");
    if (!marker.open("w"))
      throw new Error("Could not mark temporary preview ownership.");
    try {
      marker.write(JSON.stringify({ previewPath: file.fsName }));
    } finally {
      marker.close();
    }
    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
    phase = "opening the preview copy";
    next = app.open(file);
    phase = "checking linked artwork";
    // Keep absolute links resolved to the source assets after relocating the
    // copy. Links that are missing or unreadable are skipped: the preview only
    // needs the text, so it opens with those links unresolved.
    const sourceLinks = current.source.placedItems;
    const copiedLinks = next.placedItems;
    const linkCount = Math.min(sourceLinks.length, copiedLinks.length);
    for (let i = 0; i < linkCount; i++) {
      try {
        const sourceFile = sourceLinks[i].file;
        if (!sourceFile.exists) continue;
        if (copiedLinks[i].file.fsName !== sourceFile.fsName) {
          copiedLinks[i].relink(sourceFile);
        }
      } catch (linkError) {
        // Illustrator throws "no file associated with link" for broken links.
      }
    }
    phase = "rendering translations";
    const result = renderTextPreview(store, language);
    phase = "closing the previous preview";
    if (current.preview && isDocumentOpen(current.preview)) {
      if (current.preview.fullName.fsName === current.previewPath) {
        current.preview.close(SaveOptions.DONOTSAVECHANGES);
      }
    }
    current.preview = null;
    const status: TextPreviewStatus = {
      active: true,
      sourceIdentity: current.identity,
      language,
      translated: result.translated,
      untranslated: result.untranslated,
      overflowed: result.overflowed,
    };
    next.activate();
    current.preview = next;
    current.previewPath = file.fsName;
    current.status = status;
    return current.status;
  } catch (error) {
    let cleanupError = "";
    try {
      if (next && isDocumentOpen(next))
        next.close(SaveOptions.DONOTSAVECHANGES);
      if (current.preview && isDocumentOpen(current.preview))
        current.preview.activate();
      else endTextPreview();
    } catch (cleanup) {
      cleanupError = " Cleanup failed: " + String(cleanup);
    }
    throw new Error(
      "Preview failed while " + phase + ": " + String(error) + cleanupError,
    );
  } finally {
    app.userInteractionLevel = interaction;
  }
}

export function savePreviewTranslations(
  expectedIdentity: string,
  value: TextTranslationStore,
) {
  const current = requireSource();
  if (
    expectedIdentity !== current.identity ||
    app.activeDocument !== current.preview
  ) {
    throw new Error(
      "The preview document changed before translations were saved.",
    );
  }
  const parsed = parseTextTranslationStore(value);
  const existing = parseTextTranslationStore(
    getHiddenData(TEXT_TRANSLATIONS_KEY, true, current.source),
  );
  if (
    parsed.sourceLanguage !== existing.sourceLanguage ||
    JSON.stringify(parsed.languages) !== JSON.stringify(existing.languages)
  ) {
    throw new Error(
      "Return to the original before changing document languages.",
    );
  }
  return {
    ok: storeHiddenData(TEXT_TRANSLATIONS_KEY, parsed, current.source),
    identity: current.identity,
  };
}
