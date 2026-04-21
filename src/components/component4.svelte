<script lang="ts">
  import BeforeAfter from "./ai2svelte/beforeAfter.svelte";
  import { onMount } from "svelte";
  import { Tween } from "svelte/motion";

  let progress = new Tween(0, { duration: 100 });
  let afterImage;

  const beforeAfterAttachment = (artboard) => {
    afterImage = artboard.querySelector(`#g-png-layer-after`);
  };

  $effect(() => {
    if (progress.current >= 0 && afterImage) {
      afterImage.style.maskImage = `linear-gradient(to right, black 0%, black ${progress.current * 100 - 1}%, transparent ${progress.current * 100}%)`;
    }
  });
</script>

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

<BeforeAfter
  assetsPath="/ai2svelte/"
  slider={sliderSnippet}
  onArtboardChange={beforeAfterAttachment}
/>
