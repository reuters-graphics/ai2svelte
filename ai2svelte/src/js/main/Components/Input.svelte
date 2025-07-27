<script lang="ts">
    import Dropdown, { type DropdownProps } from "./Dropdown.svelte";
    import InputText, { type TextProps } from "./InputText.svelte";
    import InputRange, { type RangeProps } from "./InputRange.svelte";
    import { fly } from "svelte/transition";
    import { onMount } from "svelte";

    interface Props {
        label: string;
        options?: string[];
        value: string | number | undefined | null;
        type?: "select" | "text" | "range";
        start?: number;
        end?: number;
        stepper?: number;
        delay?: number;
    }

    let {
        label,
        options = [],
        value = $bindable(undefined),
        type = "select",
        start = 0,
        end = 100,
        stepper = 1,
        delay = 100,
    }: Props = $props();

    let mounted = $state(false);

    let dragging = $state(false);

    onMount(() => {
        mounted = true;
    });
</script>

{#if mounted}
    <div
        class="option-container"
        in:fly={{ y: 20, duration: 150, delay: delay }}
    >
        <div class="label-container">
            {#if type == "range"}
                <label
                    for={`select-${label}`}
                    class="option-title hidden"
                    data-dragging={dragging}>{label}</label
                >
            {:else}
                <label for={`select-${label}`} class="option-title visible"
                    >{label}</label
                >
            {/if}
            {#if dragging}
                <label
                    for=""
                    class="option-title"
                    style="opacity: 1;"
                    transition:fly={{ duration: 400, y: 40 }}
                    >{value as string}</label
                >
            {/if}
        </div>
        {#if type == "select"}
            <Dropdown options={options || []} bind:value={value as string} />
        {:else if type == "text"}
            <InputText {label} bind:value={value as string} />
        {:else if type == "range"}
            <InputRange
                bind:value={value as number}
                {start}
                {end}
                {stepper}
                bind:dragging
            />
        {/if}
    </div>
{/if}

<style lang="scss">
    @use "../styles/variables.scss" as *;

    .option-container {
        display: flex;
        flex-direction: column;
        padding: 0.75rem;
        gap: 0.25rem;
        border-radius: 8px;
        flex-grow: 1;
        transition: 0.2s ease;
        background-color: var(--color-primary);
        border: unset;
        width: 100%;
    }

    .option-container:hover {
        .option-title {
            opacity: 0.5;
        }

        .hidden {
            opacity: 0.5;
        }

        :global(.option-text) {
            opacity: 1;
        }
    }

    .hidden[data-dragging="true"] {
        opacity: 0 !important;
    }

    .option-container:focus-within {
        box-shadow: inset 0 0 0 2px var(--color-accent-primary);
    }

    .label-container {
        position: relative;
    }

    .option-title {
        position: absolute;
        top: 0;
        left: 0;
        text-transform: uppercase;
        font-size: var(--font-size-sm);
        font-weight: 400;
        color: var(--color-text);
        opacity: 0.3;
        user-select: none;
        cursor: default;
        @include animation-default;
    }

    .hidden {
        @include animation-default;
        position: relative;
    }

    .visible {
        position: relative;
    }
</style>
