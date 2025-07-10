<script lang="ts">
    import { onMount, untrack } from "svelte";
    import { evalTS } from "../../lib/utils/bolt";

    import PreviewFrame from "../Components/PreviewFrame.svelte";

    import BirdStats from "../example/ai2svelte/bird-stats.svelte";

    onMount(() => {});
</script>

<div class="tab-content">
    <p>Preview</p>
    <PreviewFrame>
        <BirdStats assetsPath={"../../../assets"} />
    </PreviewFrame>
</div>

<style lang="scss">
    .tab-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
</style>
