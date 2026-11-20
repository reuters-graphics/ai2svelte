import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import * as Svelte from "svelte";
import { get } from "svelte/store";
import safeParser from "postcss-safe-parser";
import postcss from "postcss";
import { triggerWave, ai2svelteInProgress, styles } from "../../../stores";
import RunButton from "../RunButton.svelte";
import { evalTS } from "../../../../__mocks__/bolt";
import { textPreview } from "../../../utils/textPreview.svelte";

// RunButton calls evalTS only when window.cep is truthy.
// These tests stub window.cep to a minimal object so the CEP-path runs with
// the evalTS mock in place instead of the real bridge.

function stubCep() {
  vi.stubGlobal("cep", { fs: {} });
}

function unstubCep() {
  vi.unstubAllGlobals();
}

function translationDocument() {
  return {
    identity: "/project/map.ai",
    saved: true,
    data: {
      schemaVersion: 1,
      sourceLanguage: "en",
      languages: ["en"],
      nextMessageId: 1,
      messages: [],
    },
  };
}

describe("RunButton", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    Object.assign(textPreview, { active: false, busy: false, blocked: false });
    triggerWave.set(null);
    ai2svelteInProgress.set(false);
    // stylesString derived store reads `styles.root.toString()`.
    // Without an initialised PostCSS result it throws at subscription time.
    const emptyResult = await postcss().process("", { parser: safeParser });
    styles.set(emptyResult);
  });
  afterEach(() => {
    Object.assign(textPreview, { active: false, busy: false, blocked: false });
  });

  it.each(["active", "busy", "blocked"] as const)(
    "blocks export before snapshot work when preview is %s",
    async (state) => {
      textPreview[state] = true;
      render(RunButton);
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(button).not.toHaveClass("running");
      await userEvent.click(button);
      expect(evalTS).not.toHaveBeenCalled();
    },
  );

  describe("without CEP (non-Illustrator environment)", () => {
    it("renders the Run AI2SVELTE button", () => {
      render(RunButton);
      expect(
        screen.getByRole("button", { name: /Run AI2SVELTE/i }),
      ).toBeInTheDocument();
    });

    it("passes the clicked button as the wave source outside of CEP", async () => {
      render(RunButton);
      const button = screen.getByRole("button");
      await userEvent.click(button);
      await waitFor(() => expect(get(triggerWave)).toBe(button));
    });
  });

  describe("with CEP stub (simulates Illustrator environment)", () => {
    // runAi2Svelte() has a delay(500) before calling evalTS. We use fake timers
    // so tests can advance past it deterministically without real-time waits.
    // userEvent.setup({ delay: null }) disables user-event's own internal delays
    // so that click() resolves immediately even under fake timers.
    let user: ReturnType<typeof userEvent.setup>;

    beforeEach(() => {
      stubCep();
      evalTS.mockImplementation(async (fn: string) => {
        if (fn === "fetchTextTranslationDocument") return translationDocument();
        if (fn === "runAi2Svelte") {
          return { missingFontFamilies: [], errors: [], warnings: [] };
        }
        return true;
      });
      vi.useFakeTimers();
      user = userEvent.setup({ delay: null });
    });
    afterEach(() => {
      unstubCep();
      vi.useRealTimers();
    });

    it('calls evalTS("runAi2Svelte") with settings and CSS code when clicked', async () => {
      render(RunButton);
      await user.click(screen.getByRole("button"));
      // Advance past the 500ms delay inside runAi2Svelte
      await vi.runAllTimersAsync();
      expect(evalTS).toHaveBeenCalledWith(
        "runAi2Svelte",
        expect.objectContaining({
          settings: expect.any(Object),
          code: expect.any(Object),
        }),
        "/project/map.ai",
      );
    });

    it("preserves the wave source after a successful export longer than two seconds", async () => {
      let finishExport!: (value: unknown) => void;
      evalTS.mockImplementation((fn: string) => {
        if (fn === "fetchTextTranslationDocument") {
          return Promise.resolve(translationDocument());
        }
        return fn === "runAi2Svelte"
          ? new Promise((resolve) => (finishExport = resolve))
          : Promise.resolve(true);
      });
      render(RunButton);
      const button = screen.getByRole("button");
      await user.click(button);
      await vi.advanceTimersByTimeAsync(3000);
      button.blur();
      expect(get(triggerWave)).toBeNull();
      finishExport({ missingFontFamilies: [], errors: [], warnings: [] });
      await vi.runAllTimersAsync();
      expect(get(triggerWave)).toBe(button);
    });

    it("disables the button while the run is in progress", async () => {
      // Make evalTS hang to observe the in-progress state
      let resolve!: (v: string[]) => void;
      evalTS.mockReturnValueOnce(new Promise<string[]>((r) => (resolve = r)));

      render(RunButton);
      const btn = screen.getByRole("button");
      await user.click(btn);

      // Button is disabled synchronously by the onclick handler before any await
      expect(btn).toBeDisabled();
      expect(btn).toHaveClass("running");

      // Resolve to let the test clean up
      resolve([]);
      await vi.runAllTimersAsync();
    });

    it("shows an error toast when evalTS rejects", async () => {
      // Spy on Svelte's mount so we can verify RunButton called it with the
      // correct Toast component and error message, without relying on whether
      // the imperatively-mounted Toast's onMount fires in the fake-timer context.
      const mountSpy = vi.spyOn(Svelte, "mount");
      evalTS.mockRejectedValueOnce(new Error("ExtendScript crashed"));

      render(RunButton);
      await user.click(screen.getByRole("button"));
      await vi.runAllTimersAsync();

      expect(mountSpy).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          props: expect.objectContaining({
            message: expect.stringMatching(/Error running ai2svelte/),
          }),
        }),
      );
    });

    it("does not set triggerWave on error", async () => {
      evalTS.mockRejectedValueOnce(new Error("Boom"));

      render(RunButton);
      await user.click(screen.getByRole("button"));
      await vi.runAllTimersAsync();

      expect(get(triggerWave)).toBeNull();
      expect(get(ai2svelteInProgress)).toBe(false);
    });

    it('calls evalTS("setVariable") to persist settings after a successful run', async () => {
      render(RunButton);
      await user.click(screen.getByRole("button"));
      await vi.runAllTimersAsync();
      expect(evalTS).toHaveBeenCalledWith(
        "setVariable",
        "ai-settings",
        expect.any(Object),
      );
    });

    it("does not set triggerWave when the engine reports errors", async () => {
      evalTS.mockImplementation(async (fn: string) => {
        if (fn === "fetchTextTranslationDocument") return translationDocument();
        return fn === "runAi2Svelte"
          ? { missingFontFamilies: [], errors: ["x"], warnings: [] }
          : true;
      });
      render(RunButton);
      await user.click(screen.getByRole("button"));
      await vi.runAllTimersAsync();
      expect(get(triggerWave)).toBeNull();
      expect(get(ai2svelteInProgress)).toBe(false);
    });

    it("shows a toast when settings could not be saved", async () => {
      const mountSpy = vi.spyOn(Svelte, "mount");
      evalTS.mockImplementation(async (fn: string) => {
        if (fn === "fetchTextTranslationDocument") return translationDocument();
        if (fn === "setVariable") return false;
        return { missingFontFamilies: [], errors: [], warnings: [] };
      });
      render(RunButton);
      await user.click(screen.getByRole("button"));
      await vi.runAllTimersAsync();
      expect(mountSpy).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          props: expect.objectContaining({
            message: expect.stringMatching(/could not be saved/),
          }),
        }),
      );
    });

    it("ignores a second click while the export is pending", async () => {
      let resolve!: (v: unknown) => void;
      evalTS.mockImplementation((fn: string) => {
        if (fn === "fetchTextTranslationDocument") {
          return Promise.resolve(translationDocument());
        }
        return fn === "runAi2Svelte"
          ? new Promise((r) => (resolve = r))
          : Promise.resolve(true);
      });
      render(RunButton);
      const btn = screen.getByRole("button");
      await user.click(btn);
      await vi.advanceTimersByTimeAsync(600);
      await user.click(btn);
      await vi.advanceTimersByTimeAsync(600);
      const calls = () =>
        evalTS.mock.calls.filter((c: unknown[]) => c[0] === "runAi2Svelte");
      expect(calls()).toHaveLength(1);
      resolve({ missingFontFamilies: [], errors: [], warnings: [] });
      await vi.runAllTimersAsync();
    });
  });
});
