<script lang="ts">
    import type { Snippet } from "svelte";
    import Selector from "./Selector.svelte";

    interface Props {
        labels: Array<string>;
        activeValue: string;
        tooltipDescription?: Array<string>;
        children: Snippet;
    }

    let {
        labels = ["label1", "label2"],
        tooltipDescription = ["", ""],
        activeValue = $bindable(),
        children,
    }: Props = $props();
</script>

<div class="section">
    <Selector {labels} bind:value={activeValue} {tooltipDescription} />

    {#if children}
        {@render children()}
    {/if}
</div>

<hr />

<style lang="scss">
    @use "../../variables.scss" as *;

    .section {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        width: 100%;
    }
</style>
