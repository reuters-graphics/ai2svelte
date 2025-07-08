<script lang="ts">
    import type { Snippet } from "svelte";
    import Selector from "./Selector.svelte";

    interface Props {
        labels: Array<string>;
        activeValue: string;
        children: Snippet;
    }

    let {
        labels = ["label1", "label2"],
        activeValue = $bindable(),
        children,
    }: Props = $props();
</script>

<div class="section">
    <Selector {labels} bind:value={activeValue} />

    {#if children}
        {@render children()}
    {/if}
</div>

<hr />

<style lang="scss">
    @use "../../variables.scss" as *;

    hr {
        width: 100%;
        border: 1px solid $color-charcoal-light;
    }

    .section {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        width: 100%;
    }

    .title {
        font-size: $font-size-sm;
    }
</style>
