<script lang="ts">
  import { fly } from "svelte/transition";
  import { Select } from "bits-ui";

  export interface DropdownProps {
    options?: Array<string>;
    value: string;
  }

  let { options = [], value = $bindable("Select some option") }: DropdownProps =
    $props();

  // DOM refs for the chaser hover-highlight animation
  let parentContainer: HTMLElement | undefined = $state();
  let hoveredElement: HTMLElement | undefined = $state();
  let chaserElement: HTMLElement | undefined = $state();

  // Track open state so we can rotate the chevron and reset the chaser
  let menuOpen: boolean = $state(false);

  // Move the chaser to follow the currently hovered item
  $effect(() => {
    if (
      hoveredElement &&
      parentContainer &&
      chaserElement instanceof HTMLElement
    ) {
      // Both getBoundingClientRect calls return viewport-relative coordinates,
      // so subtracting parent.top gives the correct relative offset even when
      // the content panel is portalled outside the .dropdown-container.
      chaserElement.style.top =
        hoveredElement.getBoundingClientRect().top -
        parentContainer.getBoundingClientRect().top +
        "px";

      chaserElement.style.height =
        hoveredElement.getBoundingClientRect().height + "px";
    }
  });

  // Reset the chaser to the top of the list whenever the menu opens
  $effect(() => {
    if (parentContainer && menuOpen && chaserElement instanceof HTMLElement) {
      chaserElement.style.top = "0px";
      chaserElement.style.height = "unset";
    }
  });
</script>

<!--
  Select.Root manages:
  - Open/close state (replaces the manual window.addEventListener("click", closeMenu))
  - Keyboard navigation: Arrow keys move through items, Enter selects, Escape closes
  - ARIA: role="combobox" on trigger, role="listbox" on content, role="option" on items
  - Outside-click dismissal without event-listener leaks

  Select.Content uses Floating UI to position the dropdown relative to the trigger.
  The child snippet lets us apply our custom visual structure while bits-ui manages
  mounting/unmounting automatically when the select opens and closes.

  The chaser element (li-selector) is an absolutely-positioned highlight that
  follows the hovered item via getBoundingClientRect offsets — preserved from
  the original implementation.
-->
<div class="dropdown-container">
  <Select.Root
    type="single"
    bind:value
    onOpenChange={(open) => {
      menuOpen = open;
    }}
  >
    <!--
      Select.Trigger renders as a button with aria-expanded and aria-haspopup.
      The child snippet lets us keep our custom value display and chevron layout.
    -->
    <Select.Trigger>
      {#snippet child({ props })}
        <button {...props} class="selected-option">
          <div class="value-display">
            <p class="dropdown-value hidden">{value}</p>
            {#key value}
              <p class="dropdown-value" transition:fly={{ duration: 400, y: 40 }}>
                {value}
              </p>
            {/key}
          </div>
          <p class="chevron" style="rotate:{menuOpen ? '180deg' : '0deg'};">▼</p>
        </button>
      {/snippet}
    </Select.Trigger>

    <!--
      Select.Content auto-mounts when open and unmounts when closed.
      The child snippet provides our custom styled container while preserving
      Floating UI positioning (aligns below the trigger automatically).
    -->
    <!--
      wrapperProps carries `position: absolute` and the Floating UI transform.
      Without rendering this wrapper div, the content lands in normal flow and
      shifts the card layout. props goes on our styled inner div.
    -->
    <Select.Content>
      {#snippet child({ props, wrapperProps })}
        <div {...wrapperProps}>
          <div {...props} class="dropdown-menu">
            <ul bind:this={parentContainer}>
              <!-- Chaser: absolute highlight that slides to the hovered item -->
              <li class="li-selector" bind:this={chaserElement} aria-hidden="true">
                <button tabindex="-1">{value}</button>
              </li>

              {#each options as opt}
                <Select.Item value={opt} label={opt}>
                  {#snippet child({ props: itemProps })}
                    <li
                      {...itemProps}
                      class="li-item"
                      data-active={value === opt}
                      onmouseenter={(e: MouseEvent) =>
                        (hoveredElement =
                          e.currentTarget instanceof HTMLElement
                            ? e.currentTarget
                            : undefined)}
                    >
                      <span>{opt}</span>
                    </li>
                  {/snippet}
                </Select.Item>
              {/each}
            </ul>
          </div>
        </div>
      {/snippet}
    </Select.Content>
  </Select.Root>
</div>

<style lang="scss">
  @use "../styles/variables.scss" as *;

  .dropdown-container {
    position: relative;
  }

  .dropdown-value {
    position: absolute;
    color: var(--color-text);
    top: 0px;
    opacity: 0.5;
    @include animation-default;
  }

  .hidden {
    position: relative;
    opacity: 0;
  }

  .chevron {
    opacity: 0.3;
    @include animation-default;
  }

  .selected-option {
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    border: unset;
    background-color: transparent;
    color: var(--color-text);
    padding: 0px;
    border-radius: var(--space-s);
    cursor: pointer;
    @include animation-default;

    p {
      font-size: var(--font-size-base);
      font-weight: 500;
    }
  }

  .selected-option:hover {
    .dropdown-value {
      opacity: 0.7;
    }
  }

  .dropdown-menu {
    /* Floating UI handles absolute positioning — we provide only visual styles */
    background-color: var(--color-secondary);
    backdrop-filter: blur(4px);
    padding: var(--space-2xs);
    border-radius: var(--space-xs);
    z-index: 3;
    box-shadow:
      0 0 16px rgba(0, 0, 0, 0.2),
      0 0 4px rgba(0, 0, 0, 0.1);
    width: var(--bits-floating-anchor-width);
  }

  ul {
    position: relative;
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .li-item {
    position: relative;
    display: block;
    padding: 0px;
    transition: 0.2s ease;
    z-index: 4;
    cursor: pointer;

    span {
      display: block;
      width: 100%;
      opacity: 0.5;
      padding: var(--space-2xs);
      @include animation-default;
    }
  }

  .li-item:hover {
    span {
      opacity: 0.7;
    }
  }

  .li-item[data-active="true"] {
    color: var(--color-text);

    span {
      opacity: 1 !important;
    }
  }

  .li-selector {
    position: absolute;
    width: 100%;
    background-color: var(--color-tertiary);
    opacity: 0.5;
    border-radius: var(--space-2xs);
    top: 0px;
    z-index: 3;
    color: transparent;
    @include animation-default;

    button {
      all: unset;
      display: block;
      padding: var(--space-2xs);
    }
  }
</style>
