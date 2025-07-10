<script lang="ts">
    import { onMount } from "svelte";

    interface Props {
        value: string;
    }

    let { value = $bindable() }: Props = $props();

    onMount(() => {});
</script>

<div></div>

<style lang="scss">
    @use "../../variables.scss" as *;
</style>
