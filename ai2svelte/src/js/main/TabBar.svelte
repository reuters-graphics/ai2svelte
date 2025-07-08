<script lang="ts">
    import { onMount } from "svelte";

    let { activeLabel = $bindable() } = $props();

    let activeTab: HTMLElement | undefined = $state();
    let activeRect: DOMRect | undefined = $derived(
        activeTab?.getBoundingClientRect() || undefined,
    );

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
    <div class="tab-items">
        <!-- <div
            id="tab-highlighter"
            style="width: {activeRect?.width || 0}px; left: {activeRect?.left ||
                0}px; top: {activeRect?.top ||
                0}px; height: {activeRect?.height || 0}px;"
        ></div> -->
        {@render tab("Home", true, 1)}
        {@render tab("Components", false, 2)}
        {@render tab("Extras", false, 3)}
        {@render tab("CSS", false, 4)}
        {@render tab("About", false, 5)}
    </div>
    <div class="tab-line">
        <!-- <div
            class="active-tab-line"
            style="width: {activeRect?.width || 0}px; left: {activeRect?.left ||
                0}px;"
        ></div> -->
    </div>
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

    .tab-line {
        // position: absolute;
        margin-top: 0.5rem;
        width: 100%;
        height: 2px;
        // top: 100%;
        background-color: #292929;
    }

    .active-tab-line {
        position: fixed;
        width: 100px;
        // left: 0;
        // top: 0;
        height: 2px;
        background-color: #dc4300;
        transition: 0.2s ease;
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
        background-color: #dc4300;
        left: 0;
        top: 0;
        transition: 0.2s ease;
    }

    .tabs label {
        cursor: pointer;
        // display: inline-block;
        font-family: "Geist Mono";
        font-weight: 700;
        font-size: 1rem;
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
</style>
