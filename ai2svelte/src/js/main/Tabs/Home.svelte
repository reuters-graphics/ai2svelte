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

  let activeFormat: string = $state("");
  let codeContent: HTMLElement | undefined = $state();

  let previousSettings: Record<string, any> | undefined = $state();

  // holds key-value pairs as string
  let yamlString: string = $derived.by(() => {
    return Object.keys($settingsObject)
      .filter((key) => $settingsObject[key] !== null)
      .map((key) => `${key}: ${$settingsObject[key]}`)
      .join("\n")
      .trim();
  });

  // same as yamlString but used actively
  // by the text editor
  let editableYamlString: string = $state("");

  // if no key-value pairs found in settingsObject,
  // initialise it with default pairs from AiSettings
  $effect(() => {
    if (Object.keys($settingsObject).length == 0 && AiSettings) {
      // avoid circular dependency by updating settingsObject in untrack
      untrack(() => {
        const obj = JSON.parse(JSON.stringify(AiSettings));

        Object.keys(AiSettings).forEach((key) => {
          const typedKey = key as keyof typeof AiSettings;
          obj[key] = (AiSettings[typedKey] as AiSettingOption).value;
        });

        settingsObject.set(JSON.parse(JSON.stringify(obj)));
      });
    }
  });

  // Sync the derived yamlString to the editable version when styles change
  $effect(() => {
    editableYamlString = yamlString;
  });

  onMount(() => {
    // start with UI tab as active
    activeFormat = "UI";

    if ($settingsObject) {
      previousSettings = { ...$settingsObject };
    }
  });

  // onDestroy(() => {
  //     // save XMPMetadata when settings object changes
  //     // avoid saving XMPMetadata on style changes to prevent too many calls
  //     if (window.cep) {
  //         // save settings objects if settings are modified
  //         if (
  //             JSON.stringify(previousSettings) !==
  //             JSON.stringify($settingsObject)
  //         ) {
  //             saveSettings($settingsObject, $styles);
  //         }
  //     }
  // });

  // converts string in textarea to js object
  function convertStringToObject(s: string) {
    const obj: { [key: string]: unknown } = {};
    s.trim()
      .split("\n")
      .forEach((line) => {
        const [key, ...rest] = line.split(":");
        if (key && rest.length) {
          let value: unknown = rest.join(":").trim();
          // Try to convert to number if possible
          // if (parseInt(value as string)) {
          //     value = Number(value);
          // }
          obj[key.trim()] = value;
        }
      });

    settingsObject.set(obj);

    // if (window.cep) {
    //     saveSettings($settingsObject, $styles);
    // }
  }

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

  <SectionTitle
    title={"Settings"}
    labels={["UI", "Code"]}
    tooltipDescription={["Simplified settings", "Advanced settings"]}
    bind:activeValue={activeFormat}
  />

  <div class="content">
    {#if activeFormat === "UI"}
      <div
        id="ui-form"
        class="options content-item"
        in:fly={{ y: -50, duration: 300 }}
        out:fly={{ y: 50, duration: 300 }}
      >
        {#if $settingsObject}
          {#each Object.keys($settingsObject) as key, index}
            <div class="ai-setting">
              {#if (AiSettings[key as keyof AiSettingsType] as AiSettingOption)?.type == "select"}
                <Input
                  label={key}
                  options={(
                    AiSettings[key as keyof AiSettingsType] as AiSettingOption
                  ).options}
                  bind:value={$settingsObject[key] as string}
                  delay={index * 30}
                />
              {:else if (AiSettings[key as keyof AiSettingsType] as AiSettingOption)?.type == "range"}
                <Input
                  label={key}
                  bind:value={$settingsObject[key]}
                  start={(
                    AiSettings[key as keyof AiSettingsType] as AiSettingOption
                  )?.start ?? 0}
                  end={(
                    AiSettings[key as keyof AiSettingsType] as AiSettingOption
                  )?.end ?? 100}
                  type="range"
                  delay={index * 30}
                />
              {:else}
                <!-- avoid condition here to allow any keys from Code section as text input -->
                <Input
                  label={key}
                  bind:value={$settingsObject[key]}
                  type="text"
                  delay={index * 30}
                />
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    {:else if activeFormat === "Code"}
      <div
        id="aisettings-textarea"
        class="content-item code-editor"
        bind:this={codeContent}
        in:fly={{ y: -50, duration: 300 }}
        out:fly={{ y: 50, duration: 300 }}
      >
        {#if aiSettingsTokens}
          <CmTextArea
            type="yaml"
            bind:textValue={editableYamlString}
            onUpdate={(e: string) => {
              convertStringToObject(e);
            }}
            autoCompletionTokens={aiSettingsTokens}
          />
        {/if}
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  @use "../styles/variables.scss" as *;

  .tab-content {
    display: flex;
    flex-direction: column;
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
</style>
