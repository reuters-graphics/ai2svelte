<script lang="ts">
  import Car from "./ai2svelte/3d.svelte";
  import { onMount } from "svelte";

  onMount(() => {
    import("@google/model-viewer");
  });
</script>

{#snippet engineSnippet()}
  <div class="model-viewer">
    <model-viewer
      src={`/ai2svelte/models/engine.glb`}
      shadow-intensity="0.5"
      camera-controls
      touch-action="pan-y"
      camera-orbit="90deg 90deg 1.2m"
      min-camera-orbit="0deg 0deg 0.5m"
      max-camera-orbit="180deg 180deg 3m"
      poster="https://picsum.photos/200/300"
    ></model-viewer>
  </div>
{/snippet}

{#snippet steeringSnippet()}
  <div class="model-viewer">
    <model-viewer
      src={`/ai2svelte/models/steering-wheel.glb`}
      shadow-intensity="0.5"
      camera-controls
      touch-action="pan-y"
      camera-orbit="90deg 90deg 10m"
      min-camera-orbit="0deg 0deg 1.5m"
      max-camera-orbit="180deg 180deg 10m"
      poster="https://picsum.photos/200/300"
    ></model-viewer>
  </div>
{/snippet}

{#snippet wheelSnippet()}
  <div class="model-viewer">
    <model-viewer
      src={`/ai2svelte/models/wheel.glb`}
      shadow-intensity="0.5"
      camera-controls
      touch-action="pan-y"
      camera-orbit="0deg 90deg 25m"
      min-camera-orbit="0deg 0deg 1.5m"
      max-camera-orbit="180deg 180deg 25m"
      poster="https://picsum.photos/200/300"
    ></model-viewer>
  </div>
{/snippet}

<Car
  assetsPath="/ai2svelte/"
  engine={engineSnippet}
  steering={steeringSnippet}
  wheel={wheelSnippet}
/>

<style lang="scss">
  :global {
    .model-viewer {
      width: 100% !important;
      height: 100% !important;

      model-viewer {
        display: block;
        width: 100% !important;
        height: 100% !important;
      }
    }
  }
</style>
