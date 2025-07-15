<script lang="ts">
    import { fly, slide } from "svelte/transition";

    export interface DropdownProps {
        options?: Array<string>;
        value: string;
    }

    let {
        options = [],
        value = $bindable("Select some option"),
    }: DropdownProps = $props();

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
            chaserElement.style.height = "unset";
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
        color: var(--color-text);
        top: 0px;
        opacity: 0.5;
        @include animation-default;
    }

    .hidden {
        position: relative;
        opacity: 0;
    }

    .chevron {
        opacity: 0.3;
        @include animation-default;
    }

    .selected-option {
        width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        border: unset;
        background-color: transparent;
        color: var(--color-text);
        padding: 0px;
        padding-right: 12px;
        border-radius: 8px;
        cursor: pointer;
        @include animation-default;

        p {
            font-size: var(--font-size-base);
            font-weight: 500;
        }
    }

    .selected-option:hover {
        .dropdown-value {
            opacity: 0.7;
        }
    }

    .dropdown-menu {
        position: absolute;
        top: calc(100% + 8px);
        width: 100%;
        background-color: var(--color-secondary);
        backdrop-filter: blur(4px);
        padding: 0.25rem;
        border-radius: 12px;
        z-index: 3;
        box-shadow:
            0 0 16px rgba(0, 0, 0, 0.2),
            0 0 4px rgba(0, 0, 0, 0.1);
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
            box-sizing: border-box;
            display: block;
            width: 100%;
            opacity: 0.5;
            padding: 8px;
            @include animation-default;
        }
    }

    li:hover {
        button {
            opacity: 0.7;
        }
    }

    li[data-active="true"] {
        color: var(--color-text);

        button {
            opacity: 1 !important;
        }
    }

    .li-selector {
        position: absolute;
        width: 100%;
        background-color: var(--color-tertiary);
        border-radius: 8px;
        top: 0px;
        z-index: 3;
        color: transparent;
        @include animation-default;
    }
</style>
