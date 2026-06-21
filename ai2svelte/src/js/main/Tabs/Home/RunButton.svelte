<script lang="ts">
  import {
    settingsObject,
    stylesString,
    styles,
    ai2svelteInProgress,
    triggerConfetti,
  } from "../../stores";
  import { evalTS } from "../../../lib/utils/bolt";
  import { mount } from "svelte";

  import { userData } from "../../state.svelte";
  import { saveSettings, tooltipSettings, writeFile } from "../../utils/utils";
  import Toast from "../../Components/Toast.svelte";

  import { version } from "../../../../shared/shared";
  import { tooltip } from "svooltip";

  let { refreshSettings = () => {}, minimal = false } = $props();

  function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function runAi2Svelte() {
    // let disabled state kick in
    await delay(500);

    if (window.cep) {
      let missingFontFamilies = [];
      $ai2svelteInProgress = true;

      // set show_completion_dialog_box
      // unless set by user
      try {
        // ai2svelte returns a list of missing font families, if any
        missingFontFamilies = await evalTS("runAi2Svelte", {
          settings: {
            show_completion_dialog_box: true,
            ...$settingsObject,
          },
          code: { css: $stylesString, fontsConfig: userData.fontsConfig },
        });
      } catch (error) {
        console.error("[ai2svelte] runAi2Svelte failed:", error);
        mount(Toast, {
          target: document.body,
          props: {
            message: `Error running ai2svelte: ${error instanceof Error ? error.message : String(error)}`,
            duration: 4000,
          },
        });
        $ai2svelteInProgress = false;
        return;
      }

      if (missingFontFamilies.length > 0) {
        missingFontFamilies.forEach((family: string) => {
          userData.fontsConfig[family] = "";
        });
        // update user settings file with missing font families
        writeFile("user-settings.json", userData);
      }

      saveSettings(
        $settingsObject,
        {
          styleText: $styles?.root?.toString(),
        },
        version,
      );

      // fetch updated settings
      // and update the UI
      refreshSettings();

      $triggerConfetti = true;
      $ai2svelteInProgress = false;
    } else {
      $triggerConfetti = true;
    }
  }
</script>

<button
  class="cta-button"
  class:minimal
  onclick={async (e) => {
    const ele = e.currentTarget;
    ele.textContent = "Running...";
    ele.setAttribute("disabled", "true");
    await runAi2Svelte();
    ele.textContent = "Run AI2SVELTE";
    ele.removeAttribute("disabled");
  }}
  use:tooltip={{
    ...tooltipSettings,
    content: "Run ai2svelte with current settings",
  }}>Run AI2SVELTE</button
>

<style lang="scss">
  @use "../../styles/variables.scss" as *;

  .cta-button {
    cursor: pointer;
    padding: 1rem;
    color: var(--color-text);
    background-color: var(--color-primary);
    border: unset;
    font-size: var(--font-size-s);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.2rem;
    margin-bottom: 1rem;
    @include animation-default;
  }

  .cta-button:hover {
    background-color: var(--color-accent-primary);
    color: var(--color-white);
  }

  .cta-button:disabled {
    $primary-clr: var(--color-accent-primary);
    $secondary-clr: rgba(0, 0, 0, 0.25);
    cursor: not-allowed;
    opacity: 0.5;
    color: var(--color-white);
    background:
      repeating-linear-gradient(
        -45deg,
        $primary-clr,
        $primary-clr 8px,
        $secondary-clr 8px,
        $secondary-clr 16px
      ),
      $primary-clr;
    background-size: 200% 200%;
    animation: flicker 4s linear infinite;
  }

  @keyframes flicker {
    0% {
      background-position: 0% 0%;
    }
    100% {
      background-position: 100% 100%;
    }
  }

  .minimal {
    cursor: pointer;
    font-weight: 700;
    font-size: var(--font-size-base);
    text-transform: uppercase;
    padding: var(--space-2xs);
    margin: 0;
    letter-spacing: 0;
  }
</style>
