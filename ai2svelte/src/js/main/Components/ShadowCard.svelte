<script lang="ts">
    import { onMount } from "svelte";
    import { fly } from "svelte/transition";

    interface Props {
        name: string;
        shadow: string;
        specimen: string;
        specimenWeight: number;
        shadowName: string;
        shadowColor: string;
        fillColor: string;
        backdrop: string;
        active: boolean;
        delay?: number;
    }

    let {
        name,
        shadow,
        specimen,
        specimenWeight = 400,
        shadowColor,
        fillColor,
        backdrop,
        dataName = $bindable(),
        active = $bindable(false),
        onChange = () => {},
        delay = 100,
    } = $props();

    let shadowName: string = $derived(
        name
            .toLowerCase()
            .split(" ")
            .map((x: string, i: number) =>
                i == 0 ? x : x[0].toUpperCase() + x.substring(1),
            )
            .join(""),
    );

    let shadowModified: string = $derived(
        shadow.replaceAll("#000000", shadowColor),
    );

    dataName = shadowName;

    let mounted = $state(false);

    onMount(() => {
        mounted = true;
    });
</script>

{#if mounted}
    <button
        class="card card-shadow {active ? 'focused' : ''}"
        style="background-image: url({backdrop});"
        data-name={dataName}
        onclick={(e: Event) => {
            active = !active;
            onChange();
        }}
        in:fly={{ y: 20, duration: 150, delay: delay }}
    >
        <p class="card-title" style="pointer-events:none;">{name}</p>
        <div style="position: relative; contain: unset; pointer-events:none;">
            <p class="card-pseudo-specimen" style:font-weight={specimenWeight}>
                {specimen}
            </p>
            <p
                class="card-specimen"
                style="{shadowModified}; color: {fillColor};"
                style:font-weight={specimenWeight}
            >
                {specimen}
            </p>
        </div>
    </button>
{/if}

<style lang="scss">
    @use "../../variables.scss" as *;

    .card {
        border: unset;
        border-radius: 8px;
        padding: 0.75rem;
        position: relative;
        width: 100%;
        cursor: pointer;
    }

    .focused {
        box-shadow: inset 0 0 0 4px var(--color-accent-primary);
    }

    .card-shadow {
        background-repeat: no-repeat;
        background-size: cover;
        contain: paint;
        @include animation-default;
    }

    .card-title {
        font-family: "Geist Mono";
        font-size: var(--font-size-base);
        color: var(--color-white);
        text-align: left;
        text-transform: uppercase;
        filter: drop-shadow(0px 0px 1px var(--color-black))
            drop-shadow(0px 0px 1px var(--color-black));
    }

    .card-pseudo-specimen {
        opacity: 0;
        width: 100%;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
        font-family: "Knowledge2017";
        font-size: var(--font-size-base);
    }

    .card-specimen {
        position: absolute;
        width: 100%;
        text-overflow: ellipsis;
        white-space: nowrap;
        top: 0;
        left: 0;
        font-family: "Knowledge2017";
        font-size: var(--font-size-base);
    }
</style>
