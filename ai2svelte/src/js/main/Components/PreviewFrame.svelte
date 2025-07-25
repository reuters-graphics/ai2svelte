<script lang="ts">
    import { onMount } from "svelte";
    import { Spring } from "svelte/motion";
    import { tooltip } from "svooltip";
    import { tooltipSettings } from "../utils/utils";

    interface Props {
        children?: unknown;
        previewWidth: Spring<number>;
        previewHeight: Spring<number>;
    }

    let {
        children,
        previewWidth = $bindable(new Spring(640)),
        previewHeight = $bindable(new Spring(640)),
    }: Props = $props();

    let draggingY = $state(false);
    let draggingX = $state(false);
    let eleRect: DOMRect | undefined = $state();

    onMount(() => {});

    function handleResize(e: MouseEvent) {
        if (draggingX) {
            previewWidth.target = e.pageX;
        }

        if (draggingY) {
            previewHeight.target = e.pageY;
        }
    }

    function releaseDrag(e: MouseEvent) {
        draggingX = false;
        draggingY = false;
    }
</script>

<svelte:window onmousemove={handleResize} onmouseup={releaseDrag} />

<div
    class="preview-container"
    style="width: {previewWidth.current}px; height: {previewHeight.current}px; cursor: {draggingX ||
    draggingY
        ? 'grabbing'
        : 'default'};"
>
    <div class="frame-flex">
        <div class="frame-container" bind:contentRect={eleRect}>
            <div class="preview-frame">
                {@render children?.()}
            </div>
            <p
                class="debug-info"
                style="opacity: {previewWidth.target == previewWidth.current &&
                previewHeight.target == previewHeight.current
                    ? 0
                    : 1};"
            >
                {Math.round(eleRect?.width) + "px"} x {Math.round(
                    eleRect?.height,
                ) + "px"}
            </p>
        </div>

        <button
            class="preview-thumb-vertical"
            aria-label="Resize preview"
            onmousedown={(e) => {
                draggingY = true;
            }}
            onmousemove={(e) => handleResize(e)}
            style="cursor: {draggingY ? 'grabbing' : 'grab'};"
            use:tooltip={{
                ...tooltipSettings,
                placement: "bottom",
                content: "Resize height",
            }}
        >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                ><path
                    fill="var(--color-tertiary)"
                    d="M9,3H11V5H9V3M13,3H15V5H13V3M9,7H11V9H9V7M13,7H15V9H13V7M9,11H11V13H9V11M13,11H15V13H13V11M9,15H11V17H9V15M13,15H15V17H13V15M9,19H11V21H9V19M13,19H15V21H13V19Z"
                /></svg
            >
        </button>
    </div>

    <button
        class="preview-thumb-horizontal"
        aria-label="Resize preview"
        onmousedown={(e) => {
            draggingX = true;
        }}
        onmousemove={(e) => handleResize(e)}
        style="cursor: {draggingX ? 'grabbing' : 'grab'};"
        use:tooltip={{
            ...tooltipSettings,
            placement: "right",
            content: "Resize width",
        }}
    >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
            ><path
                fill="var(--color-tertiary)"
                d="M9,3H11V5H9V3M13,3H15V5H13V3M9,7H11V9H9V7M13,7H15V9H13V7M9,11H11V13H9V11M13,11H15V13H13V11M9,15H11V17H9V15M13,15H15V17H13V15M9,19H11V21H9V19M13,19H15V21H13V19Z"
            /></svg
        >
    </button>
</div>

<style lang="scss">
    @use "../styles/variables.scss" as *;

    .preview-container {
        position: relative;
        max-width: 100%;
        min-width: 320px;
        box-sizing: content-box;
        width: 90%;
        height: 80vh;
        display: flex;
        flex-direction: row;
        align-items: center;
        background-color: var(--color-secondary);
        border: 4px solid var(--color-secondary);
        border-right: 0;
        border-bottom: 0;
        border-radius: 8px;
        overflow: hidden;
    }

    .frame-flex {
        display: grid;
        grid-template-rows: auto 0fr;
        width: 100%;
        height: 100%;
        background-color: var(--color-secondary);
    }

    .debug-info {
        position: absolute;
        top: 12px;
        right: 32px;
        font-size: var(--font-size-base);
        text-align: right;
        font-weight: 600;
        color: var(--color-white);
        text-shadow:
            0 0 8px rgba(0, 0, 0, 1),
            0 0 4px rgba(0, 0, 0, 0.2),
            0 0 2px rgba(0, 0, 0, 0.2);
        transition: 1s ease;
        transition-delay: 0.2s;
    }

    .frame-container {
        width: 100%;
        height: 100%;
        background-color: white;
        border-radius: 4px;
        overflow: hidden;
        position: relative;
    }

    .preview-thumb-horizontal {
        all: unset;
        height: 100%;
        padding: 0px 0px;
        background-color: var(--color-secondary);
        position: relative;
        cursor: grabbing;

        svg {
            width: 20px;
            aspect-ratio: 1;
            // background-color: red;
        }
    }

    .preview-thumb-vertical {
        all: unset;
        width: 100%;
        padding: 0px 0px;
        background-color: var(--color-secondary);
        position: relative;
        cursor: grabbing;

        svg {
            position: relative;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(90deg);
            width: 20px;
            aspect-ratio: 1;
            // background-color: red;
        }
    }
</style>
