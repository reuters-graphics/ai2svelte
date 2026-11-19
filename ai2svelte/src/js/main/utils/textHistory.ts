export interface TextSnapshot {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

const COALESCE_MS = 1000;

/**
 * Undo/redo history for a plain text field. The panel keeps its own history
 * because Chromium's native one misses programmatic edits, and on macOS
 * Illustrator's Edit > Undo shortcut can claim Cmd+Z.
 */
export class TextHistory {
  private entries: TextSnapshot[] = [];
  private index = -1;
  private lastGroup: string | null = null;
  private lastTime = 0;

  reset(snapshot: TextSnapshot) {
    this.entries = [snapshot];
    this.index = 0;
    this.lastGroup = null;
  }

  /**
   * Records the field's state after an edit. Consecutive edits with the same
   * group (e.g. typing a word) merge into one undo step.
   */
  record(
    snapshot: TextSnapshot,
    group: string | null = null,
    now = Date.now(),
  ) {
    if (this.index < 0) {
      this.reset(snapshot);
      return;
    }
    if (snapshot.value === this.entries[this.index].value) {
      this.entries[this.index] = snapshot;
      return;
    }
    this.entries.length = this.index + 1;
    const merge =
      group !== null &&
      group === this.lastGroup &&
      now - this.lastTime < COALESCE_MS &&
      this.index > 0;
    if (merge) {
      this.entries[this.index] = snapshot;
    } else {
      this.entries.push(snapshot);
      this.index++;
    }
    this.lastGroup = group;
    this.lastTime = now;
  }

  undo(): TextSnapshot | null {
    if (this.index <= 0) return null;
    this.index--;
    this.lastGroup = null;
    return this.entries[this.index];
  }

  redo(): TextSnapshot | null {
    if (this.index >= this.entries.length - 1) return null;
    this.index++;
    this.lastGroup = null;
    return this.entries[this.index];
  }
}

/**
 * Typing merges per word (a word keeps the spaces after it); deletions merge
 * per run of the same kind. Returns a group key for `TextHistory.record`.
 */
export function createHistoryGrouper() {
  let word = 0;
  let afterSpace = false;
  let hasText = false;
  return (inputType: string, data: string | null): string | null => {
    if (inputType === "insertText" && data) {
      const space = /^\s+$/.test(data);
      if (afterSpace && !space && hasText) {
        word++;
        hasText = false;
      }
      afterSpace = space;
      if (!space) hasText = true;
      return `insert-${word}`;
    }
    afterSpace = false;
    hasText = false;
    word++;
    return inputType.startsWith("delete") ? inputType : null;
  };
}

export type HistoryAction = "undo" | "redo" | null;

export function historyShortcut(
  event: Pick<
    KeyboardEvent,
    "key" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey"
  >,
  isMac: boolean,
): HistoryAction {
  const mod = isMac ? event.metaKey : event.ctrlKey;
  if (!mod || event.altKey) return null;
  const key = event.key.toLowerCase();
  if (key === "z") return event.shiftKey ? "redo" : "undo";
  if (key === "y" && !isMac && !event.shiftKey) return "redo";
  return null;
}
