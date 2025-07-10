<script lang="ts">
    import { onMount } from "svelte";
    import { Spring } from "svelte/motion";

    interface Props {
        children?: unknown;
    }

    let { children }: Props = $props();

    let dragging = $state(false);
    let progress = new Spring(100);
    let eleRect: DOMRect | undefined = $state();

    let mousePos = $state({
        x: 1,
        y: 1,
    });

    onMount(() => {});

    function handleResize(e: MouseEvent) {
        if (dragging) {
            progress.target = e.pageX;
        }
    }

    function releaseDrag(e: MouseEvent) {
        dragging = false;
    }
</script>

<svelte:window onmousemove={handleResize} onmouseup={releaseDrag} />

<div
    class="preview-container"
    style="width: {progress.current}px; cursor: {dragging
        ? 'grabbing'
        : 'default'};"
    bind:contentRect={eleRect}
>
    <div class="preview-frame">
        {@render children?.()}
    </div>
    <p
        class="debug-info"
        style="opacity: {progress.target == progress.current ? 0 : 1};"
    >
        {Math.round(eleRect?.width) + "px"}
    </p>
    <button
        class="preview-thumb"
        aria-label="Resize preview"
        onmousedown={(e) => {
            dragging = true;
        }}
        onmousemove={(e) => handleResize(e)}
        style="cursor: {dragging ? 'grabbing' : 'grab'};"
    >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
            ><path
                fill="lightgray"
                d="M9,3H11V5H9V3M13,3H15V5H13V3M9,7H11V9H9V7M13,7H15V9H13V7M9,11H11V13H9V11M13,11H15V13H13V11M9,15H11V17H9V15M13,15H15V17H13V15M9,19H11V21H9V19M13,19H15V21H13V19Z"
            /></svg
        >
    </button>
</div>

<style lang="scss">
    @use "../../variables.scss" as *;

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
        background-color: var(--color-quaternary);
        border: 4px solid var(--color-quaternary);
        border-right: 0;
        border-radius: 8px;
        overflow: hidden;
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

    .preview-frame {
        width: 100%;
        height: 100%;
        background-color: white;
        border-radius: 4px;
        overflow: hidden;
    }

    .preview-thumb {
        all: unset;
        height: 100%;
        padding: 0px 0px;
        background-color: var(--color-quaternary);
        position: relative;
        cursor: grabbing;

        svg {
            width: 20px;
            aspect-ratio: 1;
            // background-color: red;
        }
    }
</style>
