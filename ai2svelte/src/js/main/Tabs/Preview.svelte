<!-- show snippet name instead of generic 'snippet' -->

<script lang="ts">
    // SVELTE IMPORTS
    import { onMount, type Component } from "svelte";
    import { Spring } from "svelte/motion";
    import PreviewFrame from "../Components/PreviewFrame.svelte";

    // DATA IMPORTS
    import { settingsObject, stylesString } from "../stores";

    // BOLT IMPORTS
    import { csi } from "../../lib/utils/bolt";
    import { evalTS } from "../../lib/utils/bolt";

    // OTHER IMPORTS
    // @ts-ignore
    import BirdStats from "../example/ai2svelte/bird-stats.svelte";

    let PreviewComponent: Component | undefined = $state();

    let previewWidth: Spring<number> = new Spring(800);
    let previewHeight: Spring<number> = new Spring(400);

    onMount(async () => {
        previewWidth.target = window.innerWidth;
        previewHeight.target = 0.8 * window.innerHeight;

        if (window.cep) {
            loadPreview();
            getSvelteFile();
        }
    });

    /**
     * Runs the ai2svelte script with the preview settings
     *
     * @async
     * @returns {Promise<void>} Resolves when the preview has been loaded.
     */
    async function loadPreview() {
        const extensionPath = csi.getSystemPath("extension");
        const writablePath = extensionPath + "/writable/";

        // run ai2svelte script with preview settings
        await evalTS(
            "runPreview",
            {
                settings: $settingsObject,
                code: { css: $stylesString },
            },
            writablePath,
        );
    }

    /**
     * Asynchronously loads a Svelte component from a writable file path and assigns it to `PreviewComponent`.
     *
     * @async
     * @returns {Promise<void>} Resolves when the component is imported and assigned.
     */
    async function getSvelteFile() {
        const extensionPath = csi.getSystemPath("extension");
        const writablePath = extensionPath + "/writable/";
        const filePath = writablePath + "preview.svelte";

        setTimeout(async () => {
            const component = (await import(/* @vite-ignore */ filePath))
                .default;
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
