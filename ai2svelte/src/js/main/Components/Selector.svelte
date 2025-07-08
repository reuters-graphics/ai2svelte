<script lang="ts">
    interface Props {
        labels: Array<string>;
        value: string;
    }

    let {
        labels = ["text", "text"],
        value = $bindable(),
        ...rest
    }: Props = $props();
</script>

{#snippet button(label: string)}
    <button
        type="button"
        class="radio-button"
        data-checked={value == label}
        aria-pressed={value == label}
        onclick={() => (value = label)}
        {...rest}
    >
        <input
            type="radio"
            name="format-choice"
            id={"radio-" + label}
            value={label}
            checked={value == label}
            tabindex="-1"
            aria-hidden="true"
            style="position: absolute; opacity: 0; pointer-events: none;"
        />{label}</button
    >
{/snippet}

<div class="radio-group">
    {#each labels as label}
        {@render button(label)}
    {/each}
</div>

<style lang="scss">
    @use "../../variables.scss" as *;

    .radio-group {
        display: flex;
        flex-direction: row;
        gap: 8px;
    }

    .radio-button {
        font-family: "Geist Mono";
        font-size: $font-size-sm;
        font-weight: 600;
        opacity: 0.3;
        border: unset;
        background-color: unset;
        color: $color-white;
        padding: 0;
        margin: 0;
        text-transform: uppercase;
        transition: 0.3s opacity ease;
    }

    .radio-button:hover {
        opacity: 0.7;
    }

    .radio-button[data-checked="true"] {
        opacity: 1;
    }
</style>
