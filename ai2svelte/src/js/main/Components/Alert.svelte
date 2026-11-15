<script lang="ts">
  import { slide } from "svelte/transition";

  interface Props {
    message: string;
    action?: { label: string; run: () => unknown };
  }

  let { message, action }: Props = $props();
  let busy = $state(false);
</script>

<div class="alert" transition:slide={{ axis: "y", duration: 200 }}>
  {message}
  {#if action}
    <button
      disabled={busy}
      onclick={async () => {
        busy = true;
        try {
          await action.run();
        } finally {
          busy = false;
        }
      }}>{busy ? "Working..." : action.label}</button
    >
  {/if}
</div>

<style lang="scss">
  .alert {
    width: 100%;
    text-align: center;
    background-color: hsl(349 70% 45% / 0.2);
    color: hsl(349 70% 45% / 1);
    padding: 0.25rem 0.25rem 0.35rem 0.25rem;
    border-radius: 0.25rem;
    margin-bottom: 1rem;
  }

  button {
    cursor: pointer;
    margin-left: 0.5rem;
    padding: 0 0.5rem;
    font: inherit;
    font-weight: 700;
    color: inherit;
    background: transparent;
    border: 1px solid currentColor;
    border-radius: 0.25rem;
  }

  button:disabled {
    cursor: wait;
    opacity: 0.6;
  }
</style>
