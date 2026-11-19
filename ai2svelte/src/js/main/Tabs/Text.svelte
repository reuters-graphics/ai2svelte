<script lang="ts">
  import { onMount, tick } from "svelte";
  import { tooltip } from "svooltip";
  import Dialog from "../Components/Dialog.svelte";
  import { tooltipSettings } from "../utils/utils";
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
  }

  let rows = $state<TextFrameGroup[]>([]);
  let searchText = $state("");
  let styles = $state<TextStyleInfo[]>([]);
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

  const loadingMessages = [
    "Finding all texts…",
    "Rounding up your words…",
    "Interrogating text frames…",
    "Counting characters, one by one…",
    "Teaching Illustrator to read…",
    "Hunting for look-alike text…",
  ];
  let loadingMessageIndex = $state(0);

  $effect(() => {
    if (!loading) return;
    loadingMessageIndex = 0;
    const timer = setInterval(() => {
      loadingMessageIndex = (loadingMessageIndex + 1) % loadingMessages.length;
    }, 2500);
    return () => clearInterval(timer);
  });

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
  const filteredRows = $derived(
    searchQuery
      ? searchableRows
          .filter((entry) => entry.text.includes(searchQuery))
          .map((entry) => entry.row)
      : rows,
  );

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

  function styleHue(id: number) {
    return Math.round((id * 137.5) % 360);
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
    // Let the tab paint its loading state before Illustrator gets busy scanning.
    await tick();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    if (unmounted) {
      loading = false;
      return false;
    }
    try {
      const data = (await evalTS("fetchDocSelectors")) as
        DocTextData | undefined;
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
      errorMessage = `Could not load Illustrator text: ${getErrorMessage(error)}`;
      return false;
    } finally {
      loading = false;
    }
  }

  function openReplacement(row: TextFrameGroup) {
    if (applying || loading) return;
    selectedRow = row;
    revealCount = 0;
    replacementText = row.text;
    dialogErrorMessage = "";
    replacementDialog?.showModal();
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
  }

  async function applyReplacement() {
    const row = selectedRow;
    if (
      !row ||
      applying ||
      loading ||
      replacementError ||
      replacementText === row.text
    ) {
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

{#snippet styledText(text: string, reveal: boolean = false)}
  {#each toSegments(text) as segment, index (index)}
    {#if segment.styleId === null}{segment.text}{:else if reveal}<span
        class="styled clickable"
        style:--style-hue={styleHue(segment.styleId)}
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
        >{segment.text}</span
      >{:else}<span
        class="styled"
        style:--style-hue={styleHue(segment.styleId)}
        title={styleTitle(segment.styleId)}
        ><span class="style-tag" aria-hidden="true">{segment.styleId}</span
        >{segment.text}</span
      >{/if}
  {/each}
{/snippet}

<section class="text-tab">
  <div class="toolbar">
    <p>Update identical text frames together in the active document.</p>
    <button
      class="refresh-button"
      type="button"
      onclick={() => refreshText()}
      disabled={loading || applying || !window.cep}
    >
      Refresh
    </button>
  </div>

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

  {#if loading}
    <p class="feedback loading" role="status">
      <span class="spinner" aria-hidden="true"></span>
      {loadingMessages[loadingMessageIndex]}
    </p>
  {:else if rows.length === 0 && !errorMessage}
    <p class="feedback">No repeated text found in the active document.</p>
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
            <span id={`text-matches-${index}`} hidden>{row.count} matches</span>
            <span class="card-text">{@render styledText(row.text)}</span>
          </button>
        </li>
      {/each}
    </ul>
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
    <p class="dialog-label">Original text</p>
    <p class="original-text">{@render styledText(selectedRow.text, true)}</p>
    <div class="replacement-label">
      <label class="dialog-label" for="replacement-text">Replacement text</label
      >
      {#if rowStyles.length > 0}
        <button
          class="style-help"
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
      rows="4"
      disabled={applying}></textarea>
    {#if rowStyles.length > 0}
      <div class="style-chips" role="group" aria-label="Apply style">
        {#each rowStyles as style (style.id)}
          <button
            class="style-chip"
            type="button"
            style:--style-hue={styleHue(style.id)}
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
        disabled={applying ||
          !!replacementError ||
          replacementText === selectedRow.text}
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

  .search-field {
    position: relative;
    flex-shrink: 0;
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
    display: flex;
    align-items: center;
    gap: var(--space-s);
  }

  .spinner {
    flex-shrink: 0;
    width: 1em;
    height: 1em;
    border: 2px solid var(--color-secondary);
    border-top-color: var(--color-accent-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
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

  .card-text {
    display: block;
    width: 100%;
    min-width: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
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
    font-family: "Geist Mono", monospace;
  }

  .replacement-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-xs);
    margin-top: var(--space-l);
  }

  .style-help {
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

  .style-help:hover,
  .style-help:focus-visible {
    color: var(--color-text);
    background: var(--color-primary);
  }

  .styled {
    border-radius: 2px;
    background: hsl(var(--style-hue) 70% 55% / 0.3);
    box-shadow: inset 0 -2px hsl(var(--style-hue) 70% 55%);
  }

  .style-tag {
    margin-right: 2px;
    padding: 0 3px;
    border-radius: 2px;
    background: hsl(var(--style-hue) 70% 45%);
    color: var(--color-white);
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
    background: hsl(var(--style-hue) 70% 55% / 0.3);
    color: hsl(var(--style-hue) 100% 85%);
    font: inherit;
    font-size: var(--font-size-base);
    font-variant-numeric: tabular-nums;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    max-width: 100%;
  }

  .style-chip:hover:not(:disabled) {
    background: hsl(var(--style-hue) 70% 55% / 0.4);
  }

  .style-chip:active:not(:disabled) {
    background: hsl(var(--style-hue) 70% 55% / 0.5);
  }

  .style-chip:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .preview {
    margin-bottom: 0;
  }
</style>
