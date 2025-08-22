<script lang="ts">
  import type { Snippet } from "svelte";
  import Selector from "./Selector.svelte";

  interface Props {
    labels: Array<string>;
    activeTab: string;
    tooltipDescription?: Array<string>;
    formats: Array<string>;
    formatTooltipDescription?: Array<string>;
    activeFormat: string;
  }

  let {
    labels = ["label1", "label2"],
    tooltipDescription = ["", ""],
    activeTab = $bindable(),
    formats = ["format1", "format2"],
    activeFormat = $bindable(),
    formatTooltipDescription = ["", ""],
  }: Props = $props();
</script>

<div class="section">
  <Selector {labels} bind:value={activeTab} {tooltipDescription} />

  {#if formats}
    <Selector
      labels={formats}
      bind:value={activeFormat}
      tooltipDescription={formatTooltipDescription}
    />
  {/if}
</div>

<hr />

<style lang="scss">
  @use "../styles/variables.scss" as *;

  .section {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
  }
</style>
