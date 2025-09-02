<script lang="ts">
  import BeforeAfter from "./ai2svelte/beforeAfter.svelte";
  import { onMount } from "svelte";
  import { Tween } from "svelte/motion";

  let progress = new Tween(0, { duration: 100 });
  let afterImage;

  let screenWidth = $state(0);

  const artboard = $derived.by(() => {
    if (screenWidth < 510) {
      return "xs";
    } else if (screenWidth < 660) {
      return "sm";
    } else if (screenWidth < 930) {
      return "md";
    } else if (screenWidth < 1200) {
      return "lg";
    } else {
      return "xl";
    }
  });

  const beforeAfterAttachment = () => {
    afterImage = document.querySelector(`#g-png-after-${artboard}`);
    console.log(afterImage);
  };

  $effect(() => {
    if (progress.current >= 0 && afterImage) {
      afterImage.style.maskImage = `linear-gradient(to right, black 0%, black ${progress.current * 100 - 1}%, transparent ${progress.current * 100}%)`;
    }
  });

  $effect(() => {
    if (screenWidth) {
      beforeAfterAttachment();
    }
  });
</script>

<svelte:window bind:innerWidth={screenWidth} />

{#snippet sliderSnippet()}
  <div style="width: 100%;">
    <input
      type="range"
      id="reveal-slider"
      name="slider"
      min="0"
      max="1"
      step="0.01"
      style="width: 100%;"
      bind:value={progress.target}
    />
  </div>
{/snippet}

<BeforeAfter slider={sliderSnippet} onAiMounted={beforeAfterAttachment} />
