<script lang="ts">
  import {
    settingsObject,
    stylesString,
    styles,
    ai2svelteInProgress,
  } from "../stores";
  import { evalTS } from "../../lib/utils/bolt";
  import { saveSettings, tooltipSettings, writeFile } from "../utils/utils";
  import { userData } from "../state.svelte";
  import { company, displayName, version } from "../../../shared/shared";
  import { tooltip } from "svooltip";

  import Logo from "../Components/Logo.svelte";

  let { refreshSettings = () => {} } = $props();

  function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
</script>

<div class="tab-content">
  <div class="content">
    <button
      class="cta-button"
      onclick={async (e) => {
        const ele = e.currentTarget;
        ele.textContent = "Running...";
        ele.setAttribute("disabled", "true");
        // set show_completion_dialog_box
        // unless set by user
        if (window.cep) {
          let missingFontFamilies = [];
          // let disabled state kick in
          $ai2svelteInProgress = true;
          await delay(500);
          try {
            missingFontFamilies = await evalTS("runNightly", {
              settings: {
                show_completion_dialog_box: true,
                ...$settingsObject,
              },
              code: { css: $stylesString, fontsConfig: userData.fontsConfig },
            });
          } catch (error) {
            console.log("Error running ai2svelte");
            console.log(error);
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
            version
          );
          refreshSettings();
          ele.textContent = "Run AI2SVELTE";
          ele.removeAttribute("disabled");
          $ai2svelteInProgress = false;
        } else {
          setTimeout(() => {
            ele.textContent = "Run AI2SVELTE";
            ele.removeAttribute("disabled");
          }, 2000);
        }
      }}
      use:tooltip={{
        ...tooltipSettings,
        content: "Run ai2svelte with current settings",
      }}>Run AI2SVELTE</button
    >

    <button
      class="cta-button"
      onclick={async () => {
        if (window.cep) {
          saveSettings($settingsObject, $styles, version);
          await evalTS("exportAsTemplate");
        }
      }}
      use:tooltip={{
        ...tooltipSettings,
        content: "Export as a reusable template",
      }}>Export as template</button
    >
  </div>

  <div id="credits">
    <Logo />
    <p id="about-line">{displayName} v{version} by {company}</p>
  </div>
</div>

<style lang="scss">
  @use "../styles/variables.scss" as *;

  #credits {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
  }

  .content {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 0.25rem;
  }

  .tab-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 16px;
  }

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

  #about-line {
    text-align: center;
    color: var(--color-tertiary);
    letter-spacing: -0.05rem;
  }
</style>
