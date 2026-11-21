<script lang="ts">
  import { fly } from "svelte/transition";
  import { Select } from "bits-ui";

  export interface DropdownProps {
    options?: Array<string>;
    value: string;
    id?: string;
    ariaLabel?: string;
    disabled?: boolean;
    optionLabels?: Record<string, string>;
    onValueChange?: (value: string) => void;
    badge?: string | number;
    actionLabel?: string;
    actionDisabled?: boolean;
    onAction?: () => void;
    portalTarget?: HTMLElement;
    menuAnchor?: HTMLElement;
  }

  let {
    options = [],
    value = $bindable("Select some option"),
    id,
    ariaLabel,
    disabled = false,
    optionLabels = {},
    onValueChange,
    badge,
    actionLabel,
    actionDisabled = false,
    onAction,
    portalTarget,
    menuAnchor,
  }: DropdownProps = $props();

  const ACTION_VALUE = "__dropdown-action__";

  function dropdownTransitionDuration() {
    return typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : 400;
  }

  function optionLabel(option: string) {
    return optionLabels[option] ?? option;
  }

  // DOM refs for the chaser hover-highlight animation
  let parentContainer: HTMLElement | undefined = $state();
  let hoveredElement: HTMLElement | undefined = $state();
  let chaserElement: HTMLElement | undefined = $state();

  // Track open state so we can rotate the chevron and reset the chaser
  let menuOpen: boolean = $state(false);

  // The focus ring (Input's :focus-within) should only show while the pointer
  // is interacting. Bits-ui returns focus to the trigger on close, so release
  // it afterwards. Keyboard use keeps focus.
  let triggerEl: HTMLElement | undefined = $state();
  let pointerOpened = false;

  $effect(() => {
    if (menuOpen || !pointerOpened) return;
    pointerOpened = false;
    const timer = setTimeout(() => triggerEl?.blur(), 0);
    return () => clearTimeout(timer);
  });

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
    {value}
    bind:open={menuOpen}
    {disabled}
    onValueChange={(nextValue) => {
      if (nextValue === ACTION_VALUE) {
        menuOpen = false;
        onAction?.();
        return;
      }
      value = nextValue;
      onValueChange?.(nextValue);
    }}
  >
    <!--
      Select.Trigger renders as a button with aria-expanded and aria-haspopup.
      The child snippet lets us keep our custom value display and chevron layout.
    -->
    <Select.Trigger {id} aria-label={ariaLabel}>
      {#snippet child({ props })}
        <button
          {...props}
          class="selected-option"
          bind:this={triggerEl}
          onpointerdowncapture={() => (pointerOpened = true)}
          onkeydowncapture={() => (pointerOpened = false)}
        >
          <div class="value-display">
            <p class="dropdown-value hidden">{optionLabel(value)}</p>
            {#key value}
              <p
                class="dropdown-value"
                transition:fly={{
                  duration: dropdownTransitionDuration(),
                  y: 40,
                }}
              >
                {optionLabel(value)}
              </p>
            {/key}
          </div>
          {#if badge !== undefined}
            <span class="dropdown-badge">{badge}</span>
          {/if}
          <p class="chevron" style="rotate:{menuOpen ? '180deg' : '0deg'};">
            ▼
          </p>
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
    <Select.Portal to={portalTarget}>
      <Select.Content sideOffset={4} customAnchor={menuAnchor}>
        {#snippet child({ props, wrapperProps })}
          <div {...wrapperProps}>
            <div {...props} class="dropdown-menu portalled">
              <ul bind:this={parentContainer}>
                <!-- Chaser: absolute highlight that slides to the hovered item -->
                <li
                  class="li-selector"
                  bind:this={chaserElement}
                  aria-hidden="true"
                >
                  <button tabindex="-1">{optionLabel(value)}</button>
                </li>

                {#each options as opt (opt)}
                  <Select.Item value={opt} label={optionLabel(opt)}>
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
                        <span>{optionLabel(opt)}</span>
                      </li>
                    {/snippet}
                  </Select.Item>
                {/each}
                {#if actionLabel}
                  <Select.Item
                    value={ACTION_VALUE}
                    label={actionLabel}
                    disabled={actionDisabled}
                  >
                    {#snippet child({ props: itemProps })}
                      <li
                        {...itemProps}
                        class="li-item li-action"
                        onmouseenter={(e: MouseEvent) =>
                          (hoveredElement =
                            e.currentTarget instanceof HTMLElement
                              ? e.currentTarget
                              : undefined)}
                      >
                        <span>{actionLabel}</span>
                      </li>
                    {/snippet}
                  </Select.Item>
                {/if}
              </ul>
            </div>
          </div>
        {/snippet}
      </Select.Content>
    </Select.Portal>
  </Select.Root>
</div>

<style lang="scss">
  @use "../styles/variables.scss" as *;

  .dropdown-container {
    position: relative;
  }

  .dropdown-value {
    position: absolute;
    max-width: 100%;
    overflow: hidden;
    color: var(--color-text-secondary);
    text-overflow: ellipsis;
    top: 0px;
    white-space: nowrap;
    @include animation-default;
  }

  .value-display {
    position: relative;
    flex: 1;
    min-width: 0;
  }

  .dropdown-badge {
    flex-shrink: 0;
    box-sizing: border-box;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    background: var(--color-text-muted);
    color: var(--color-text);
    font-size: var(--font-size-base);
    font-weight: 600;
    line-height: 1.5rem;
    text-align: center;
  }

  .li-action {
    margin-top: var(--space-2xs);
    padding-top: var(--space-2xs);
    border-top: 1px solid var(--color-border);

    span {
      color: var(--color-text);
      font-weight: 600;
    }

    &[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .hidden {
    position: relative;
    opacity: 0;
  }

  .chevron {
    align-self: center;
    flex: 0 0 auto;
    line-height: 1;
    color: var(--color-text-muted);
    transform: translateY(0.15em);
    @include animation-default;
  }

  .selected-option {
    width: 100%;
    display: flex;
    align-items: center;
    flex-direction: row;
    justify-content: space-between;
    gap: var(--space-xs);
    border: unset;
    background-color: transparent;
    color: var(--color-text);
    padding: 0px;
    border-radius: var(--radius-lg);
    cursor: pointer;
    @include animation-default;

    p {
      font-size: var(--font-size-base);
      font-weight: 500;
    }
  }

  .selected-option:hover {
    .dropdown-value,
    .chevron {
      color: var(--color-text);
    }
  }

  .selected-option:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .selected-option:disabled:hover {
    .dropdown-value,
    .chevron {
      color: var(--color-text-secondary);
    }
  }

  .dropdown-menu {
    /* Floating UI handles absolute positioning — we provide only visual styles */
    box-sizing: border-box;
    background-color: var(--color-secondary);
    backdrop-filter: blur(4px);
    padding: var(--space-2xs);
    border: 0.5px solid var(--color-text-muted);
    border-radius: var(--radius-sm);
    z-index: 3;
    box-shadow:
      0 0 16px rgba(0, 0, 0, 0.2),
      0 0 4px rgba(0, 0, 0, 0.1);
    width: var(--bits-floating-anchor-width);
  }

  .dropdown-menu.portalled {
    max-height: var(--bits-select-content-available-height);
    overflow-y: auto;
    overscroll-behavior: contain;
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
    transition: color 0.2s ease;
    z-index: 4;
    cursor: pointer;

    span {
      display: block;
      width: 100%;
      color: var(--color-text-secondary);
      padding: var(--space-xs) var(--space-2xs);
      @include animation-default;
    }
  }

  .li-item:hover {
    span {
      color: var(--color-text);
    }
  }

  .li-item[data-active="true"] {
    color: var(--color-text);

    span {
      color: var(--color-text);
      font-weight: 700;
    }
  }

  .li-selector {
    position: absolute;
    width: 100%;
    background-color: var(--color-text-muted);
    opacity: 0.12;
    border-radius: var(--radius-sm);
    top: 0px;
    z-index: 3;
    color: transparent;
    @include animation-default;

    button {
      all: unset;
      display: block;
      padding: var(--space-xs) var(--space-2xs);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dropdown-value,
    .chevron,
    .selected-option,
    .li-item,
    .li-item span,
    .li-selector {
      transition: none;
    }
  }
</style>
