<script lang="ts">
  import { onMount } from "svelte";

  interface Props {
    text: string;
  }

  let { text }: Props = $props();

  onMount(() => {});
</script>

<button class="chip" data-name={text}>{text}</button>

<style lang="scss">
  @use "../styles/variables.scss" as *;

  .chip {
    cursor: pointer;
    flex-grow: 1;
    background-color: var(--color-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    color: var(--color-text);
    font-size: var(--font-size-sm);
    font-weight: 500;
    text-transform: uppercase;
    padding: var(--space-xs) var(--space-m);
    @include animation-default;
  }

  .chip:hover {
    background-color: var(--color-secondary);
  }
</style>
