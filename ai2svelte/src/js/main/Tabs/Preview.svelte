<script lang="ts">
    import { onMount, untrack } from "svelte";

    import { settingsObject } from "../stores";

    import PreviewFrame from "../Components/PreviewFrame.svelte";

    import BirdStats from "../example/ai2svelte/bird-stats.svelte";

    import { csi } from "../../lib/utils/bolt";

    import { Spring } from "svelte/motion";

    let PreviewComponent = $state();

    let previewWidth = new Spring(800);
    let previewHeight = new Spring(400);

    onMount(async () => {
        console.log($settingsObject);

        if (window.cep) {
            getSvelteFile();
        }
    });

    // dynamically imports svelte file
    // from extension's internal 'writable' folder
    async function getSvelteFile() {
        const extensionPath = csi.getSystemPath("extension");
        const writablePath = extensionPath + "/writable/";
        const filePath = writablePath + "preview.svelte";

        setTimeout(async () => {
            const component = (await import(filePath)).default;
            PreviewComponent = component;
        }, 1000);
    }
</script>

<div class="tab-content">
    <PreviewFrame {previewWidth} {previewHeight}>
        {#if PreviewComponent}
            <PreviewComponent />
        {:else}
            <BirdStats assetsPath={"../../../assets"} />
        {/if}
    </PreviewFrame>
</div>

<style lang="scss">
    .tab-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    :global {
        .g-aiSnippet {
            outline: 2px solid #ffffff44;
            background-color: rgba(0, 0, 0, 0.2) !important;
            backdrop-filter: blur(4px);
        }

        .g-aiSnippet::after {
            content: "SNIPPET";
            position: absolute;
            padding: 8px;
            text-align: center;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: var(--font-size-base);
        }
    }
</style>
