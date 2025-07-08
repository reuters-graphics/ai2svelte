<script lang="ts">
    import Dropdown, { type DropdownProps } from "./Dropdown.svelte";
    import InputText, { type TextProps } from "./InputText.svelte";
    import InputRange, { type RangeProps } from "./InputRange.svelte";
    import { fly } from "svelte/transition";
    import { onMount } from "svelte";

    type Props = DropdownProps &
        TextProps &
        RangeProps & {
            label: string;
            value: string | number | undefined | null;
            type?: "select" | "text" | "range";
            delay?: number;
        };

    let {
        label,
        options = [],
        value = $bindable(),
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
                    transition:fly={{ duration: 400, y: 40 }}>{value}</label
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
    @use "../../variables.scss" as *;

    .option-container {
        display: flex;
        flex-direction: column;
        padding: 0.75rem;
        gap: 0.25rem;
        border-radius: 8px;
        flex-grow: 1;
        transition: 0.2s ease;
        background-color: $color-charcoal-dark;
        border: unset;
        width: 100%;
    }

    .option-container:hover {
        .option-title {
            opacity: 0.5;
        }

        .option-select {
            opacity: 0.7;
        }

        .hidden {
            // --dragging: 0.5;
            // opacity: var(--dragging);
            opacity: 0.5;
        }
    }

    .hidden[data-dragging="true"] {
        opacity: 0 !important;
    }

    .option-container:focus-within {
        box-shadow: inset 0 0 0 2px $accent;
    }

    .label-container {
        position: relative;
    }

    .option-title {
        position: absolute;
        top: 0;
        left: 0;
        text-transform: uppercase;
        font-size: $font-size-xs;
        font-family: "Geist Mono";
        font-weight: 400;
        color: $color-white;
        opacity: 0.3;
        user-select: none;
        cursor: default;
        transition: 0.3s ease;
    }

    .hidden {
        transition: 0.3s ease;
        position: relative;
    }

    .visible {
        position: relative;
    }

    .option-select {
        cursor: pointer;
        background-color: transparent;
        font-size: $font-size-sm;
        font-family: "Geist Mono";
        font-weight: 500;
        color: $color-white;
        opacity: 0.5;
        border: unset;
        padding: 0px;
        padding-right: 0.5rem;
        margin-left: 0px;
        transition: 0.2s ease;
    }

    .option-select {
        &,
        &::picker(select) {
            appearance: base-select;
            // background-color: red;
        }
    }

    .option-select::picker-icon {
        color: $color-charcoal-lightest;
        transition: 0.2s rotate;
    }

    .option-select:open::picker-icon {
        rotate: 180deg;
    }

    .option:hover {
        cursor: pointer;
        background-color: $accent;

        .option-title {
            opacity: 0.5;
        }

        .option-select {
            opacity: 0.7;
        }
    }

    .option {
        background-color: $color-charcoal-light;
        color: $color-charcoal-lightest;
        padding-inline: unset;
        transition: 0.2s ease;
    }

    .option:hover,
    .option:focus {
        background-color: $color-charcoal-lighter;
        color: $color-white;
    }

    .option::checkmark {
        content: "";
    }
</style>
