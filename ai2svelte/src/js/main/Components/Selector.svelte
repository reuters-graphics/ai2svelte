<script lang="ts">
  import { tooltip } from "svooltip";
  import { tooltipSettings } from "../utils/utils";

  interface Props {
    labels: Array<string>;
    value: string;
    tooltipDescription: Array<string>;
  }

  let {
    labels = ["text", "text"],
    value = $bindable(),
    tooltipDescription = ["", ""],
    ...rest
  }: Props = $props();
</script>

{#snippet button(label: string, tooltipDescription: string)}
  <button
    type="button"
    class="radio-button"
    data-checked={value == label}
    aria-pressed={value == label}
    onclick={() => (value = label)}
    {...rest}
    use:tooltip={{
      ...tooltipSettings,
      content: tooltipDescription,
    }}
  >
    <input
      type="radio"
      name="format-choice"
      id={"radio-" + label}
      value={label}
      checked={value == label}
      tabindex="-1"
      aria-hidden="true"
      style="position: absolute; opacity: 0; pointer-events: none;"
    />{label}</button
  >
{/snippet}

<div class="radio-group">
  {#each labels as label, index}
    {@render button(label, tooltipDescription[index])}
  {/each}
</div>

<style lang="scss">
  @use "../styles/variables.scss" as *;

  .radio-group {
    display: flex;
    flex-direction: row;
    gap: 8px;
  }

  .radio-button {
    cursor: pointer;
    font-size: var(--font-size-lg);
    font-weight: 600;
    opacity: 0.3;
    border: unset;
    background-color: unset;
    color: var(--color-text);
    padding: 0;
    margin: 0;
    text-transform: uppercase;
    user-select: none;
    @include animation-default;
  }

  .radio-button:hover {
    opacity: 0.7;
  }

  .radio-button[data-checked="true"] {
    opacity: 1;
  }
</style>
