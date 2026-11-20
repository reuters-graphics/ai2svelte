import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import Main from "../main.svelte";
import { csi, evalTS } from "../../__mocks__/bolt";
import { textPreview } from "../utils/textPreview.svelte";
import { fetchSettings, saveSettings } from "../utils/utils";
import { cacheObj, docName, settingsObject } from "../stores";

vi.mock("../precheck/precheck.js", () => ({
  precheck: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../utils/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../utils/utils")>()),
  fetchSettings: vi.fn().mockResolvedValue(undefined),
  fetchSavedSettings: vi.fn().mockResolvedValue(undefined),
  saveSettings: vi.fn().mockResolvedValue(true),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

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
  translated: 1,
};

describe("root preview lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("cep", { fs: {} });
    Object.assign(textPreview, inactive, {
      busy: false,
      blocked: false,
      error: "",
    });
    for (const key of Object.keys(cacheObj)) delete cacheObj[key];
    docName.set("");
    settingsObject.set({});
    evalTS.mockImplementation(async (name: string) => {
      if (name === "getTextPreviewStatus")
        return textPreview.active ? active : inactive;
      if (name === "beginTextPreview") return active;
      if (name === "endTextPreview") return inactive;
      if (name === "getDocumentName") return "source.ai";
      if (name === "getActiveDocumentsNames") return ["source.ai"];
      if (name === "getActiveDocumentIdentity") return active.sourceIdentity;
      if (name === "fetchDocSelectors")
        return {
          groups: [
            {
              text: "Source label",
              count: 2,
              signature: "source",
              styleKeys: [],
            },
          ],
          styles: [],
          identity: active.sourceIdentity,
        };
      if (name === "fetchTextTranslationDocument")
        return {
          identity: active.sourceIdentity,
          saved: true,
          data: {
            schemaVersion: 1,
            sourceLanguage: "en",
            languages: ["en", "fr"],
            nextMessageId: 1,
            messages: [],
          },
        };
    });
  });
  afterEach(() => {
    Object.assign(textPreview, inactive, {
      busy: false,
      blocked: false,
      error: "",
    });
    vi.unstubAllGlobals();
  });

  async function enterPreview() {
    const result = render(Main);
    await waitFor(() => expect(fetchSettings).toHaveBeenCalled());
    await userEvent.click(screen.getByRole("tab", { name: "Text" }));
    await userEvent.click(
      await screen.findByRole("combobox", { name: "Preview language" }),
    );
    await userEvent.click(
      document.querySelector<HTMLElement>('[data-value="fr"]')!,
    );
    await screen.findByText(/Temporary preview/);
    return result;
  }

  it("does not reload source settings or rows on a preview activation or save on unload", async () => {
    const result = await enterPreview();
    const settingLoads = vi.mocked(fetchSettings).mock.calls.length;
    const scans = evalTS.mock.calls.filter(
      ([name]) => name === "fetchDocSelectors",
    ).length;
    const handlers = csi.addEventListener.mock.calls.filter(
      ([name]) => name === "documentAfterActivate",
    );
    for (const [, handler] of handlers) await handler();
    expect(vi.mocked(fetchSettings).mock.calls).toHaveLength(settingLoads);
    expect(
      evalTS.mock.calls.filter(([name]) => name === "fetchDocSelectors"),
    ).toHaveLength(scans);
    expect(
      screen.getByRole("button", { name: "Edit text: Source label" }),
    ).toBeInTheDocument();
    result.unmount();
    expect(saveSettings).not.toHaveBeenCalled();
  });

  it("waits for preview cleanup before committing a tab change", async () => {
    await enterPreview();
    const implementation = evalTS.getMockImplementation()!;
    let finish!: (value: typeof inactive) => void;
    evalTS.mockImplementation((name: string, ...args: unknown[]) =>
      name === "endTextPreview"
        ? new Promise((resolve) => {
            finish = resolve;
          })
        : implementation(name, ...args),
    );
    await userEvent.click(screen.getByRole("tab", { name: "Home" }));
    expect(screen.getByRole("tab", { name: "Text" })).toHaveAttribute(
      "data-state",
      "active",
    );
    finish(inactive);
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Home" })).toHaveAttribute(
        "data-state",
        "active",
      ),
    );
    expect(textPreview.active).toBe(false);
  });

  it("keeps Text mounted and export blocked if tab-exit cleanup fails", async () => {
    await enterPreview();
    const implementation = evalTS.getMockImplementation()!;
    evalTS.mockImplementation((name: string, ...args: unknown[]) =>
      name === "endTextPreview"
        ? Promise.reject(new Error("Cannot close temporary document"))
        : implementation(name, ...args),
    );
    await userEvent.click(screen.getByRole("tab", { name: "Home" }));
    await screen.findAllByText("Cannot close temporary document");
    expect(screen.getByRole("tab", { name: "Text" })).toHaveAttribute(
      "data-state",
      "active",
    );
    expect(
      screen.getByRole("button", { name: "Run AI2SVELTE" }),
    ).toBeDisabled();
    expect(textPreview.blocked).toBe(true);
  });
});
