<script lang="ts">
  import Fire from "./ai2svelte/fire.svelte";
  import { onMount } from "svelte";

  let screenWidth = $state(0);
  let screenHeight = $state(0);
  let progress: number = 0;

  let graphicEle: HTMLDivElement | null | undefined = $state(undefined);
  let graphicHeight: number | undefined = $state(undefined);

  let swirImage: HTMLElement | null | undefined = undefined;
  let activeArtboard: HTMLElement | null | undefined = $state(undefined);

  function getSWIRImage() {
    swirImage = activeArtboard?.querySelector(`.g-png-layer-swir`);
    swirImage?.style.setProperty(
      "mask-image",
      `linear-gradient(to bottom, black 0%, transparent 0%, transparent 100%)`
    );
  }

  function handleScroll() {
    if (!graphicEle || !graphicHeight) return;

    const boundingRect = graphicEle.getBoundingClientRect();
    const top = boundingRect.top;

    if (top < 0) {
      progress = -top / (graphicHeight - screenHeight * 1);
    }

    if (swirImage) {
      swirImage.style.maskImage = `linear-gradient(to bottom, black 0%, black ${progress * 100 - 2}%, transparent ${progress * 100 + 2}%, transparent 100%)`;
    }
  }

  onMount(() => {
    window.addEventListener("scroll", handleScroll);
  });

  $effect(() => {
    if (activeArtboard) {
      getSWIRImage();
    }
  });
</script>

<svelte:window bind:innerWidth={screenWidth} bind:innerHeight={screenHeight} />

<div bind:this={graphicEle} bind:clientHeight={graphicHeight}>
  <Fire assetsPath="/ai2svelte/" bind:activeArtboard />
</div>

<style lang="scss">
  :global {
  }
</style>
