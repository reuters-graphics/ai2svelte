<script lang="ts">
  import MapVideo from "./ai2svelte/mapVideo.svelte";
</script>

{#snippet video()}
  <video
    style="width: 100%; height: 100%; object-fit: cover;"
    src={`/videos/gifford_fires.mp4`}
    autoplay
    playsinline
    muted
    loop
  ></video>
{/snippet}

<MapVideo vid={video} />

<style lang="scss">
  :global {
    .headline-wrapper {
      * {
        color: white !important;
      }
    }
  }
</style>
