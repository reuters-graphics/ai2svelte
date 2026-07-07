<script lang="ts">
  import { Slider } from "bits-ui";
  import { Spring } from "svelte/motion";

  export interface RangeProps {
    value: number;
    start?: number;
    end?: number;
    stepper?: number;
    dragging?: boolean;
  }

  let {
    value = $bindable(),
    start = 0,
    end = 100,
    stepper = 1,
    // dragging is bindable so Input.svelte can show/hide the label while the
    // slider is being moved (see data-dragging attribute on the label element)
    dragging = $bindable(false),
  }: RangeProps = $props();

  // Spring drives the fill-bar animation with a soft easing effect.
  // Using length = end - start + 1 preserves the original mapping behaviour
  // (value / length gives a slightly sub-1 fill at max, matching prior design).
  let length = $state(end - start + 1);
  let progress = new Spring(0, {
    stiffness: 0.05,
    damping: 0.5,
  });

  // Keep the Spring target in sync with the slider value so the fill bar
  // animates smoothly on both mouse-drag and keyboard events.
  $effect(() => {
    progress.target = value / length;
  });
</script>

<!--
  Slider.Root manages:
  - Mouse drag anywhere on the track (click-to-jump and continuous drag)
  - Keyboard navigation: Arrow keys step by `step`, Home/End jump to min/max
  - ARIA: role="slider", aria-valuenow/min/max on the thumb
  The Spring fill bar stays as the primary visual affordance;
  the Slider.Thumb is invisible but receives keyboard focus.

  The child snippet replaces the component wrapper with our own <div class="range">
  so that Svelte's scoped CSS can target it directly.
-->
<Slider.Root
  type="single"
  bind:value
  min={start}
  max={end}
  step={stepper}
  onValueChange={() => {
    dragging = true;
  }}
  onValueCommit={() => {
    dragging = false;
  }}
>
  {#snippet child({ props })}
    <div {...props} class="range">
      <!-- Invisible spacer that defines the container's natural height -->
      <p class="pseudo">{value}</p>

      <!-- Track background -->
      <div class="range-slider bg"></div>

      <!-- Filled portion — width animated by the Spring -->
      <div class="range-slider" style="width: {progress.current * 100}%;"></div>

      <!-- Floating value label — repositions itself to stay readable at either end -->
      <p
        class="range-value"
        style="left: {progress.current * 100}%; text-align: {progress.current < 0.5
          ? 'left'
          : 'right'}; transform: translateY(-50%) translateX({progress.current < 0.5
          ? 'calc(4px)'
          : 'calc(-100% - 4px)'}); color: {progress.current < 0.5
          ? 'var(--color-text)'
          : 'var(--color-invert)'}; opacity: {dragging ? 0 : 0.5};"
      >
        {value}
      </p>

      <!--
        Invisible thumb — visually hidden but keyboard-focusable.
        Receives all ARIA slider attributes (role, aria-valuenow, etc.)
        and responds to arrow-key input for accessibility.
      -->
      <Slider.Thumb index={0} class="range-thumb" />
    </div>
  {/snippet}
</Slider.Root>

<style lang="scss">
  @use "../styles/variables.scss" as *;

  .range {
    width: 100%;
    min-width: 120px;
    background-color: transparent;
    border-radius: var(--space-s);
    position: relative;
    cursor: pointer;
  }

  .range:hover {
    .range-value {
      opacity: 1;
    }
  }

  .range-slider {
    position: absolute;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: var(--color-accent-primary);
    border-radius: var(--space-2xs);
    pointer-events: none;
  }

  .bg {
    background-color: var(--color-secondary);
  }

  .range-value {
    position: absolute;
    top: 50%;
    z-index: 2;
    pointer-events: none;
    user-select: none;
    opacity: 0.5;
    font-size: var(--font-size-base);
    font-weight: 800;
    @include animation-default(transform);
    @include animation-default(opacity);
  }

  .pseudo {
    font-size: var(--font-size-base);
    opacity: 0;
    user-select: none;
  }

  /* Make the thumb invisible while keeping it focusable for keyboard users */
  :global(.range-thumb) {
    position: absolute;
    top: 0;
    height: 100%;
    width: 0;
    opacity: 0;
    pointer-events: none;
  }
</style>
