<script lang="ts">
    import { onMount } from "svelte";

    interface Props {
        text: string;
    }

    let { text }: Props = $props();

    onMount(() => {});
</script>

<button class="chip" data-name={text}>{text}</button>

<style lang="scss">
    @use "../styles/variables.scss" as *;

    .chip {
        cursor: pointer;
        flex-grow: 1;
        background-color: var(--color-primary);
        border: unset;
        border-radius: 8px;
        color: rgba(var(--color-text), 0.1);
        font-size: var(--font-size-sm);
        font-weight: 500;
        text-transform: uppercase;
        padding: 0.75rem 1.5rem;
        @include animation-default;
    }
</style>
