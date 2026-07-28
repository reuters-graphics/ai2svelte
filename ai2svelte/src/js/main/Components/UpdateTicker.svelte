<script lang="ts">
  import { slide } from "svelte/transition";
  import { openLinkInBrowser } from "../../lib/utils/bolt";

  let {
    url,
    version,
    onDismiss = () => {},
  }: {
    url: string | null;
    version: string | null;
    onDismiss?: () => void;
  } = $props();
</script>

<div class="ticker" transition:slide={{ axis: "y", duration: 200 }}>
  <button class="message" onclick={() => url && openLinkInBrowser(url)}>
    {@html `<span style="color: white; font-weight: 500;">${version ? version : "A new version"}</span> is now available.`}
    Download now!
  </button>
  <button
    class="dismiss"
    aria-label="Dismiss update notice"
    onclick={() => onDismiss()}>&times;</button
  >
</div>

<style lang="scss">
  .ticker {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    width: 100%;
    color: var(--color-accent-primary);
    padding: 0.75rem 0.75rem 0.75rem 0.75rem;
    border-radius: 0.25rem;
    margin-bottom: 1rem;

    // Tinted background that follows the user's chosen accent colour.
    // (--color-accent-primary is a plain hex custom property, and CEP's
    // Chromium doesn't support color-mix(), so the tint is a separate
    // low-opacity layer behind the text instead of an alpha color.)
    &::before {
      content: "";
      position: absolute;
      inset: 0;
      background-color: var(--color-accent-primary);
      opacity: 0.2;
      border-radius: inherit;
      z-index: -1;
    }
  }

  .message {
    flex-grow: 1;
    text-align: center;
    background: none;
    border: none;
    padding: 0;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .dismiss {
    background: none;
    border: none;
    color: inherit;
    font-size: 1.1rem;
    line-height: 1;
    cursor: pointer;
    padding: 0 0.25rem;
  }
</style>
