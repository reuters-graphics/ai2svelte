import { describe, expect, it } from "vitest";
import {
  TextHistory,
  createHistoryGrouper,
  historyShortcut,
} from "../textHistory";

const snap = (value: string) => ({
  value,
  selectionStart: value.length,
  selectionEnd: value.length,
});

describe("TextHistory", () => {
  it("merges grouped edits only within the time window and drops redo on a new edit", () => {
    const history = new TextHistory();
    history.reset(snap(""));
    history.record(snap("a"), "insert", 0);
    history.record(snap("ab"), "insert", 500);
    history.record(snap("abc"), "insert", 2000);
    expect(history.undo()?.value).toBe("ab");
    expect(history.undo()?.value).toBe("");
    expect(history.undo()).toBeNull();
    expect(history.redo()?.value).toBe("ab");
    history.record(snap("abX"), null, 3000);
    expect(history.redo()).toBeNull();
    expect(history.undo()?.value).toBe("ab");
  });
});

describe("createHistoryGrouper", () => {
  it("keeps spaces with the word they follow (or lead) and splits deletions from typing", () => {
    const group = createHistoryGrouper();
    const keys = [..." ab c"].map((char) => group("insertText", char));
    expect(new Set(keys.slice(0, 4)).size).toBe(1);
    expect(keys[4]).not.toBe(keys[3]);
    expect(group("deleteContentBackward", null)).toBe("deleteContentBackward");
    expect(group("insertText", "d")).not.toBe(keys[4]);
  });
});

describe("historyShortcut", () => {
  const key = (k: string, mods: Partial<KeyboardEvent> = {}) => ({
    key: k,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    ...mods,
  });

  it("uses Cmd on macOS and Ctrl elsewhere", () => {
    expect(historyShortcut(key("z", { metaKey: true }), true)).toBe("undo");
    expect(historyShortcut(key("z", { ctrlKey: true }), true)).toBeNull();
    expect(
      historyShortcut(key("Z", { metaKey: true, shiftKey: true }), true),
    ).toBe("redo");
    expect(historyShortcut(key("y", { metaKey: true }), true)).toBeNull();
    expect(historyShortcut(key("z", { ctrlKey: true }), false)).toBe("undo");
    expect(historyShortcut(key("y", { ctrlKey: true }), false)).toBe("redo");
    expect(
      historyShortcut(key("z", { ctrlKey: true, altKey: true }), false),
    ).toBeNull();
  });
});
