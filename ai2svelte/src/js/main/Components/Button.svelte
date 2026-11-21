<script lang="ts">
  import type { HTMLButtonAttributes } from "svelte/elements";

  interface Props {
    text: string;
    onClick?: () => void;
    disabled?: boolean;
    args?: HTMLButtonAttributes;
    minimal?: boolean;
  }

  let {
    text,
    onClick,
    disabled = false,
    minimal = false,
    args,
  }: Props = $props();
</script>

<button
  class="btn"
  onclick={() => {
    if (onClick) onClick();
  }}
  class:minimal
  {disabled}
  {...args}
>
  {text}
</button>

<style lang="scss">
  @use "../styles/variables.scss" as *;

  button {
    cursor: pointer;
    padding: var(--space-m) var(--space-l);
    color: var(--color-text);
    background-color: var(--color-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    font-size: var(--font-size-sm);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: var(--space-s);
    @include animation-default;
  }

  button:hover:not(:disabled) {
    background-color: var(--color-accent-primary);
    border-color: var(--color-accent-primary);
    color: var(--color-white);
  }

  button:focus-visible {
    outline: 2px solid var(--color-accent-primary);
    outline-offset: 2px;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .minimal {
    cursor: pointer;
    font-weight: 700;
    font-size: var(--font-size-base);
    text-transform: uppercase;
    padding: var(--space-2xs);
    margin: 0;
    letter-spacing: 0;
    border: unset;
    background-color: transparent;
  }
</style>
