import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { tick } from "svelte";
import { evalTS } from "../../../__mocks__/bolt";
import Text from "../Text.svelte";

const nativeDialogMethods = {
  showModal: Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    "showModal",
  ),
  close: Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close"),
};

describe("Text tab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("cep", { fs: {} });
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute("open", "");
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute("open");
        this.dispatchEvent(new Event("close"));
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    for (const [method, descriptor] of Object.entries(nativeDialogMethods)) {
      if (descriptor) {
        Object.defineProperty(HTMLDialogElement.prototype, method, descriptor);
      } else {
        Reflect.deleteProperty(HTMLDialogElement.prototype, method);
      }
    }
  });

  it("lists repeated text and applies a replacement from the dialog", async () => {
    let currentText = "Repeated label";
    evalTS.mockImplementation(
      async (functionName: string, ...args: unknown[]) => {
        if (functionName === "fetchDocSelectors") {
          return {
            groups: [
              { text: "One-off text", count: 1 },
              { text: currentText, count: 2 },
            ],
            styles: [],
          };
        }
        if (functionName === "replaceDocText") {
          currentText = args[1] as string;
          return { updated: 2, failed: 0, firstError: "" };
        }
        return undefined;
      },
    );

    render(Text);

    expect(
      await screen.findByRole("button", {
        name: "Edit text: Repeated label",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("One-off text")).not.toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Repeated text" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 matches")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Edit text: Repeated label",
      }),
    ).toHaveAccessibleDescription("2 matches");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", {
        name: "Edit text: Repeated label",
      }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Edit text",
    });
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveTextContent("Repeated label");
    const replacement = screen.getByRole("textbox", {
      name: "Source text",
    });
    expect(replacement).toHaveValue("Repeated label");
    await userEvent.clear(replacement);
    await userEvent.type(replacement, "Updated label");
    await userEvent.click(
      screen.getByRole("button", { name: "Apply to 2 frames" }),
    );

    await waitFor(() => {
      expect(evalTS).toHaveBeenCalledWith(
        "replaceDocText",
        "Repeated label",
        "Updated label",
      );
    });
    expect(await screen.findByText("Updated label")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Updated 2 text frame(s).",
    );
  });

  it("shows singletons only when all-text scope is enabled", async () => {
    evalTS.mockImplementation(async (functionName: string) => {
      if (functionName === "fetchDocSelectors") {
        return {
          groups: [
            { text: "One-off text", count: 1 },
            { text: "Repeated label", count: 2 },
          ],
          styles: [],
        };
      }
      if (functionName === "replaceDocText") {
        return { updated: 1, failed: 0, firstError: "" };
      }
      return undefined;
    });

    render(Text);
    await screen.findByText("Repeated label");
    const showAll = screen.getByRole("checkbox", { name: "Show all text" });
    expect(screen.queryByText("One-off text")).not.toBeInTheDocument();

    await userEvent.click(showAll);
    expect(await screen.findByText("One-off text")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "All text" })).toBeInTheDocument();
    expect(evalTS).toHaveBeenCalledWith("fetchDocSelectors", true, true);

    await userEvent.click(
      screen.getByRole("button", {
        name: "Edit text: One-off text",
      }),
    );
    const replacement = screen.getByRole("textbox", {
      name: "Source text",
    });
    await userEvent.clear(replacement);
    await userEvent.type(replacement, "Updated one-off");
    await userEvent.click(
      screen.getByRole("button", { name: "Apply to 1 frames" }),
    );
    await waitFor(() =>
      expect(evalTS).toHaveBeenCalledWith(
        "replaceDocText",
        "One-off text",
        "Updated one-off",
        true,
      ),
    );
  });

  it("closes the dialog without changing text when cancelled", async () => {
    evalTS.mockResolvedValueOnce({
      groups: [{ text: "Repeated label", count: 2 }],
      styles: [],
    });

    render(Text);
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Edit text: Repeated label",
      }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Edit text",
    });
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(dialog).not.toHaveAttribute("open");
    expect(evalTS).toHaveBeenCalledTimes(3);
  });

  it("shows an empty state when all text occurs only once", async () => {
    evalTS.mockResolvedValueOnce({
      groups: [{ text: "One-off text", count: 1 }],
      styles: [],
    });

    render(Text);

    expect(
      await screen.findByText(
        "No matching text found across multiple artboards.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("One-off text")).not.toBeInTheDocument();
  });

  it("filters visible text across styles and lines and restores cards when cleared", async () => {
    const styled = "River <1>bank</1>\nFlood alert";
    evalTS.mockResolvedValueOnce({
      groups: [
        { text: styled, count: 3 },
        { text: "Bridge destroyed", count: 2 },
      ],
      styles: [{ id: 1, font: "Arial-BoldMT", size: 12 }],
    });

    render(Text);
    const otherCard = await screen.findByRole("button", {
      name: "Edit text: Bridge destroyed",
    });
    const search = screen.getByRole("searchbox", {
      name: "Search text",
    });
    await userEvent.type(search, "  RIVER bank FLOOD  ");
    expect(
      screen.getByRole("button", {
        name: `Edit text: ${styled}`,
      }),
    ).toBeInTheDocument();
    expect(otherCard).not.toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.type(search, "not in the document");
    expect(screen.getByRole("status")).toHaveTextContent(
      "No text matches your search.",
    );
    expect(screen.queryByRole("list")).not.toBeInTheDocument();

    await userEvent.clear(search);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(
      screen.queryByText("No text matches your search."),
    ).not.toBeInTheDocument();
    expect(evalTS).toHaveBeenCalledTimes(3);
  });

  it("highlights search matches across styles and line breaks", async () => {
    evalTS.mockResolvedValueOnce({
      groups: [{ text: "River <1>bank</1>\nFlood alert", count: 2 }],
      styles: [{ id: 1, font: "Arial-BoldMT", size: 12 }],
    });

    render(Text);
    await screen.findByRole("list", { name: "Repeated text" });
    expect(document.querySelectorAll("mark")).toHaveLength(0);

    await userEvent.type(
      screen.getByRole("searchbox", { name: "Search text" }),
      "river BANK flood",
    );
    const marks = [...document.querySelectorAll("mark")];
    expect(marks.map((mark) => mark.textContent)).toEqual([
      "River ",
      "bank",
      "\nFlood",
    ]);
    expect(marks[1].closest(".styled")).not.toBeNull();
  });

  it("sorts cards by document order, copies, or text", async () => {
    evalTS.mockResolvedValueOnce({
      groups: [
        { text: "Beta", count: 2 },
        { text: "alpha", count: 4 },
        { text: "Gamma", count: 3 },
      ],
      styles: [],
    });

    render(Text);
    await screen.findByRole("list", { name: "Repeated text" });
    const cardTexts = () =>
      [...document.querySelectorAll(".card-text")].map(
        (item) => item.textContent,
      );
    expect(cardTexts()).toEqual(["Beta", "alpha", "Gamma"]);

    const sort = screen.getByRole("combobox");
    await userEvent.click(sort);
    await userEvent.click(await screen.findByText("Most copies"));
    await waitFor(() =>
      expect(cardTexts()).toEqual(["alpha", "Gamma", "Beta"]),
    );

    await userEvent.click(sort);
    await userEvent.click(await screen.findByText("A–Z"));
    await waitFor(() =>
      expect(cardTexts()).toEqual(["alpha", "Beta", "Gamma"]),
    );
  });

  it("warns when replaced text no longer fits its text box", async () => {
    evalTS.mockImplementation(async (functionName: string) => {
      if (functionName === "fetchDocSelectors") {
        return { groups: [{ text: "Label", count: 3 }], styles: [] };
      }
      return { updated: 3, failed: 0, firstError: "", overflowed: 2 };
    });

    render(Text);
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Edit text: Label",
      }),
    );
    const replacement = screen.getByRole("textbox", {
      name: "Source text",
    });
    await userEvent.type(replacement, " that is much longer");
    await userEvent.click(
      screen.getByRole("button", { name: "Apply to 3 frames" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Updated 3 text frame(s). 2 frames no longer fit their text box. They are selected in Illustrator.",
    );
  });

  it("flags near-matching copies and lets them be unified unchanged", async () => {
    evalTS.mockImplementation(async (functionName: string) => {
      if (functionName === "fetchDocSelectors") {
        return {
          groups: [
            { text: "Rock ‘n’ roll", count: 3, inconsistent: true },
            { text: "Same everywhere", count: 2, inconsistent: false },
          ],
          styles: [],
        };
      }
      return { updated: 1, failed: 0, firstError: "", overflowed: 0 };
    });

    render(Text);
    const card = await screen.findByRole("button", {
      name: "Edit text: Rock ‘n’ roll",
    });
    expect(card).toHaveAccessibleDescription(
      "3 matches. Copies differ slightly",
    );
    expect(
      screen.getByRole("button", {
        name: "Edit text: Same everywhere",
      }),
    ).toHaveAccessibleDescription("2 matches");
    const warning = card.querySelector(".inconsistent-icon") as HTMLElement;
    expect(document.querySelectorAll(".inconsistent-icon")).toHaveLength(1);
    await userEvent.hover(warning);
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent(
      "Applying makes all 3 copies match the replacement text.",
    );
    tooltip.dispatchEvent(new Event("animationend"));
    await userEvent.unhover(warning);
    tooltip.dispatchEvent(new Event("animationend"));
    await waitFor(() =>
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
    );

    await userEvent.click(card);
    expect(
      screen.getByRole("button", {
        name: /Copies differ slightly\. .*Applying makes all 3 copies match/,
      }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Apply to 3 frames" }),
    );
    await waitFor(() =>
      expect(evalTS).toHaveBeenCalledWith(
        "replaceDocText",
        "Rock ‘n’ roll",
        "Rock ‘n’ roll",
      ),
    );
  });

  it("keeps the dialog open when Escape is pressed during replacement", async () => {
    let finishReplacement!: () => void;
    const pending = new Promise<void>((resolve) => {
      finishReplacement = resolve;
    });
    evalTS.mockImplementation(async (functionName: string) => {
      if (functionName === "replaceDocText") {
        await pending;
        return { updated: 2, failed: 0, firstError: "" };
      }
      return {
        groups: [{ text: "Repeated label", count: 2 }],
        styles: [],
      };
    });

    render(Text);
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Edit text: Repeated label",
      }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Edit text",
    });
    expect(
      dialog.dispatchEvent(new Event("cancel", { cancelable: true })),
    ).toBe(true);
    await userEvent.type(
      screen.getByRole("textbox", { name: "Source text" }),
      " updated",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Apply to 2 frames" }),
    );
    expect(dialog).toHaveAttribute("aria-busy", "true");
    expect(
      dialog.dispatchEvent(new Event("cancel", { cancelable: true })),
    ).toBe(false);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();

    finishReplacement();
    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
  });

  it("highlights styled runs and edits them with style tags", async () => {
    const styled = "Total: <1>$5</1>";
    evalTS.mockImplementation(async (functionName: string) => {
      if (functionName === "fetchDocSelectors") {
        return {
          groups: [{ text: styled, count: 3 }],
          styles: [
            { id: 1, font: "Arial-BoldMT", size: 12 },
            { id: 2, font: "Arial-ItalicMT", size: 12 },
          ],
        };
      }
      if (functionName === "replaceDocText") {
        return { updated: 3, failed: 0, firstError: "" };
      }
      return undefined;
    });

    render(Text);
    const trigger = await screen.findByRole("button", {
      name: `Edit text: ${styled}`,
    });
    expect(trigger.querySelector(".card-text")?.textContent).toBe("Total: 1$5");
    const highlight = trigger.querySelector(".styled");
    expect(highlight).toHaveTextContent("1$5");
    expect(highlight).toHaveAttribute("title", "Style 1: Arial-BoldMT, 12pt");

    await userEvent.click(trigger);
    const replacement = screen.getByRole("textbox", {
      name: "Source text",
    }) as HTMLTextAreaElement;
    expect(replacement).toHaveValue(styled);
    const styleHelp = screen.getByRole("button", { name: "How to use styles" });
    expect(styleHelp.previousElementSibling).toHaveTextContent("Source text");
    expect(styleHelp.previousElementSibling).toHaveAttribute(
      "for",
      "replacement-text",
    );
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    await userEvent.hover(styleHelp);
    const tooltip = await screen.findByRole("tooltip");
    expect(styleHelp.closest("dialog")).toContainElement(tooltip);
    expect(tooltip).toHaveTextContent("Keep <1>…</1> around text");
    expect(tooltip).toHaveTextContent("literal tag such as \\<1>");
    await waitFor(() => expect(tooltip.style.left).not.toBe(""));
    tooltip.dispatchEvent(new Event("animationend"));
    await userEvent.unhover(styleHelp);
    tooltip.dispatchEvent(new Event("animationend"));
    await waitFor(() =>
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
    );
    styleHelp.focus();
    const focusedTooltip = await screen.findByRole("tooltip");
    await waitFor(() => expect(focusedTooltip.style.left).not.toBe(""));
    focusedTooltip.dispatchEvent(new Event("animationend"));
    styleHelp.blur();
    focusedTooltip.dispatchEvent(new Event("animationend"));
    // Style 2 isn't used in this text but is offered from the document.
    expect(
      screen.getByRole("button", { name: /Apply Style 2/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Apply Style 1/ }).textContent?.trim(),
    ).toBe("1");
    expect(
      screen.getByRole("button", { name: /Apply Style 2/ }).textContent?.trim(),
    ).toBe("2");

    // Dropping the tags falls back to the normal style; then re-apply style 1
    // to "Grand" via the chip.
    await userEvent.clear(replacement);
    await userEvent.type(replacement, "Grand total: $5");
    replacement.setSelectionRange(0, 5);
    await userEvent.click(
      screen.getByRole("button", {
        name: "Apply Style 1: Arial-BoldMT, 12pt",
      }),
    );
    expect(replacement).toHaveValue("<1>Grand</1> total: $5");

    await userEvent.click(
      screen.getByRole("button", { name: "Apply to 3 frames" }),
    );
    await waitFor(() => {
      expect(evalTS).toHaveBeenCalledWith(
        "replaceDocText",
        styled,
        "<1>Grand</1> total: $5",
      );
    });
  });

  it("keeps white style numbers above 7:1 contrast across the palette", async () => {
    const styles = Array.from({ length: 13 }, (_, index) => ({
      id: index + 1,
      font: "Arial",
      size: 12,
    }));
    const text = styles.map(({ id }) => `<${id}>Sample</${id}>`).join(" ");
    evalTS.mockResolvedValueOnce({
      groups: [{ text, count: 2 }],
      styles,
    });

    render(Text);
    const trigger = await screen.findByRole("button", {
      name: `Edit text: ${text}`,
    });
    const colors = Array.from(
      trigger.querySelectorAll<HTMLElement>(".styled"),
      (highlight) => highlight.style.getPropertyValue("--style-color"),
    );
    for (const color of colors) {
      const channels = [1, 3, 5].map((offset) => {
        const channel = parseInt(color.slice(offset, offset + 2), 16) / 255;
        return channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4;
      });
      const luminance =
        0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
      expect(1.05 / (luminance + 0.05)).toBeGreaterThanOrEqual(7);
    }
    expect(colors[12]).toBe(colors[0]);

    await userEvent.click(trigger);
    for (const style of styles) {
      const chip = screen.getByRole("button", {
        name: `Apply Style ${style.id}: Arial, 12pt`,
      });
      expect(chip.style.getPropertyValue("--style-color")).toBe(
        colors[style.id - 1],
      );
    }
  });

  it("undoes and redoes replacement edits without passing the shortcut on", async () => {
    evalTS.mockResolvedValue({
      groups: [{ text: "Total", count: 2 }],
      styles: [{ id: 1, font: "Arial-BoldMT", size: 12 }],
    });
    const windowKeydown = vi.fn();
    window.addEventListener("keydown", windowKeydown);

    render(Text);
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Edit text: Total",
      }),
    );
    const replacement = screen.getByRole("textbox", {
      name: "Source text",
    }) as HTMLTextAreaElement;
    await userEvent.type(replacement, " due now", {
      initialSelectionStart: 5,
      initialSelectionEnd: 5,
    });
    await userEvent.click(
      screen.getByRole("button", { name: /^Apply Style 1/ }),
    );
    expect(replacement).toHaveValue("Total due now<1></1>");

    await userEvent.keyboard("{Control>}z{/Control}");
    expect(replacement).toHaveValue("Total due now");
    await userEvent.keyboard("{Control>}z{/Control}");
    expect(replacement).toHaveValue("Total due ");
    await userEvent.keyboard("{Control>}z{/Control}");
    expect(replacement).toHaveValue("Total");
    await userEvent.keyboard("{Control>}z{/Control}");
    expect(replacement).toHaveValue("Total");
    await userEvent.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");
    expect(replacement).toHaveValue("Total due ");
    await userEvent.keyboard("{Control>}y{/Control}");
    expect(replacement).toHaveValue("Total due now");

    const historyKeys = windowKeydown.mock.calls.filter(([event]) =>
      ["z", "Z", "y"].includes((event as KeyboardEvent).key),
    );
    expect(historyKeys).toHaveLength(0);
    window.removeEventListener("keydown", windowKeydown);
  });

  it("blocks applying malformed or unknown style tags", async () => {
    evalTS.mockResolvedValueOnce({
      groups: [{ text: "Repeated label", count: 2 }],
      styles: [{ id: 1, font: "Arial-BoldMT", size: 12 }],
    });

    render(Text);
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Edit text: Repeated label",
      }),
    );
    const replacement = screen.getByRole("textbox", {
      name: "Source text",
    });
    const apply = screen.getByRole("button", { name: "Apply to 2 frames" });

    await userEvent.clear(replacement);
    await userEvent.type(replacement, "<1>Open");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Style <1> is missing its closing tag.",
    );
    expect(apply).toBeDisabled();

    await userEvent.clear(replacement);
    await userEvent.type(replacement, "<2>x</2>");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Style 2 doesn't exist in this document.",
    );
    expect(apply).toBeDisabled();
  });

  it("allows a paint between showing the loading state and starting the scan", async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => frames.push(callback)),
    );
    evalTS.mockResolvedValueOnce({ groups: [], styles: [] });

    render(Text);
    await waitFor(() => expect(frames).toHaveLength(1));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Scanning Illustrator text…",
    );
    expect(
      screen.queryByRole("button", { name: "Refresh" }),
    ).not.toBeInTheDocument();
    expect(evalTS).not.toHaveBeenCalled();
    expect(frames).toHaveLength(1);

    frames[0](0);
    await tick();

    expect(evalTS).not.toHaveBeenCalled();
    expect(frames).toHaveLength(2);
    frames[1](16);

    await waitFor(() =>
      expect(evalTS).toHaveBeenCalledWith("fetchDocSelectors", true),
    );
    expect(evalTS).toHaveBeenCalledTimes(3);
    expect(
      await screen.findByText(
        "No matching text found across multiple artboards.",
      ),
    ).toBeInTheDocument();
  });

  it("does not start a deferred scan after leaving the tab", async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => frames.push(callback)),
    );
    const { unmount } = render(Text);
    await waitFor(() => expect(frames).toHaveLength(1));

    await unmount();
    frames[0](0);
    expect(frames).toHaveLength(2);
    frames[1](16);
    await tick();

    expect(evalTS).not.toHaveBeenCalled();
  });

  it("shows a loading message until the text has loaded", async () => {
    let resolveLoad: (value: unknown) => void = () => {};
    evalTS.mockImplementation((functionName: string) => {
      if (functionName === "fetchDocSelectors") {
        return new Promise((resolve) => (resolveLoad = resolve));
      }
      if (functionName === "fetchTextTranslationDocument") {
        return Promise.resolve({ identity: "", saved: false, data: {} });
      }
      if (functionName === "getActiveDocumentIdentity") {
        return Promise.resolve("");
      }
      return Promise.resolve(undefined);
    });

    render(Text);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Scanning Illustrator text…",
    );
    expect(document.querySelector(".spinner")).not.toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(
      screen.queryByText("No matching text found across multiple artboards."),
    ).not.toBeInTheDocument();

    await waitFor(() => expect(evalTS).toHaveBeenCalled());
    resolveLoad({ groups: [{ text: "Label", count: 2 }], styles: [] });
    expect(
      await screen.findByRole("button", {
        name: "Edit text: Label",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Scanning Illustrator text…"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("pans Illustrator to the text when styled original text is clicked", async () => {
    const styled = "Total: <1>$5</1>";
    evalTS.mockImplementation(async (functionName: string) => {
      if (functionName === "fetchDocSelectors") {
        return {
          groups: [{ text: styled, count: 2 }],
          styles: [{ id: 1, font: "Arial-BoldMT", size: 12 }],
        };
      }
      return true;
    });

    render(Text);
    const card = await screen.findByRole("button", {
      name: `Edit text: ${styled}`,
    });
    await userEvent.click(card);
    evalTS.mockClear();

    const dialog = screen.getByRole("dialog", {
      name: "Edit text",
    });
    const original = dialog.querySelector(".original-text .styled");
    expect(original).not.toBeNull();
    await userEvent.click(original as Element);
    await userEvent.click(original as Element);

    expect(evalTS).toHaveBeenNthCalledWith(1, "revealDocText", styled, 0);
    expect(evalTS).toHaveBeenNthCalledWith(2, "revealDocText", styled, 1);

    // Plain text and the live preview don't trigger a reveal.
    evalTS.mockClear();
    await userEvent.click(
      screen.getByText(/^Total:/, { selector: ".original-text" }),
    );
    const replacement = screen.getByRole("textbox", {
      name: "Source text",
    });
    await userEvent.type(replacement, "!");
    const preview = dialog.querySelector(".preview .styled");
    expect(preview).not.toBeNull();
    await userEvent.click(preview as Element);
    expect(evalTS).not.toHaveBeenCalled();
  });

  it("saves canonical document languages immediately and keeps removal atomic on cancel", async () => {
    const savedStore = {
      schemaVersion: 1,
      sourceLanguage: "en",
      languages: ["en"],
      nextMessageId: 1,
      messages: [],
    };
    evalTS.mockImplementation(
      async (functionName: string, ...params: unknown[]) => {
        if (functionName === "fetchDocSelectors") {
          return {
            groups: [
              { text: "Label", count: 2, signature: "source", styleKeys: [] },
            ],
            styles: [],
            identity: "/project/map.ai",
          };
        }
        if (functionName === "fetchTextTranslationDocument") {
          return {
            identity: "/project/map.ai",
            saved: true,
            data: savedStore,
          };
        }
        if (functionName === "getActiveDocumentIdentity") {
          return "/project/map.ai";
        }
        if (functionName === "saveTextTranslations") {
          Object.assign(savedStore, params[1]);
          return { ok: true, identity: "/project/map.ai" };
        }
        return undefined;
      },
    );

    render(Text);
    await screen.findByRole("button", { name: "Edit text: Label" });
    await userEvent.click(screen.getByRole("button", { name: "Manage" }));
    await userEvent.type(
      screen.getByRole("textbox", { name: "Add document language" }),
      "fr-ca",
    );
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() => {
      expect(savedStore.languages).toEqual(["en", "fr-CA"]);
    });
    expect(evalTS).toHaveBeenCalledWith(
      "saveTextTranslations",
      "/project/map.ai",
      expect.objectContaining({ languages: ["en", "fr-CA"] }),
    );

    await userEvent.click(screen.getByRole("button", { name: "Remove en" }));
    expect(
      screen.getByText(/Which language is the document written in/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(savedStore.sourceLanguage).toBe("en");
    expect(savedStore.languages).toEqual(["en", "fr-CA"]);
  });

  it("retains target drafts and saves structured translations without changing source text", async () => {
    const store = {
      schemaVersion: 1,
      sourceLanguage: "en",
      languages: ["en", "fr", "de"],
      nextMessageId: 1,
      messages: [],
    };
    evalTS.mockImplementation(async (functionName: string) => {
      if (functionName === "fetchDocSelectors") {
        return {
          groups: [
            { text: "Label", count: 2, signature: "source", styleKeys: [] },
          ],
          styles: [],
          identity: "/project/map.ai",
        };
      }
      if (functionName === "fetchTextTranslationDocument") {
        return { identity: "/project/map.ai", saved: true, data: store };
      }
      if (functionName === "getActiveDocumentIdentity") {
        return "/project/map.ai";
      }
      if (functionName === "saveTextTranslations") {
        return { ok: true, identity: "/project/map.ai" };
      }
      if (functionName === "replaceDocText") {
        throw new Error("translation saving must not replace Illustrator text");
      }
      return undefined;
    });

    render(Text);
    await userEvent.click(
      await screen.findByRole("button", { name: "Edit text: Label" }),
    );
    await userEvent.click(screen.getByRole("tab", { name: "Translations" }));

    const target = screen.getByLabelText("Target language");
    await userEvent.type(
      screen.getByRole("textbox", { name: "Translation in fr" }),
      "Salut",
    );
    await userEvent.selectOptions(target, "de");
    await userEvent.type(
      screen.getByRole("textbox", { name: "Translation in de" }),
      "Hallo",
    );
    await userEvent.selectOptions(target, "fr");
    expect(
      screen.getByRole("textbox", { name: "Translation in fr" }),
    ).toHaveValue("Salut");
    await userEvent.click(
      screen.getByRole("button", { name: "Save translations" }),
    );

    await waitFor(() => {
      expect(evalTS).toHaveBeenCalledWith(
        "saveTextTranslations",
        "/project/map.ai",
        expect.objectContaining({
          messages: [
            expect.objectContaining({
              id: "m1",
              sourceText: "Label",
              translations: {
                fr: [{ text: "Salut", styleKey: null }],
                de: [{ text: "Hallo", styleKey: null }],
              },
            }),
          ],
        }),
      );
    });
    expect(evalTS).not.toHaveBeenCalledWith(
      "replaceDocText",
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it("retains translation drafts and keeps the editor open when document saving fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    evalTS.mockImplementation(async (functionName: string) => {
      if (functionName === "fetchDocSelectors") {
        return {
          groups: [
            { text: "Label", count: 2, signature: "source", styleKeys: [] },
          ],
          styles: [],
          identity: "/project/map.ai",
        };
      }
      if (functionName === "fetchTextTranslationDocument") {
        return {
          identity: "/project/map.ai",
          saved: true,
          data: {
            schemaVersion: 1,
            sourceLanguage: "en",
            languages: ["en", "fr"],
            nextMessageId: 1,
            messages: [],
          },
        };
      }
      if (functionName === "getActiveDocumentIdentity") {
        return "/project/map.ai";
      }
      if (functionName === "saveTextTranslations") {
        return { ok: false, reason: "Document could not be saved." };
      }
      return undefined;
    });

    render(Text);
    await userEvent.click(
      await screen.findByRole("button", { name: "Edit text: Label" }),
    );
    await userEvent.click(screen.getByRole("tab", { name: "Translations" }));
    const editor = screen.getByRole("textbox", { name: "Translation in fr" });
    await userEvent.type(editor, "Bonjour");
    await userEvent.click(
      screen.getByRole("button", { name: "Save translations" }),
    );

    expect(
      await screen.findAllByText("Document could not be saved.", {
        selector: '[role="alert"]',
      }),
    ).toHaveLength(2);
    expect(editor).toHaveValue("Bonjour");
    expect(
      screen.getByRole("dialog", { name: "Edit text" }),
    ).toBeInTheDocument();
    expect(evalTS).not.toHaveBeenCalledWith(
      "replaceDocText",
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
    consoleError.mockRestore();
  });

  it("isolates translation metadata between same-named Illustrator documents", async () => {
    let activeDocument = 0;
    const savedIdentities: string[] = [];
    evalTS.mockImplementation(
      async (functionName: string, ...params: unknown[]) => {
        if (functionName === "fetchDocSelectors") {
          activeDocument++;
          return {
            groups: [
              {
                text:
                  activeDocument === 1 ? "First document" : "Second document",
                count: 2,
                signature: `source-${activeDocument}`,
                styleKeys: [],
              },
            ],
            styles: [],
            identity:
              activeDocument === 1 ? "/folder-a/map.ai" : "/folder-b/map.ai",
          };
        }
        if (functionName === "fetchTextTranslationDocument") {
          return {
            identity:
              activeDocument === 1 ? "/folder-a/map.ai" : "/folder-b/map.ai",
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
        if (functionName === "getActiveDocumentIdentity") {
          return activeDocument === 1 ? "/folder-a/map.ai" : "/folder-b/map.ai";
        }
        if (functionName === "saveTextTranslations") {
          savedIdentities.push(params[0] as string);
          return { ok: true, identity: params[0] };
        }
        return undefined;
      },
    );

    render(Text);
    await screen.findByRole("button", { name: "Edit text: First document" });
    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await screen.findByRole("button", { name: "Edit text: Second document" });
    expect(
      screen.queryByRole("button", { name: "Edit text: First document" }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Manage" }));
    await userEvent.type(
      screen.getByRole("textbox", { name: "Add document language" }),
      "fr",
    );
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() => {
      expect(savedIdentities).toEqual(["/folder-b/map.ai"]);
    });
  });

  it("surfaces bridge failures when text cannot be loaded", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    evalTS.mockRejectedValueOnce(new Error("No active document"));

    render(Text);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load Illustrator text: No active document",
    );
    consoleError.mockRestore();
  });
});
