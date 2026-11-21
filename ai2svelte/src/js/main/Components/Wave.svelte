<script lang="ts">
  import type { Snippet } from "svelte";
  import { WaveController } from "../lib/distortion-waves/controller";
  import { defaultStyle, type WaveType } from "../lib/distortion-waves/model";
  import { triggerWave } from "../stores";
  import { userData } from "../state.svelte";

  let { children }: { children: Snippet } = $props();

  let root: HTMLElement;
  let content: HTMLElement;
  let controller = $state.raw<WaveController>();
  let waveType = $state<WaveType>("vertical");
  const homeStyle = defaultStyle("vertical");

  $effect(() => {
    const c = new WaveController(root, content);
    controller = c;
    return () => c.destroy();
  });

  $effect(() => {
    controller?.update({
      type: waveType,
      waveStyle: homeStyle,
      palette: userData.accentColor || "#dc4300",
    });
  });

  $effect(() => {
    if ($triggerWave && controller) {
      const radial = $triggerWave.dataset.waveType === "center";
      waveType = radial ? "center" : "vertical";
      controller.update({
        type: waveType,
        waveStyle: homeStyle,
        palette: userData.accentColor || "#dc4300",
      });
      controller.play(
        radial
          ? { source: $triggerWave, focus: null }
          : { source: $triggerWave },
      );
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
