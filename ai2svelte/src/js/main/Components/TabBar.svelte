<script lang="ts">
  // SVELTE IMPORTS
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";

  // OTHER IMPORTS
  import ColorPicker from "svelte-awesome-color-picker";
  import { tooltip } from "svooltip";
  import { userData } from "../state.svelte";
  import { tooltipSettings, writeFile } from "../utils/utils";
  import { forcePreview } from "../stores";
  import { fetchSettings } from "../utils/utils";

  // COMPONENT
  import ThemeSwitcher from "./ThemeSwitcher.svelte";
  import Button from "./Button.svelte";
  import RunButton from "../Tabs/Home/RunButton.svelte";

  interface Props {
    activeLabel: string;
    inspectMode?: boolean;
  }

  let { activeLabel = $bindable(), inspectMode = false }: Props = $props();

  let accentColor: string = $derived(userData.accentColor || "#dc4300");

  let activeTab: HTMLElement | undefined = $state();

  let theme = $derived(userData.theme || "dark");

  function handleClick(e: Event) {
    if (e.target && e.target instanceof HTMLElement) {
      const nextElement = e.target.nextElementSibling;
      activeTab = nextElement instanceof HTMLElement ? nextElement : undefined;
      activeLabel = activeTab?.innerText || "HOME";
    }
  }

  onMount(() => {
    setTimeout(() => {
      const firstLabel = document.querySelector("#label-Home");
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
      userData.accentColor = accentColor;
      if (window.cep) {
        writeFile("user-settings.json", userData);
      }
    }
  });

  $effect(() => {
    userData.theme = theme;
    if (window.cep) {
      writeFile("user-settings.json", userData);
    }
  });
</script>

{#snippet tab(label: string, checked: boolean)}
  <input
    type="radio"
    name="tab"
    id={"tab-" + label}
    {checked}
    oninput={(e) => handleClick(e)}
  />
  <label
    class="tab"
    use:tooltip={{ ...tooltipSettings, content: label }}
    data-active={activeTab?.innerText == label.toUpperCase()}
    id={"label-" + label}
    for={"tab-" + label}>{label}</label
  >
{/snippet}

<div class="tabs">
  <div class="container">
    <div class="tab-items">
      {@render tab("Home", true)}
      {@render tab("Settings", false)}
      {@render tab("Styles", false)}
      {#if inspectMode}
        {@render tab("Inspect", false)}
      {/if}
      {@render tab("Preview", false)}
    </div>

    <div class="extra-configs">
      {#if activeLabel === "HOME"}
        <div class="theme-configs" in:fly={{ x: 20, duration: 600 }}>
          <ThemeSwitcher bind:theme />
          <div
            id="picker-accent"
            style="--picker-color: {accentColor};"
            use:tooltip={{
              ...tooltipSettings,
              content: "Change theme",
            }}
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
      {:else}
        <div class="button-container" in:fly={{ x: 20, duration: 600 }}>
          <RunButton minimal refreshSettings={fetchSettings} />
          {#if activeLabel == "PREVIEW"}
            <Button
              minimal
              text="Refresh Preview"
              onClick={() => {
                $forcePreview = true;
              }}
            />
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <hr class="tab-line" />
</div>

<style lang="scss">
  @use "../styles/variables.scss" as *;

  /* Hide the radio inputs */
  .tabs input[type="radio"] {
    display: none;
  }

  .tabs {
    position: relative;
    margin-bottom: var(--space-l);
  }

  .tab {
    background-color: transparent;
    color: var(--color-text);
    @include animation-default;
    user-select: none;
  }

  .tab[data-active="true"] {
    background-color: var(--color-accent-primary);
    color: var(--color-white);
  }

  .container {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .button-container {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    gap: var(--space-xs);
  }

  .tab-line {
    margin-top: var(--space-xs);
    width: 100%;
    height: var(--space-3xs);
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
    padding: var(--space-2xs);
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

  .extra-configs {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--space-xs);
  }

  .theme-configs {
    display: flex;
    flex-direction: row;
    gap: var(--space-xs);
    align-items: center;
  }
</style>
