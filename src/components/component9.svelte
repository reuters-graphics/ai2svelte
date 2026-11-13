<script lang="ts">
  import Sky from "./ai2svelte/winterSky.svelte";

  // Each star carries its data as data-* attributes, written as notes in
  // Illustrator's Attributes panel. The artboard fills the screen with
  // fit_mode: cover.

  let artboard: HTMLElement | undefined = $state();
  let active: string | null = $state(null);

  const circles = () =>
    Array.from(
      artboard?.querySelectorAll<SVGCircleElement>("circle[data-star]") ?? [],
    );

  let star = $derived(
    circles().find((c) => c.dataset.star === active) ?? null,
  );

  // The nearest star to the pointer, so tiny stars are easy to hit
  function nearest(e: MouseEvent, within: number) {
    let best: string | null = null;
    let bestD = within;
    for (const c of circles()) {
      const b = c.getBoundingClientRect();
      const d = Math.hypot(
        e.clientX - (b.left + b.width / 2),
        e.clientY - (b.top + b.height / 2),
      );
      if (d < bestD) {
        bestD = d;
        best = c.dataset.star!;
      }
    }
    return best;
  }

  // The ring is the circle in the artwork's ring:div layer, with the zoomFade
  // preset from the Styles tab. Move it onto the active star, in percent of
  // the artboard so it follows the artwork as fit_mode: cover resizes it.
  $effect(() => {
    const ring = artboard?.querySelector<HTMLElement>("#g-div-ring-pulse");
    if (!artboard || !ring) return;
    ring.classList.toggle("on", !!star);
    if (!star) return;
    const b = star.getBoundingClientRect();
    const a = artboard.getBoundingClientRect();
    ring.style.left = `${((b.left + b.width / 2 - a.left) / a.width) * 100}%`;
    ring.style.top = `${((b.top + b.height / 2 - a.top) / a.height) * 100}%`;
    ring.style.setProperty("--c", star.getAttribute("fill"));
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
  class="stage"
  onpointermove={(e) => e.pointerType === "mouse" && (active = nearest(e, 32))}
  onpointerleave={() => (active = null)}
  onclick={(e) => (active = nearest(e, 44))}
>
  <Sky assetsPath="/ai2svelte/" onArtboardChange={(el: HTMLElement) => (artboard = el)} />

  {#if star}
    <code class="card" aria-live="polite">
      <span class="label">From Illustrator's Attributes panel</span>
      {#each Object.entries(star.dataset) as [k, v] (k)}
        <span class="row"
          ><span class="k">data-{k}</span>=<span class="v">"{v}"</span></span
        >
      {/each}
    </code>
  {/if}
</div>

<style lang="scss">
  .stage {
    position: relative;
    height: 100vh;
    height: 100svh;
    overflow: hidden;
    background: #03050d;
    -webkit-tap-highlight-color: transparent;
  }

  .stage :global(svg) {
    pointer-events: none;
  }

  // zoomFade animates opacity, so hide the ring with visibility instead
  .stage :global(#g-div-ring-pulse) {
    visibility: hidden;
    pointer-events: none;
    border-color: var(--c, #fff) !important;
  }

  .stage :global(#g-div-ring-pulse.on) {
    visibility: visible;
  }

  .card {
    position: absolute;
    z-index: 2;
    right: 24px;
    bottom: 24px;
    max-width: calc(100% - 48px);
    padding: 10px 12px;
    background: rgba(6, 10, 26, 0.85);
    color: #8d98c0;
    font-family: "Geist Mono", ui-monospace, Menlo, monospace;
    font-size: 11px;
    line-height: 1.6;

    .row {
      display: block;
      // a wrapped value is indented under its own line
      padding-left: 2ch;
      text-indent: -2ch;
    }

    .label {
      display: block;
      margin-bottom: 6px;
      color: #5d6890;
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .k {
      color: #9fb2e6;
    }

    .v {
      color: #f2c879;
    }
  }

  @media (max-width: 719px) {
    .card {
      left: 12px;
      right: 12px;
      bottom: 12px;
      max-width: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .stage :global(#g-div-ring-pulse) {
      animation: none;
    }
  }
</style>
