<script lang="ts">
  import Panorama from "./ai2svelte/chunkedPanorama.svelte";

  // The artboard fills the screen's height (fit_mode: height) and is far wider
  // than the screen, so scrolling down the page pans it sideways.
  let section: HTMLElement | undefined = $state();
  let artboard: HTMLElement | undefined;
  let screenWidth = $state(0);
  let artboardWidth = $state(0);
  let progress = $state(0);
  // Pan position where scrolling starts (0-1), so the headline slot is centred
  // on screen at the top of the page
  let start = $state(0);

  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

  const measure = () => {
    if (artboard) {
      artboardWidth = artboard.offsetWidth;
      const slot = artboard.querySelector<HTMLElement>(
        innerWidth <= 600 ? "#g-snippet-headlinePhone" : "#g-snippet-headline",
      );
      const range = artboardWidth - innerWidth;
      start =
        slot && range > 0
          ? clamp01(
              (slot.offsetLeft + slot.offsetWidth / 2 - innerWidth / 2) / range,
            )
          : 0;
    }
    if (!section) return;
    const scrollable = section.offsetHeight - innerHeight;
    const top = -section.getBoundingClientRect().top;
    progress = scrollable > 0 ? clamp01(top / scrollable) : 0;
  };

  // Whole pixels: a sub-pixel translate can show faint lines between
  // transparent tiles (see the Chunked images docs page).
  let x = $derived(
    Math.round(
      (start + (1 - start) * progress) *
        Math.max(0, artboardWidth - screenWidth),
    ),
  );

  const onArtboardChange = (el: HTMLElement) => {
    artboard = el;
    measure();
  };
</script>

{#snippet headline()}
  <div class="hed">
    <h1>Chunked images</h1>
    <p>
      Scroll to pan across a 9,750-point-wide panorama. Each layer is exported
      as tiles of up to 4,096 pixels.
    </p>
  </div>
{/snippet}

<svelte:window
  bind:innerWidth={screenWidth}
  onscroll={measure}
  onresize={measure}
/>

<section bind:this={section} class="scroller">
  <div class="stage">
    <div class="pan" style:transform="translate3d({-x}px, 0, 0)">
      <Panorama
        assetsPath="/ai2svelte/"
        {headline}
        headlinePhone={headline}
        {onArtboardChange}
      />
    </div>
    <p class="hint" class:done={progress > 0.02}>Scroll ↓</p>
  </div>
</section>

<style lang="scss">
  .scroller {
    // ~1.4px of pan per px of scroll across the 9,750pt artboard
    height: 1100vh;
    background: #160f12;
  }

  .stage {
    position: sticky;
    top: 0;
    height: 100vh;
    overflow: hidden;
  }

  .pan {
    height: 100%;
    width: max-content;
  }

  // The artboard has a headline slot for phones and one for larger screens:
  // show one at a time
  @media (max-width: 600px) {
    .pan :global(.g-headline) {
      display: none;
    }
  }

  @media (min-width: 601px) {
    .pan :global(.g-headlinePhone) {
      display: none;
    }
  }

  .hed {
    // the phone slot is wider than a phone screen
    max-width: calc(100vw - 48px);
    margin: 0 auto;
    color: #fff;
    font-family: system-ui, sans-serif;
    text-shadow: 0 1px 12px rgba(0, 0, 0, 0.45);

    h1 {
      margin: 0 0 0.4em;
      font-size: clamp(1.6rem, 3.2vh, 2.6rem);
      line-height: 1.1;
    }

    p {
      margin: 0;
      font-size: clamp(0.9rem, 1.9vh, 1.15rem);
      line-height: 1.4;
    }
  }

  .hint {
    position: absolute;
    left: 50%;
    bottom: 24px;
    margin: 0;
    transform: translateX(-50%);
    color: #fff;
    font-family: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12.16px;
    letter-spacing: 0.4864px;
    text-transform: uppercase;
    opacity: 0.85;
    transition: opacity 300ms ease;

    &.done {
      opacity: 0;
    }
  }
</style>
