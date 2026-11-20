import { evalTS } from "../../lib/utils/bolt";
import type { TextPreviewStatus } from "../../../shared/textPreview";

export const textPreview = $state({
  active: false,
  sourceIdentity: "",
  language: "",
  translated: 0,
  untranslated: 0,
  overflowed: 0,
  busy: false,
  error: "",
  blocked: false,
});
let generation = 0;

function commit(status: TextPreviewStatus) {
  if (!status || typeof status.active !== "boolean") {
    throw new Error("Illustrator returned an invalid preview status.");
  }
  const ended = textPreview.active && !status.active;
  Object.assign(textPreview, status);
  textPreview.blocked = false;
  if (ended) window.dispatchEvent(new CustomEvent("text-preview-ended"));
}

function report(error: unknown) {
  textPreview.error =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : String(error);
  console.error("[ai2svelte] text preview:", textPreview.error);
}

export async function reconcileTextPreview(): Promise<boolean> {
  if (textPreview.busy) return true;
  const expectedGeneration = generation;
  try {
    const recovering = textPreview.blocked;
    const status = await evalTS("getTextPreviewStatus");
    if (expectedGeneration !== generation) {
      return textPreview.active || textPreview.busy || textPreview.blocked;
    }
    commit(status);
    if (recovering) textPreview.error = "";
  } catch (error) {
    if (expectedGeneration === generation) {
      textPreview.blocked = true;
      report(error);
    }
  }
  return textPreview.active || textPreview.blocked;
}

export async function selectPreviewLanguage(
  identity: string,
  language: string,
) {
  if (textPreview.busy) return false;
  generation++;
  textPreview.busy = true;
  textPreview.error = "";
  try {
    commit(await evalTS("beginTextPreview", identity, language));
    return true;
  } catch (error) {
    report(error);
    try {
      commit(await evalTS("getTextPreviewStatus"));
    } catch (statusError) {
      textPreview.blocked = true;
      report(statusError);
    }
    return false;
  } finally {
    textPreview.busy = false;
  }
}

export async function returnToOriginal() {
  if (textPreview.busy) return false;
  generation++;
  textPreview.busy = true;
  textPreview.error = "";
  try {
    commit(await evalTS("endTextPreview"));
    return true;
  } catch (error) {
    textPreview.blocked = true;
    report(error);
    return false;
  } finally {
    textPreview.busy = false;
  }
}
