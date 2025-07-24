<script lang="ts">
    import { onMount } from "svelte";
    import { fly } from "svelte/transition";
    import logoType from "../../public/logotype.svg";

    let { loaded = $bindable(false) } = $props();

    let mounted: boolean = $state(false);

    onMount(() => {
        mounted = true;

        setTimeout(() => {
            loaded = true;
        }, 1000);
    });
</script>

<div id="logotype-container">
    {#if mounted}
        <div transition:fly={{ y: 50 }}>
            <img
                class="logotype"
                src={logoType}
                alt="ai2svelte logotype"
                style="
                opacity: {loaded == false ? 0.3 : 0.1};
            "
            />
        </div>
    {/if}
</div>

<style lang="scss">
    #logotype-container {
        position: absolute;
        width: 100%;
        height: 100%;
        overflow: hidden;
        pointer-events: none;

        div {
            width: 100%;
            height: 100%;
        }

        .logotype {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 72vw;
            opacity: 0.3;
            transition:
                0.8s all cubic-bezier(0.39, 0.575, 0.565, 1),
                0s width ease,
                0.3s opacity ease;
        }

        .logotype:hover {
            opacity: 0.5 !important;
        }
    }
</style>
