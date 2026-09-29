<!--
  Fluid simulation sized to sit behind a section.

  The simulation is a WebGL canvas that runs an idle wandering preview until
  the pointer first moves across it, so it animates on its own as a backdrop
  and picks up the cursor when someone reaches it.
-->
<script lang="ts">
  import { onMount } from "svelte";
  import FluidSimulation from "./FluidSimulation.svelte";

  interface Props {
    /** Color of freshly injected dye. Defaults to the page accent. */
    startColor?: string;
  }

  let { startColor = "#dc4300" }: Props = $props();

  let mounted = $state(false);
  let reducedMotion = $state(false);
  let resolutionScale = $state(1);

  onMount(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion = motion.matches;

    // Halve the simulation grid on phones. The canvas stays the same size,
    // this just cuts how much GPU work each frame costs.
    resolutionScale = window.matchMedia("(max-width: 640px)").matches ? 0.5 : 1;
    mounted = true;

    const onMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
    };

    motion.addEventListener("change", onMotionChange);
    return () => motion.removeEventListener("change", onMotionChange);
  });
</script>

<div class="fluid-backdrop" aria-hidden="true">
  {#if mounted && !reducedMotion}
    <FluidSimulation {startColor} {resolutionScale} />
  {/if}
</div>

<style>
  /* Always rendered, even before mount and under reduced motion. The island
     needs an element child from the server: `client:visible` observes the
     island's children, so with none it never reads as visible and the
     simulation would never start. */
  .fluid-backdrop {
    position: absolute;
    inset: 0;
  }
</style>
