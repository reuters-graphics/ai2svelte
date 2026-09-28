<script lang="ts">
  import Scene from "./FluidSimulationScene.svelte";
  import type { ComponentProps } from "svelte";

  type SceneProps = ComponentProps<typeof Scene>;

  interface Props {
    class?: string;
    dissipation?: SceneProps["dissipation"];
    pointerSize?: SceneProps["pointerSize"];
    startColor?: SceneProps["startColor"];
    endColor?: SceneProps["endColor"];
    midColor1?: SceneProps["midColor1"];
    midColor2?: SceneProps["midColor2"];
    colorEase?: SceneProps["colorEase"];
    velocityDissipation?: SceneProps["velocityDissipation"];
    pressureIterations?: SceneProps["pressureIterations"];
    ditherLevels?: SceneProps["ditherLevels"];
    ditherPixelSize?: SceneProps["ditherPixelSize"];
    debugAutoPlay?: SceneProps["debugAutoPlay"];
    bloomEnabled?: SceneProps["bloomEnabled"];
    bloomThreshold?: SceneProps["bloomThreshold"];
    bloomIntensity?: SceneProps["bloomIntensity"];
    bloomRadius?: SceneProps["bloomRadius"];
    resolutionScale?: SceneProps["resolutionScale"];
  }

  let {
    class: className = "",
    dissipation = 0.95,
    pointerSize = 0.0025,
    startColor = "#dc3e00",
    endColor = "#6f0000",
    midColor1 = "#9c0c81",
    midColor2 = "#4e0bac",
    colorEase = [0.03, 0.6, 0.48, 1],
    velocityDissipation = 0.98,
    pressureIterations = 24,
    ditherLevels = 2,
    ditherPixelSize = 4,
    debugAutoPlay = false,
    bloomEnabled = true,
    bloomThreshold = 0.6,
    bloomIntensity = 1,
    bloomRadius = 0.2,
    resolutionScale = 1,
  }: Props = $props();
</script>

<div class="fluid-wrapper {className}">
  <div class="fluid-inner">
    <Scene
      {dissipation}
      {pointerSize}
      {startColor}
      {endColor}
      {midColor1}
      {midColor2}
      {colorEase}
      {velocityDissipation}
      {pressureIterations}
      {ditherLevels}
      {ditherPixelSize}
      {debugAutoPlay}
      {bloomEnabled}
      {bloomThreshold}
      {bloomIntensity}
      {bloomRadius}
      {resolutionScale}
    />
  </div>
</div>

<style>
  .fluid-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  .fluid-inner {
    position: absolute;
    inset: 0;
    z-index: 0;
  }
</style>
