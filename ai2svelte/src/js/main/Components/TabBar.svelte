<script lang="ts">
  import { onMount } from "svelte";
  import ColorPicker from "svelte-awesome-color-picker";
  import { tooltip } from "svooltip";
  import { userData } from "../state.svelte";
  import { tooltipSettings } from "../utils/utils";
  import ThemeSwitcher from "./ThemeSwitcher.svelte";

  import { writeUserSettings } from "../utils/utils";

  interface Props {
    activeLabel: string;
  }

  let { activeLabel = $bindable() }: Props = $props();

  let accentColor: string = $derived(userData.accentColor);

  let activeTab: HTMLElement | undefined = $state();

  let theme = $derived(userData.theme);

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
        accentColor
      );
      userData.accentColor = accentColor;
      writeUserSettings(userData);
    }
  });

  $effect(() => {
    userData.theme = theme;
    writeUserSettings(userData);
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
      {@render tab("CSS", false)}
      {@render tab("Preview", false)}
      {@render tab("About", false)}
    </div>
    <div class="theme-configs">
      <ThemeSwitcher bind:theme />
      <div
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
  </div>

  <div class="tab-line"></div>
</div>

<style lang="scss">
  @use "../styles/variables.scss" as *;

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
