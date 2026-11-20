import { beforeEach, describe, expect, it, vi } from "vitest";
import { evalTS } from "../../../__mocks__/bolt";
import {
  reconcileTextPreview,
  returnToOriginal,
  selectPreviewLanguage,
  textPreview,
} from "../textPreview.svelte";

const inactive = {
  active: false,
  sourceIdentity: "",
  language: "",
  translated: 0,
  untranslated: 0,
  overflowed: 0,
};
const active = {
  ...inactive,
  active: true,
  sourceIdentity: "/source.ai#session-1",
  language: "fr",
  translated: 2,
  untranslated: 1,
};

describe("text preview controller", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Object.assign(textPreview, inactive, {
      busy: false,
      blocked: false,
      error: "",
    });
  });

  it("serializes language changes and ignores internal activation events", async () => {
    let finish!: (value: typeof active) => void;
    evalTS.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const pending = selectPreviewLanguage(active.sourceIdentity, "fr");
    expect(await reconcileTextPreview()).toBe(true);
    expect(await selectPreviewLanguage(active.sourceIdentity, "de")).toBe(
      false,
    );
    expect(evalTS).toHaveBeenCalledTimes(1);
    finish(active);
    expect(await pending).toBe(true);
    expect(textPreview.language).toBe("fr");
    expect(textPreview.busy).toBe(false);
  });

  it("reconciles the actual host language after a failed switch", async () => {
    Object.assign(textPreview, active);
    evalTS
      .mockRejectedValueOnce(new Error("Cannot open copy"))
      .mockResolvedValueOnce(active);
    expect(await selectPreviewLanguage(active.sourceIdentity, "de")).toBe(
      false,
    );
    expect(textPreview.language).toBe("fr");
    expect(textPreview.error).toContain("Cannot open copy");
  });

  it("ignores an older activation response after a language switch commits", async () => {
    let finishStatus!: (value: typeof inactive) => void;
    evalTS.mockImplementation((name: string) =>
      name === "getTextPreviewStatus"
        ? new Promise((resolve) => {
            finishStatus = resolve;
          })
        : Promise.resolve(active),
    );
    const pending = reconcileTextPreview();
    expect(await selectPreviewLanguage(active.sourceIdentity, "fr")).toBe(true);
    finishStatus(inactive);
    await pending;
    expect(textPreview.active).toBe(true);
    expect(textPreview.language).toBe("fr");
  });

  it("blocks export when ownership cannot be reconciled", async () => {
    evalTS.mockRejectedValueOnce(new Error("Orphaned preview"));
    expect(await reconcileTextPreview()).toBe(true);
    expect(textPreview.blocked).toBe(true);
  });

  it("notifies document settings loading after the host ends a preview", async () => {
    Object.assign(textPreview, active);
    const ended = vi.fn();
    window.addEventListener("text-preview-ended", ended, { once: true });
    evalTS.mockResolvedValueOnce(inactive);
    expect(await returnToOriginal()).toBe(true);
    expect(ended).toHaveBeenCalledOnce();
    expect(textPreview.active).toBe(false);
  });

  it("keeps a failed exit recoverable instead of declaring the preview closed", async () => {
    Object.assign(textPreview, active);
    evalTS.mockRejectedValueOnce(new Error("Cannot close copy"));
    expect(await returnToOriginal()).toBe(false);
    expect(textPreview.active).toBe(true);
    expect(textPreview.blocked).toBe(true);
  });
});
