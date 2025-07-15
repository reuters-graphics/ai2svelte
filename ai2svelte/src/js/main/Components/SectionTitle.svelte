<script lang="ts">
    import Selector from "./Selector.svelte";

    interface Props {
        title: string;
        labels?: Array<string>;
        activeValue?: string;
    }

    let {
        title = "title",
        labels,
        activeValue = $bindable(),
    }: Props = $props();
</script>

<div class="section">
    <p class="title">{title}</p>

    {#if labels}
        <Selector {labels} bind:value={activeValue} />
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

    .title {
        text-transform: uppercase;
        font-size: var(--font-size-base);
        letter-spacing: calc(1rem * 0.1);
        font-weight: 500;
        user-select: none;
    }
</style>
