<script lang="ts">
  import Selector from "./Selector.svelte";

  interface Props {
    title: string;
    labels?: Array<string>;
    activeValue?: string;
    tooltipDescription?: Array<string>;
  }

  let {
    title = "title",
    labels,
    tooltipDescription,
    activeValue = $bindable(),
  }: Props = $props();
</script>

<div class="section">
  <p class="title">{title}</p>

  {#if labels}
    <Selector {labels} bind:value={activeValue} {tooltipDescription} />
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

  .title {
    text-transform: uppercase;
    font-size: var(--font-size-lg);
    letter-spacing: calc(1rem * 0.1);
    font-weight: 500;
    user-select: none;
  }
</style>
