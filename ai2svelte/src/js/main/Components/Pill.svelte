<script lang="ts">
    import { fly } from "svelte/transition";
    import { backInOut } from "svelte/easing";

    let {
        name = "",
        active,
        onRemove = $bindable(),
        onClick = $bindable(),
    } = $props();
</script>

<button
    class="pill {active ? 'active' : ''}"
    transition:fly={{ duration: 400, y: 20, easing: backInOut }}
    onclick={(e) => {
        e.preventDefault();
        e.stopPropagation();

        // Check if the click was on the SVG (remove action)
        if (
            e.target instanceof SVGElement ||
            e.target instanceof SVGPathElement
        ) {
            onRemove();
        } else {
            onClick();
        }
    }}
>
    <p>{name}</p>

    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 384 512"
        aria-label="Remove {name}"
        role="img"
        ><path
            d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"
        /></svg
    >
</button>

<style lang="scss">
    @use "../styles/variables.scss" as *;

    .pill {
        all: unset;
        display: flex;
        flex-direction: row;
        align-items: center;
        background-color: var(--color-secondary);
        border-radius: 24px;
        gap: 8px;
        padding: 0.5rem 0.75rem;
        cursor: pointer;
        @include animation-default;

        p {
            color: var(--color-text);
            font-size: var(--font-size-xs);
            font-weight: 600;
            opacity: 0.5;
            @include animation-default;
        }

        svg {
            width: 16px;
            aspect-ratio: 1;
            fill: var(--color-tertiary);
            @include animation-default;
        }

        svg:hover {
            rotate: 90deg;
        }
    }

    .pill:hover {
        p {
            opacity: 0.75;
        }
    }

    .active {
        background-color: var(--color-accent-primary);

        svg {
            fill: var(--color-white);
        }

        p {
            color: var(--color-white);
            opacity: 1 !important;
        }
    }
</style>
