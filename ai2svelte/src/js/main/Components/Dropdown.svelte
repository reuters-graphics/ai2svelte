<script lang="ts">
    import { fly, slide } from "svelte/transition";

    interface Props {
        options: Array<string>;
        value: string;
    }

    let { options = [], value = $bindable("Select some option") }: Props =
        $props();

    let parentContainer: HTMLElement | undefined = $state();
    let hoveredElement: HTMLElement | undefined = $state();
    let chaserElement: HTMLElement | undefined = $state();
    let menuOpen: boolean = $state(false);

    $effect(() => {
        if (
            hoveredElement &&
            parentContainer &&
            chaserElement instanceof HTMLElement
        ) {
            chaserElement.style.top =
                hoveredElement.getBoundingClientRect().top -
                parentContainer.getBoundingClientRect().top +
                "px";

            chaserElement.style.height =
                hoveredElement.getBoundingClientRect().height + "px";
        }
    });

    $effect(() => {
        if (
            parentContainer &&
            menuOpen &&
            chaserElement instanceof HTMLElement
        ) {
            chaserElement.style.top = "0px";
        }
    });
</script>

<div class="dropdown-container">
    <button class="selected-option" onclick={(e) => (menuOpen = !menuOpen)}>
        <div class="value-display">
            <p class="dropdown-value hidden">{value}</p>
            {#key value}
                <p
                    class="dropdown-value"
                    transition:fly={{ duration: 400, y: 40 }}
                >
                    {value}
                </p>
            {/key}
        </div>
        <p class="chevron" style="rotate:{menuOpen ? '180deg' : '0deg'};">▼</p>
    </button>
    {#if menuOpen}
        <div class="dropdown-menu" in:slide out:slide>
            <ul bind:this={parentContainer}>
                <li class="li-selector" bind:this={chaserElement}>
                    <button>{value}</button>
                </li>
                {#each options as opt}
                    <li
                        class="li-item"
                        value={opt}
                        data-active={value == opt}
                        onmouseenter={(e: Event) =>
                            (hoveredElement =
                                e.target instanceof HTMLElement
                                    ? e.target
                                    : undefined)}
                    >
                        <button
                            onclick={(e: Event) => {
                                value = opt;
                                menuOpen = !menuOpen;
                            }}
                        >
                            {opt}
                        </button>
                    </li>
                {/each}
            </ul>
        </div>
    {/if}
</div>

<style lang="scss">
    @use "../../variables.scss" as *;

    .dropdown-container {
        position: relative;
    }

    .dropdown-value {
        position: absolute;
        top: 0px;
        opacity: 0.5;
        transition: 0.3s ease;
    }

    .hidden {
        position: relative;
        opacity: 0;
    }

    .chevron {
        opacity: 0.3;
        transition: 0.3s ease;
    }

    .selected-option {
        width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        border: unset;
        background-color: transparent;
        padding: 0px;
        padding-right: 12px;
        transition: 0.3s ease;
        border-radius: 8px;
        cursor: pointer;

        p {
            font-family: "Geist Mono";
            font-size: $font-size-sm;
            font-weight: 500;
            color: $color-white;
        }
    }

    .selected-option:hover {
        background-color: $color-charcoal-dark;

        .dropdown-value {
            opacity: 0.7;
        }
    }

    .dropdown-menu {
        position: absolute;
        top: calc(100% + 8px);
        width: 100%;
        background-color: $color-charcoal-light;
        backdrop-filter: blur(4px);
        padding: 0.25rem;
        border-radius: 12px;
        z-index: 3;
    }

    ul {
        position: relative;
        padding: 0;
        margin: 0;
    }

    li {
        position: relative;
        display: block;
        padding: 0px;
        transition: 0.2s ease;
        z-index: 4;
        cursor: pointer;

        button {
            all: unset;
            width: 100%;
            opacity: 0.5;
            padding: 8px;
            transition: 0.3s ease;
        }
    }

    li:hover {
        button {
            opacity: 0.7;
        }
    }

    li[data-active="true"] {
        color: $color-white;

        button {
            opacity: 1 !important;
        }
    }

    .li-selector {
        position: absolute;
        width: 100%;
        background-color: $color-charcoal;
        border-radius: 8px;
        top: 0px;
        z-index: 3;
        color: transparent;
        transition: 0.3s ease;
    }
</style>
