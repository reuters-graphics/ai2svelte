<script lang="ts">
  import { onDestroy, onMount, untrack } from "svelte";
  import AiSettings from "./data/ai-settings.json";
  import { fly } from "svelte/transition";
  import { settingsObject, stylesString, styles } from "../stores";
  import { evalTS } from "../../lib/utils/bolt";
  import SectionTitle from "../Components/SectionTitle.svelte";
  import Input from "../Components/Input.svelte";
  import CmTextArea from "../Components/CMTextArea.svelte";
  import { aiSettingsTokens } from "../utils/settingsTokens";
  import type { AiSettingOption, AiSettingsType } from "./types";
  import { saveSettings } from "../utils/utils";
  import { userData } from "../state.svelte";
  import { company, displayName, version } from "../../../shared/shared";

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
</script>

<div class="tab-content">
  <button
    id="hero-button"
    onclick={async (e) => {
      const ele = e.currentTarget;
      ele.textContent = "Running...";
      ele.setAttribute("disabled", "true");
      // set show_completion_dialog_box
      // unless set by user
      if (window.cep) {
        // let disabled state kick in
        await delay(500);
        const missingFontFamilies = await evalTS("runNightly", {
          settings: {
            show_completion_dialog_box: true,
            ...$settingsObject,
          },
          code: { css: $stylesString, fontsConfig: userData.fontsConfig },
        });
        if (missingFontFamilies.length > 0) {
          missingFontFamilies.forEach((family) => {
            userData.fontsConfig[family] = "";
          });
        }
        saveSettings($settingsObject, $styles);
        ele.textContent = "Run AI2SVELTE";
        ele.removeAttribute("disabled");
      } else {
        setTimeout(() => {
          ele.textContent = "Run AI2SVELTE";
          ele.removeAttribute("disabled");
        }, 2000);
      }
    }}>Run AI2SVELTE</button
  >

  <p id="about-line">{displayName} v{version} by {company}</p>
</div>

<style lang="scss">
  @use "../styles/variables.scss" as *;

  .tab-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 16px;
  }

  #hero-button {
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

  #hero-button:hover {
    background-color: var(--color-accent-primary);
    color: var(--color-white);
  }

  #hero-button:disabled {
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

  .options {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
  }

  .ai-setting {
    flex-grow: 1;
    transition: 0.3s ease;
  }

  #about-line {
    text-align: center;
    color: var(--color-tertiary);
  }
</style>
