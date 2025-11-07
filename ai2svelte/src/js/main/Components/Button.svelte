<script lang="ts">
  interface Props {
    text: string;
    onClick?: () => void;
    disabled?: boolean;
  }

  let { text, onClick, disabled = false }: Props = $props();
</script>

<button
  class="btn"
  onclick={() => {
    if (onClick) onClick();
  }}
  {disabled}
>
  {text}
</button>

<style lang="scss">
  @use "../styles/variables.scss" as *;

  button {
    cursor: pointer;
    padding: 1rem;
    color: var(--color-text);
    background-color: var(--color-primary);
    border: unset;
    font-size: var(--font-size-s);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.2rem;
    margin-bottom: 1rem;
    @include animation-default;
  }

  button:hover {
    background-color: var(--color-accent-primary);
    color: var(--color-white);
  }
</style>
