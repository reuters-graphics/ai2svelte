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

    hr {
        width: 100%;
        border: 1px solid $color-charcoal-light;
        margin: 0;
    }

    .section {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        width: 100%;
    }

    .title {
        text-transform: uppercase;
        font-size: $font-size-sm;
        letter-spacing: calc(1rem * 0.1);
        font-family: "Geist Mono";
        font-weight: 500;
    }
</style>
