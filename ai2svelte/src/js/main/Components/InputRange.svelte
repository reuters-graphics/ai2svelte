<script lang="ts">
    export interface RangeProps {
        value: number;
        start?: number;
        end?: number;
        stepper?: number;
        dragging?: boolean;
    }

    import { map } from "./utils";
    import { onMount } from "svelte";
    import { Spring } from "svelte/motion";

    let {
        value = $bindable(),
        start = 0,
        end = 100,
        stepper = 1,
        dragging = $bindable(false),
    }: RangeProps = $props();

    let progress = new Spring(0, {
        stiffness: 0.05,
        damping: 0.5,
    });
    let length = $state(end - start);
    let contentRect: DOMRect | undefined = $state();

    function updateSlider(e: MouseEvent) {
        if (dragging && contentRect) {
            progress.target = map(
                e.offsetX,
                contentRect.width * 0.05,
                contentRect.width * 0.95,
                0,
                1,
            );
            const val = Math.floor((progress.target * length) / stepper);
            value = parseInt(Math.floor(stepper * val).toFixed(0));
        }
    }

    onMount(() => {
        progress.target = value / length;
    });
</script>

<div
    class="range"
    onmousedown={(e) => {
        dragging = true;
    }}
    onmousemove={(e) => updateSlider(e)}
    onmouseup={(e) => {
        dragging = false;
    }}
    bind:contentRect
    role="slider"
    tabindex="0"
    aria-valuenow={value}
    aria-valuemin="0"
    aria-valuemax="100"
>
    <p class="pseudo">{value}</p>
    <div class="range-slider bg"></div>
    <div class="range-slider" style="width: {progress.current * 100}%;"></div>
    <p
        class="range-value"
        style="left: {progress.current * 100}%; text-align: {progress.current <
        0.5
            ? 'left'
            : 'right'}; transform: translateY(-50%) translateX({progress.current <
        0.5
            ? 'calc(8px)'
            : 'calc(-100% - 8px)'}); color: {progress.current < 0.5
            ? 'white'
            : 'black'}; opacity: {dragging ? 0 : 0.5};"
    >
        {value}
    </p>
</div>

<style lang="scss">
    @use "../../variables.scss" as *;

    .range {
        width: 100%;
        min-width: 120px;
        background-color: transparent;
        border-radius: 8px;
        position: relative;
        cursor: pointer;
    }

    .range:hover {
        .range-value {
            opacity: 1;
        }
    }

    .range-slider {
        position: absolute;
        // top: 50%;
        top: 0;
        // transform: translate(4px, -50%);
        width: 100%;
        height: 100%; // padding from parent
        background-color: var(--color-invert);
        border-radius: 4px;
        pointer-events: none;
    }

    .bg {
        background-color: var(--color-secondary);
    }

    .range-value {
        position: absolute;
        top: 50%;
        z-index: 2;
        pointer-events: none;
        user-select: none;
        opacity: 0.5;
        font-size: var(--font-size-base);
        @include animation-default(transform);
        @include animation-default(opacity);
    }

    .pseudo {
        font-size: var(--font-size-base);
        opacity: 0;
        user-select: none;
    }
</style>
