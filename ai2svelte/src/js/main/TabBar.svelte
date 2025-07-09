<script lang="ts">
    import { onMount } from "svelte";
    import ThemeSwitcher from "./Components/ThemeSwitcher.svelte";
    import ColorPicker from "svelte-awesome-color-picker";

    let { activeLabel = $bindable() } = $props();

    let accentColor: string = $state("#dc4300");

    let activeTab: HTMLElement | undefined = $state();

    function handleClick(e: Event) {
        if (e.target && e.target instanceof HTMLElement) {
            const nextElement = e.target.nextElementSibling;
            activeTab =
                nextElement instanceof HTMLElement ? nextElement : undefined;
            activeLabel = activeTab?.innerText || "HOME";
        }
    }

    onMount(() => {
        setTimeout(() => {
            const firstLabel = document.querySelector("#label1");
            if (firstLabel instanceof HTMLElement) {
                activeTab = firstLabel;
            }
        }, 300);
    });

    $effect(() => {
        if (accentColor) {
            document.documentElement.style.setProperty(
                "--color-accent-primary",
                accentColor,
            );
        }
    });
</script>

{#snippet tab(label: string, checked: boolean, id: number)}
    <input
        type="radio"
        name="tab"
        id={"tab" + id}
        {checked}
        oninput={(e) => handleClick(e)}
    />
    <label
        class="tab"
        data-active={activeTab?.innerText == label.toUpperCase()}
        id={"label" + id}
        for={"tab" + id}>{label}</label
    >
{/snippet}

<div class="tabs">
    <div class="container">
        <div class="tab-items">
            {@render tab("Home", true, 1)}
            {@render tab("Components", false, 2)}
            {@render tab("CSS", false, 3)}
            {@render tab("Preview", false, 4)}
            {@render tab("About", false, 5)}
        </div>
        <div class="theme-configs">
            <ThemeSwitcher />
            <div
                data-tippy-content="Fill color"
                style="--picker-color: {accentColor};"
            >
                <ColorPicker
                    position="responsive"
                    label=""
                    isAlpha={false}
                    bind:hex={accentColor}
                    sliderDirection="horizontal"
                    --picker-width="160px"
                    --picker-height="120px"
                    --slider-width="20px"
                    --picker-indicator-size="40px"
                    --picker-z-index="10"
                    --input-size="24px"
                    --cp-border-color="#ffffff22"
                    --cp-bg-color="#292929"
                    --cp-text-color="#ffffff"
                    --cp-input-color="#292929"
                />
            </div>
        </div>
    </div>

    <div class="tab-line"></div>
</div>

<style lang="scss">
    @use "../variables.scss" as *;

    /* Hide the radio inputs */
    .tabs input[type="radio"] {
        display: none;
    }

    .tabs {
        position: relative;
        margin-bottom: 1.5rem;
    }

    .tab {
        background-color: transparent;
        color: var(--color-text);
        @include animation-default;
    }

    .tab[data-active="true"] {
        background-color: var(--color-accent-primary);
    }

    .container {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }

    .tab-line {
        // position: absolute;
        margin-top: 0.5rem;
        width: 100%;
        height: 2px;
        // top: 100%;
        background-color: var(--color-secondary);
    }

    .active-tab-line {
        position: fixed;
        width: 100px;
        // left: 0;
        // top: 0;
        height: 2px;
        background-color: var(--color-accent-primary);
        @include animation-default;
    }

    .tab-items {
        display: flex;
        z-index: 2;
        gap: 0px;
        position: relative;
    }

    #tab-highlighter {
        position: absolute;
        // height: 100%;
        background-color: var(--color-accent-primary);
        left: 0;
        top: 0;
        @include animation-default;
    }

    .tabs label {
        cursor: pointer;
        // display: inline-block;
        font-weight: 700;
        font-size: var(--font-size-base);
        text-transform: uppercase;
        opacity: 0.3;
        padding: 0.5rem;
        margin: 0;
    }

    .tabs input[type="radio"]:checked + label {
        // background-color: #dc4300;
        opacity: 1;
        position: relative;
    }

    /* Style the content sections */
    .tab-content {
        // display: none;
        // padding: 1rem;
    }

    .theme-configs {
        display: flex;
        flex-direction: row;
        gap: 8px;
        align-items: center;
    }
</style>
