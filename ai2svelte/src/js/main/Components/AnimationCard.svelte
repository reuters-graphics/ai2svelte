<script lang="ts">
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";

  interface Props {
    name: string;
    animation: string;
    animationArguments: string;
    animationRule: string;
    candidate: string;
    active: boolean;
    delay?: number;
    definition: string;
    onChange: () => void;
  }

  let {
    name,
    animation,
    animationArguments,
    animationRule,
    definition,
    candidate = "shape",
    active = $bindable(false),
    onChange = () => {},
    delay = 100,
  }: Props = $props();

  let mounted = $state(false);

  let thisCard: Element | undefined = $state();

  let argumentsString = $derived.by(() => {
    let str = "";
    str =
      (animationArguments as String)
        .replaceAll("$", "--")
        .replaceAll(",", ";")
        .replaceAll("(", "")
        .replaceAll(")", "") + ";";

    return str;
  });

  onMount(() => {
    mounted = true;

    createStyle();
  });

  /**
   * Converts a string of key-value pairs (e.g. "key1: value1, key2: value2")
   * into an object { key1: "value1", key2: "value2" }
   */
  function parseKeyValueString(str: string): Record<string, string> {
    return str
      .split(",")
      .map((pair) => pair.trim())
      .filter(Boolean)
      .reduce(
        (acc, pair) => {
          const [key, ...rest] = pair.split(":");
          if (key && rest.length) {
            acc[key.trim()] = rest.join(":").trim();
          }
          return acc;
        },
        {} as Record<string, string>
      );
  }

  /**
   * Dynamically creates a style element with the provided CSS definition
   * and appends it to the document's head.
   *
   */
  function createStyle() {
    const regex = new RegExp(/\((.*)\)/);
    const match = animationArguments.match(regex);
    let argumentsObj: Record<string, string> = {};
    if (match) {
      argumentsObj = parseKeyValueString(match[1]);
    }

    const style = document.createElement("style");
    let parsedStyle = definition;
    Object.keys(argumentsObj).forEach((arg) => {
      parsedStyle = parsedStyle.replaceAll(`${arg}`, argumentsObj[arg]);
    });
    style.textContent = parsedStyle;
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
      {#if candidate == "text"}
        <div class="animated-text-container">
          <p style={`${argumentsString} animation: ${animationRule};`}>
            lorem ipsum
          </p>
        </div>
      {:else}
        <svg width="100%" height="80px">
          <defs>
            <linearGradient id="Gradient" x1="0" x2="100%" y1="50%" y2="50%">
              <stop offset="0%" stop-color="var(--color-secondary)" />
              <stop offset="49.99%" stop-color="var(--color-secondary)" />
              <stop offset="50.01%" stop-color="var(--color-accent-primary)" />
              <stop offset="100%" stop-color="var(--color-accent-primary)" />
            </linearGradient>
          </defs>
          {#if candidate == "shape"}
            <circle
              class="animated-ele"
              cx="50%"
              cy="50%"
              r={20}
              fill={"url(#Gradient)"}
              style={`${argumentsString} animation: ${animationRule};`}
            />
          {:else if candidate == "line"}
            <line
              class="animated-ele"
              x1="0%"
              y1="50%"
              x2="100%"
              y2="50%"
              stroke="var(--color-tertiary)"
              stroke-width="3px"
              style={`${argumentsString} animation: ${animationRule};`}
            ></line>
          {/if}
        </svg>
      {/if}
    </div>
  </button>
{/if}

<style lang="scss">
  @use "../styles/variables.scss" as *;

  .card {
    border: unset;
    border-radius: 8px;
    padding: 0.75rem;
    position: relative;
    width: 100%;
    cursor: pointer;
    overflow: hidden;
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

  .animated-ele {
    animation-iteration-count: infinite !important;
    animation-duration: 1s !important;
    transform-origin: center !important;
  }

  .animated-text-container {
    width: 100%;
    height: 80px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;

    p {
      font-family: "Inter";
      color: var(--color-text);
      font-weight: 500;
      text-align: center;
    }
  }
</style>
