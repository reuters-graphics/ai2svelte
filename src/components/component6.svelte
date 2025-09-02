<script lang="ts">
  import Fire from "./ai2svelte/fire.svelte";
  import { onMount } from "svelte";
  import { Block } from "@reuters-graphics/graphics-components";
  import { Tween } from "svelte/motion";

  let screenWidth = $state(0);
  let screenHeight = $state(0);
  let progress = new Tween(0, { duration: 400 });

  let graphicEle = $state(null);
  let graphicHeight = $state(null);

  let swirImage;

  const artboard = $derived.by(() => {
    if (screenWidth < 660) {
      return "xs";
    } else if (screenWidth < 1200) {
      return "md";
    } else {
      return "xl";
    }
  });

  function getSWIRImage() {
    swirImage = document.querySelector(`#g-png-swir-${artboard}`);
    swirImage.style.maskImage = `linear-gradient(to bottom, black 0%, transparent 0%, transparent 100%)`;
  }

  function handleScroll() {
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
    if (artboard) {
      getSWIRImage();
    }
  });
</script>

<svelte:window bind:innerWidth={screenWidth} bind:innerHeight={screenHeight} />

<div bind:this={graphicEle} bind:clientHeight={graphicHeight}>
  <Fire onAiMounted={getSWIRImage} />
</div>

<style lang="scss">
  :global {
  }
</style>
