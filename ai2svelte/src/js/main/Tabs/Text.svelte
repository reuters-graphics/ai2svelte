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
    parseStyledText,
    styleCloseTag,
    styleOpenTag,
    type StyledSegment,
  } from "../../../shared/styledText";

  interface TextFrameGroup {
    text: string;
    count: number;
    inconsistent?: boolean;
  }

  interface TextStyleInfo {
    id: number;
    font: string;
    size: number;
  }

  interface DocTextData {
    groups: TextFrameGroup[];
    styles: TextStyleInfo[];
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
  let styles = $state<TextStyleInfo[]>([]);
  const SORT_DOCUMENT = "Document order";
  const SORT_COPIES = "Most copies";
  const SORT_ALPHABETICAL = "A–Z";
  const sortOptions = [SORT_DOCUMENT, SORT_COPIES, SORT_ALPHABETICAL];
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
    }
    return entries.map((entry) => entry.row);
  });

  const parsedReplacement = $derived(parseStyledText(replacementText));
  // Every style found in the document can be applied to any text.
  const rowStyles = $derived(styles);
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

  async function refreshText(clearFeedback = true): Promise<boolean> {
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
      const data = (await evalTS("fetchDocSelectors", true)) as
        DocTextData | undefined;
      if (unmounted) return false;
      if (!data || !Array.isArray(data.groups)) {
        throw new Error("No active Illustrator document is available.");
      }
      rows = data.groups
        .filter((group) => group.count > 1)
        .map((group) => ({ ...group }));
      styles = Array.isArray(data.styles) ? data.styles : [];
      return true;
    } catch (error) {
      console.error("[ai2svelte] fetchDocSelectors failed:", error);
      if (!unmounted) {
        errorMessage = `Could not load Illustrator text: ${getErrorMessage(error)}`;
      }
      return false;
    } finally {
      if (!unmounted) loading = false;
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
    revealCount = 0;
    replacementText = row.text;
    historyGroup = createHistoryGrouper();
    replacementHistory.reset({
      value: row.text,
      selectionStart: row.text.length,
      selectionEnd: row.text.length,
    });
    dialogErrorMessage = "";
    replacementDialog?.showModal();
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
    const row = selectedRow;
    if (!row || !window.cep) return;
    try {
      await evalTS("revealDocText", row.text, revealCount++);
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

  async function applyReplacement() {
    const row = selectedRow;
    if (!row || applying || loading || replacementError || !canApply(row)) {
      return;
    }

    applying = true;
    dialogErrorMessage = "";
    try {
      const result = (await evalTS(
        "replaceDocText",
        row.text,
        replacementText,
      )) as TextReplacementResult | undefined;
      if (
        !result ||
        typeof result.updated !== "number" ||
        typeof result.failed !== "number"
      ) {
        throw new Error("Illustrator returned an invalid replacement result.");
      }

      replacementDialog?.close();
      if (!(await refreshText(false))) return;

      if (result.failed > 0) {
        errorMessage = `Updated ${result.updated} text frame(s); ${result.failed} could not be changed.${result.firstError ? ` ${result.firstError}` : ""}`;
      } else if (result.updated === 0) {
        statusMessage = "No matching text frames remained to update.";
      } else {
        statusMessage = `Updated ${result.updated} text frame(s).`;
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

    const handleDocumentChange = () => {
      if (replacementDialog?.open) {
        replacementDialog.close();
      }
      void refreshText();
    };

    csi.addEventListener("documentAfterActivate", handleDocumentChange);
    void refreshText();

    return () => {
      unmounted = true;
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
        onclick={() => refreshText()}
        disabled={loading || applying || !window.cep}
      >
        Refresh
      </button>
    </div>

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
          aria-label="Search repeated text"
          placeholder="Search text…"
          autocomplete="off"
          bind:value={searchText}
          disabled={!window.cep}
        />
      </div>

      {#if rows.length > 0}
        <div class="sort-control">
          <span class="control-label">Sort</span>
          <Dropdown id="text-sort" options={sortOptions} bind:value={sortBy} />
        </div>
      {/if}
    </div>

    {#if rows.length === 0 && !errorMessage}
      <p class="feedback">No matching text found across multiple artboards.</p>
    {:else if filteredRows.length === 0 && !errorMessage}
      <p class="feedback" role="status">No text matches your search.</p>
    {/if}

    {#if errorMessage}
      <p class="feedback error" role="alert">{errorMessage}</p>
    {:else if statusMessage}
      <p class="feedback" role="status">{statusMessage}</p>
    {/if}

    {#if filteredRows.length > 0}
      <ul class="text-list" aria-label="Repeated text">
        {#each filteredRows as row, index (row.text)}
          <li>
            <button
              class="text-card"
              type="button"
              aria-label={`Replace repeated text: ${row.text}`}
              aria-describedby={`text-matches-${index}`}
              onclick={() => openReplacement(row)}
              disabled={applying || loading}
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
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</section>

<Dialog
  title="Replace repeated text"
  titleId="replacement-title"
  bind:element={replacementDialog}
  busy={applying}
  onclose={() => {
    selectedRow = null;
    dialogErrorMessage = "";
  }}
>
  {#if selectedRow}
    <div class="label-row">
      <p class="dialog-label">Original text</p>
      {#if selectedRow.inconsistent}
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
    <p class="original-text">{@render styledText(selectedRow.text, true)}</p>
    <div class="label-row replacement-label">
      <label class="dialog-label" for="replacement-text">Replacement text</label
      >
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
    <textarea
      id="replacement-text"
      aria-label="Replacement text"
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
      disabled={applying}></textarea>
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
            disabled={applying}
          >
            {style.id}
          </button>
        {/each}
      </div>
    {/if}
    {#if replacementError}
      <p class="feedback error" role="alert">{replacementError}</p>
    {:else if replacementText !== selectedRow.text}
      <p class="dialog-label">Preview</p>
      <p class="original-text preview">
        {@render styledText(replacementText)}
      </p>
    {/if}
    {#if dialogErrorMessage}
      <p class="feedback error" role="alert">{dialogErrorMessage}</p>
    {/if}
  {/if}
  {#snippet actions()}
    {#if selectedRow}
      <button
        class="dialog-button"
        type="button"
        onclick={closeReplacement}
        disabled={applying}
      >
        Cancel
      </button>
      <button
        class="dialog-button primary"
        type="button"
        onclick={applyReplacement}
        disabled={applying || !!replacementError || !canApply(selectedRow)}
      >
        {applying ? "Applying…" : `Apply to ${selectedRow.count} frames`}
      </button>
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

  .text-list {
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: 0;
    overflow: auto;
    list-style: none;
    overscroll-behavior: contain;
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
    opacity: 0.75;
    font-size: var(--font-size-sm);
    text-transform: uppercase;
  }

  .original-text {
    max-height: 8rem;
    overflow: auto;
    margin: var(--space-xs) 0 var(--space-m);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-family: "Inter", sans-serif;
  }

  .label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-xs);
    min-height: 1.75rem;
  }

  .replacement-label {
    margin-top: var(--space-l);
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

  .preview {
    margin-bottom: 0;
  }
</style>
