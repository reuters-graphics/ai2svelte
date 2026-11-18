<script lang="ts">
  import type { Snippet } from "svelte";
  import { WaveController } from "../lib/distortion-waves/controller";
  import { triggerWave } from "../stores";
  import { userData } from "../state.svelte";

  let { children }: { children: Snippet } = $props();

  let root: HTMLElement;
  let content: HTMLElement;
  let controller = $state.raw<WaveController>();

  $effect(() => {
    const c = new WaveController(root, content);
    controller = c;
    return () => c.destroy();
  });

  $effect(() => {
    controller?.update({ palette: userData.accentColor || "#dc4300" });
  });

  $effect(() => {
    if ($triggerWave && controller) {
      controller.play({ source: $triggerWave });
      $triggerWave = null;
    }
  });
</script>

<!-- Flex columns, like #app, so children lay out as if the wave weren't there. -->
<div
  bind:this={root}
  style="display: flex; flex-direction: column; flex: 1; isolation: isolate; margin: -1rem; padding: 1rem"
>
  <div
    bind:this={content}
    style="display: flex; flex-direction: column; flex: 1; min-width: 0; isolation: isolate"
  >
    {@render children()}
  </div>
</div>
