<script lang="ts">
    export interface TextProps {
        label: string;
        value: string;
    }

    let { label = "title", value = $bindable("text") }: TextProps = $props();
</script>

<input id={`select-${label}`} class="option-text" type="text" bind:value />

<style lang="scss">
    @use "../../variables.scss" as *;

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
