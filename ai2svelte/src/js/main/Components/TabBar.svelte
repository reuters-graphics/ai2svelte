<script lang="ts">
  // SVELTE IMPORTS
  import { fly } from "svelte/transition";

  // BITS-UI
  import { Tabs } from "bits-ui";

  // OTHER IMPORTS
  import ColorPicker from "svelte-awesome-color-picker";
  import { tooltip } from "svooltip";
  import { userData } from "../state.svelte";
  import { tooltipSettings, writeFile } from "../utils/utils";
  import { forcePreview } from "../stores";
  import { fetchSettings } from "../utils/utils";

  // COMPONENTS
  import ThemeSwitcher from "./ThemeSwitcher.svelte";
  import Button from "./Button.svelte";
  import RunButton from "../Tabs/Home/RunButton.svelte";

  interface Props {
    activeLabel: string;
    inspectMode?: boolean;
  }

  let { activeLabel = $bindable(), inspectMode = false }: Props = $props();

  let accentColor: string = $derived(userData.accentColor || "#dc4300");
  let theme = $derived(userData.theme || "dark");

  // The three static tabs are always visible; Inspect is conditional on inspectMode.
  const staticTabs = ["Home", "Settings", "Styles"] as const;

  // Sync accent color CSS variable and persist it whenever accentColor changes
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

  // Persist theme preference whenever it changes
  $effect(() => {
    userData.theme = theme;
    if (window.cep) {
      writeFile("user-settings.json", userData);
    }
  });
</script>

<!--
  Wrapping div holds all the original layout and scoped CSS.

  Tabs.Root manages:
  - Active tab state via bind:value (synced bidirectionally to activeLabel in main.svelte)
  - Keyboard navigation: Left/Right arrows move between triggers
  - ARIA: role="tablist" on Tabs.List, role="tab" + aria-selected on each Tabs.Trigger

  Each Tabs.Trigger uses the child snippet so we can apply use:tooltip directly
  on the native button element (Svelte actions only work on HTML elements).
  The id attribute on each button matches the original "#label-{label}" selector
  so the keyboard shortcut in main.svelte (Ctrl+Shift+I) can still programmatically
  click #label-Home and #label-Inspect to switch between tabs.
-->
<div class="tabs">
  <Tabs.Root bind:value={activeLabel} activationMode="automatic">
    <div class="container">
      <Tabs.List>
        {#snippet child({ props })}
          <div {...props} class="tab-items">
            {#each staticTabs as label}
              <Tabs.Trigger value={label.toUpperCase()}>
                {#snippet child({ props: triggerProps })}
                  <button
                    {...triggerProps}
                    id={"label-" + label}
                    class="tab"
                    use:tooltip={{ ...tooltipSettings, content: label }}
                  >
                    {label}
                  </button>
                {/snippet}
              </Tabs.Trigger>
            {/each}

            {#if inspectMode}
              <Tabs.Trigger value="INSPECT">
                {#snippet child({ props: triggerProps })}
                  <button
                    {...triggerProps}
                    id="label-Inspect"
                    class="tab"
                    use:tooltip={{ ...tooltipSettings, content: "Inspect" }}
                  >
                    Inspect
                  </button>
                {/snippet}
              </Tabs.Trigger>
            {/if}
          </div>
        {/snippet}
      </Tabs.List>

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
  </Tabs.Root>
</div>

<style lang="scss">
  @use "../styles/variables.scss" as *;

  .tabs {
    position: relative;
    margin-bottom: var(--space-l);
  }

  .tab-items {
    display: flex;
    z-index: 2;
    gap: 0px;
    position: relative;
  }

  /* Tab trigger button */
  .tab {
    background-color: transparent;
    color: var(--color-text);
    border: none;
    @include animation-default;
    user-select: none;
    cursor: pointer;
    font-weight: 700;
    font-size: var(--font-size-base);
    text-transform: uppercase;
    opacity: 0.3;
    padding: var(--space-2xs);
    margin: 0;

    /* Active tab — bits-ui sets data-state="active" on the trigger element */
    &[data-state="active"] {
      opacity: 1;
      position: relative;
      background-color: var(--color-accent-primary);
      color: var(--color-white);
    }
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
