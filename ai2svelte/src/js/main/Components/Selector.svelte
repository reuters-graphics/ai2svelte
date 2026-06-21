<script lang="ts">
  import { RadioGroup } from "bits-ui";
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

<!--
  RadioGroup.Root provides:
  - role="radiogroup" on the container
  - Roving tabindex: arrow keys move focus between items
  - Keyboard selection: Space selects the focused item

  RadioGroup.Item provides role="radio" and aria-checked for each option.
  The child snippet lets us apply the tooltip Svelte action directly on the
  item's button, since Svelte actions cannot be applied to component wrappers.
-->
<RadioGroup.Root bind:value class="radio-group">
  {#each labels as label, index}
    <RadioGroup.Item value={label}>
      {#snippet child({ props })}
        <button
          type="button"
          {...props}
          {...rest}
          class="radio-button"
          data-checked={value === label}
          use:tooltip={{
            ...tooltipSettings,
            content: tooltipDescription[index] ?? "",
          }}
        >
          {label}
        </button>
      {/snippet}
    </RadioGroup.Item>
  {/each}
</RadioGroup.Root>

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
