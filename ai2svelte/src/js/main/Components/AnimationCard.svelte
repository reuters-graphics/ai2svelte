<script lang="ts">
    import { onMount } from "svelte";
    import { fly } from "svelte/transition";

    interface Props {
        name: string;
        animation: string;
        definition: string;
        propValue: string;
        candidate: string;
        animId: string;
        active: boolean;
        delay?: number;
    }

    let {
        name,
        animation,
        definition,
        propValue,
        animId,
        candidate = "shape",
        active = $bindable(false),
        onChange = () => {},
        delay = 100,
    } = $props();

    let mounted = $state(false);

    let thisCard: Element | undefined = $state();

    onMount(() => {
        mounted = true;

        createStyle();
    });

    function createStyle() {
        const style = document.createElement("style");
        style.textContent = propValue;
        document?.head.appendChild(style);
    }
</script>

{#if mounted}
    <button
        class="card card-animation {active ? 'focused' : ''}"
        onclick={(e: Event) => {
            active = !active;
            onChange();
        }}
        in:fly={{ y: 20, duration: 150, delay: delay }}
        bind:this={thisCard}
    >
        <p class="card-title" style="pointer-events:none;">{name}</p>
        <div style="position: relative;">
            <svg width="100%" height="80px">
                <defs>
                    <linearGradient
                        id="Gradient"
                        x1="0"
                        x2="100%"
                        y1="50%"
                        y2="50%"
                    >
                        <stop offset="0%" stop-color="var(--color-secondary)" />
                        <stop
                            offset="49.99%"
                            stop-color="var(--color-secondary)"
                        />
                        <stop
                            offset="50.01%"
                            stop-color="var(--color-accent-primary)"
                        />
                        <stop
                            offset="100%"
                            stop-color="var(--color-accent-primary)"
                        />
                    </linearGradient>
                </defs>
                {#if candidate == "shape"}
                    <circle
                        id="animated-ele"
                        cx="50%"
                        cy="50%"
                        r={20}
                        fill={"url(#Gradient)"}
                        style={propValue}
                    />
                {:else if candidate == "text"}
                    <text
                        id="animated-ele"
                        x="50%"
                        y="50%"
                        text-anchor="middle"
                        fill="white"
                        style={propValue}>ai2svelte</text
                    >
                {:else if candidate == "line"}
                    <line
                        id="animated-ele"
                        x1="0%"
                        y1="50%"
                        x2="100%"
                        y2="50%"
                        stroke="var(--color-tertiary)"
                        stroke-width="3px"
                        style={propValue}
                    ></line>
                {/if}
            </svg>
        </div>
    </button>
{/if}

<style lang="scss">
    @use "../../variables.scss" as *;
    @use "../animations.scss" as *;

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

    .card-animation {
        background-color: var(--color-primary);
        @include animation-default;
    }

    .card-title {
        font-family: "Geist Mono";
        font-size: var(--font-size-base);
        color: var(--color-text);
        text-align: left;
        text-transform: uppercase;
    }

    #animated-ele {
        animation-iteration-count: infinite !important;
        animation-duration: 1s !important;
        transform-origin: center !important;
    }
</style>
