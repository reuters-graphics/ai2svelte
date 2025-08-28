<script lang="ts">
  import { onDestroy, onMount, untrack } from "svelte";
  import AiSettings from "../data/ai-settings.json";
  import { fly } from "svelte/transition";
  import { settingsObject, stylesString, styles } from "../../stores";
  import SectionTitle from "../../Components/SectionTitle.svelte";
  import Input from "../../Components/Input.svelte";
  import CmTextArea from "../../Components/CMTextArea.svelte";
  import { aiSettingsTokens } from "../../utils/settingsTokens";
  import type { AiSettingOption, AiSettingsType } from "../types";

  let { activeFormat = $bindable() } = $props();

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
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
</script>

<div class="ai-settings">
  <SectionTitle
    title={"Settings"}
    labels={["UI", "Code"]}
    tooltipDescription={["Simplified settings", "Advanced settings"]}
    bind:activeValue={activeFormat}
  />

  <div class="content">
    {#if activeFormat === "UI"}
      <div id="ui-form" class="options content-item">
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
  @use "../../styles/variables.scss" as *;

  .ai-settings {
    display: flex;
    flex-direction: column;
    gap: 1rem;
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
