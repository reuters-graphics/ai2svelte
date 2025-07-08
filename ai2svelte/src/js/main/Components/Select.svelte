<script lang="ts">
    import Dropdown from "./Dropdown.svelte";

    interface Props {
        label: string;
        options?: Array<string>;
        value: string;
        type?: "select" | "text";
    }

    let {
        label,
        options = [],
        value = $bindable(),
        type = "select",
    }: Props = $props();
</script>

<div class="option-container">
    <label for={`select-${label}`} class="option-title">{label}</label>
    {#if type == "select"}
        <Dropdown options={options || []} bind:value />
    {:else if type == "text"}
        <input
            id={`select-${label}`}
            class="option-text"
            type="text"
            bind:value
        />
    {:else if type == "range"}
        <input type="range" class="option-range" bind:value />
    {/if}
</div>

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
    }

    .option-container:focus-within {
        box-shadow: inset 0 0 0 2px $accent;
    }

    .option-title {
        text-transform: uppercase;
        font-size: $font-size-xs;
        font-family: "Geist Mono";
        font-weight: 400;
        color: $color-white;
        opacity: 0.3;
        transition: 0.3s ease;
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

    .option-text {
        background-color: transparent;
        border: unset;
        color: $color-white;
        font-family: "Geist Mono";
        font-size: $font-size-sm;
        caret-color: $accent;
        opacity: 0.5;
        transition: 0.2s ease;
    }

    .option-text:focus {
        border: unset;
        outline: unset;
        opacity: 0.7;
    }
</style>
