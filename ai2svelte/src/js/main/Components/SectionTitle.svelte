<script lang="ts">
    import Selector from "./Selector.svelte";

    interface Props {
        title: string;
        labels: Array<string>;
    }

    let {
        title = "title",
        labels = ["label1", "label2"],
        activeValue = $bindable(),
    } = $props();
</script>

<div class="section">
    <p class="title">{title}</p>
    <Selector {labels} bind:value={activeValue} />
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
