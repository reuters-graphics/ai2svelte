<script lang="ts">
  export interface TextProps {
    label: string;
    value: string;
  }

  let { label = "title", value = $bindable("text") }: TextProps = $props();
</script>

<input
  id={`select-${label}`}
  class="option-text"
  type="text"
  bind:value
  required
  onkeydown={(e) => {
    // Enter/Escape end the interaction, so the field's focus ring clears.
    if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
  }}
/>

<style lang="scss">
  @use "../styles/variables.scss" as *;

  .option-text {
    padding: 0;
    background-color: transparent;
    border: unset;
    color: var(--color-text-secondary);
    font-size: var(--font-size-base);
    caret-color: var(--color-accent-primary);
    @include animation-default;
  }

  .option-text:focus {
    border: unset;
    outline: unset;
    color: var(--color-text);
  }
</style>
