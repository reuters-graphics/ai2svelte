<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    title: string;
    titleId: string;
    element?: HTMLDialogElement;
    busy?: boolean;
    onclose?: () => void;
    children: Snippet;
    actions: Snippet;
    utility?: Snippet;
  }

  let {
    title,
    titleId,
    element = $bindable(),
    busy = false,
    onclose,
    children,
    actions,
    utility,
  }: Props = $props();
</script>

<dialog
  bind:this={element}
  aria-labelledby={titleId}
  aria-busy={busy}
  {onclose}
  oncancel={(event) => {
    if (busy) event.preventDefault();
  }}
>
  <header>
    <h2 id={titleId}>{title}</h2>
  </header>
  <div class="dialog-body">{@render children()}</div>
  <footer>
    {#if utility}
      <div class="dialog-utility">{@render utility()}</div>
    {/if}
    <div class="dialog-actions">{@render actions()}</div>
  </footer>
</dialog>

<style lang="scss">
  dialog {
    position: fixed;
    inset: 0;
    margin: auto;
    box-sizing: border-box;
    width: min(28rem, calc(100vw - 2rem));
    max-height: calc(100vh - 2rem);
    padding: 0;
    overflow: visible;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-secondary);
    color: var(--color-text);
    box-shadow: 0 var(--space-m) var(--space-2xl) #0006;
    font-family: inherit;
    font-size: var(--font-size-base);
    line-height: 1.5;
  }

  dialog[open] {
    display: flex;
    flex-direction: column;
  }

  dialog::backdrop {
    background: #0009;
  }

  header,
  footer {
    flex-shrink: 0;
    padding: var(--space-m) var(--space-m);
  }

  header {
    border-bottom: 1px solid var(--color-border);
  }

  h2 {
    margin: 0;
    font-size: var(--font-size-base);
    font-weight: 500;
    line-height: 1.4;
    text-transform: uppercase;
    letter-spacing: 0.1rem;
  }

  .dialog-body {
    min-height: 0;
    padding: var(--space-m) var(--space-m);
    overflow: auto;
    overscroll-behavior: contain;
    overflow-wrap: anywhere;
  }

  footer {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-xs);
    border-top: 1px solid var(--color-border);
  }

  .dialog-utility {
    order: 1;
    min-width: 0;
    max-width: 100%;
  }

  .dialog-actions {
    display: flex;
    flex-direction: column-reverse;
    gap: var(--space-s);
    min-width: 0;
    max-width: 100%;
  }

  footer :global(.dialog-button) {
    width: 100%;
  }

  dialog :global(.dialog-link) {
    box-sizing: border-box;
    width: 100%;
    min-height: 2.5rem;
    padding: var(--space-m);
    border: 1px solid var(--color-border);
    border-radius: 0;
    background: var(--color-primary);
    color: var(--color-text);
    font: inherit;
    font-size: var(--font-size-sm);
    line-height: 1.4;
    text-transform: uppercase;
    letter-spacing: 0.1rem;
    cursor: pointer;
  }

  dialog :global(.dialog-link:hover) {
    background: var(--color-text-muted);
  }

  dialog :global(.dialog-button) {
    box-sizing: border-box;
    min-height: 2.5rem;
    max-width: 100%;
    padding: var(--space-m);
    border: 0;
    border-radius: 0;
    background: var(--color-primary);
    color: var(--color-text);
    font: inherit;
    font-size: var(--font-size-sm);
    line-height: 1.4;
    text-transform: uppercase;
    letter-spacing: 0.1rem;
    cursor: pointer;
    overflow-wrap: anywhere;
  }

  dialog :global(.dialog-button.primary) {
    background: var(--color-accent-primary);
    color: var(--color-white);
  }

  dialog :global(.dialog-button.danger) {
    color: var(--color-text);
    box-shadow: inset 0 0 0 1px var(--color-accent-primary);
  }

  dialog :global(.dialog-button:hover:not(:disabled)) {
    background: var(--color-text-muted);
  }

  dialog :global(.dialog-button.primary:hover:not(:disabled)) {
    background: var(--color-accent-primary);
    filter: brightness(1.1);
  }

  dialog :global(:focus-visible) {
    outline: 2px solid var(--color-accent-primary);
    outline-offset: 3px;
  }

  dialog :global(.dialog-button:disabled) {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (min-width: 480px) {
    .dialog-actions {
      flex-direction: row;
    }

    footer :global(.dialog-actions .dialog-button) {
      flex: 1;
      width: auto;
    }
  }
</style>
