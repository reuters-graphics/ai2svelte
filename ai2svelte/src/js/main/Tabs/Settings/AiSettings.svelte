<script lang="ts">
  import { onDestroy, onMount, untrack } from "svelte";
  import { fly } from "svelte/transition";
  import {
    settingsObject,
    stylesString,
    styles,
    updateInProgress,
  } from "../../stores";
  import SectionTitle from "../../Components/SectionTitle.svelte";
  import Input from "../../Components/Input.svelte";
  import CmTextArea from "../../Components/CMTextArea.svelte";
  import { aiSettingsTokens } from "../../utils/settingsTokens";

  // BOLT IMPORTS
  import { evalTS } from "../../../lib/utils/bolt";

  let { activeFormat = $bindable(), defaultProfile } = $props();

  let codeContent: HTMLElement | undefined = $state();

  let previousSettings: Record<string, any> | undefined = $state();

  // holds key-value pairs as string
  let yamlString: string = $derived.by(() => {
    // if (window.cep && !updateInProgress) {
    //   evalTS("updateAiSettings", "ai-settings", $settingsObject);
    // }
    return Object.keys($settingsObject)
      .filter((key) => $settingsObject[key] !== null)
      .map((key) => `${key}: ${$settingsObject[key]}`)
      .join("\n")
      .trim();
  });

  // same as yamlString but used actively
  // by the text editor
  // Sync the derived yamlString to the editable version when styles change
  let editableYamlString: string = $derived(yamlString);

  onMount(() => {
    // start with UI tab as active
    activeFormat = "UI";

    if (Object.keys($settingsObject).length > 0) {
      previousSettings = { ...$settingsObject };
    } else {
      $settingsObject = { ...defaultProfile };
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
        {#if $settingsObject && aiSettingsTokens}
          {#each Object.keys($settingsObject) as key, index}
            {@const type =
              aiSettingsTokens.find((item) => item.label == key).inputType ||
              "text"}
            <div class="ai-setting">
              {#if type == "select"}
                {@const options = aiSettingsTokens.find(
                  (item) => item.label == key
                ).options}
                <Input
                  label={key}
                  {options}
                  bind:value={$settingsObject[key] as string}
                  delay={index * 30}
                />
              {:else if type == "range"}
                {@const start = aiSettingsTokens.find(
                  (item) => item.label == key
                ).start}
                {@const end = aiSettingsTokens.find(
                  (item) => item.label == key
                ).end}
                <Input
                  label={key}
                  bind:value={$settingsObject[key]}
                  start={start ?? 0}
                  end={end ?? 100}
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
