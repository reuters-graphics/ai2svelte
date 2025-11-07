<script lang="ts">
  import { onMount, untrack } from "svelte";
  import {
    savedSettings,
    settingsObject,
    savedStyles,
    styles,
    updateInProgress,
  } from "../stores";

  // COMPONENT
  import CmTextArea from "../Components/CMTextArea.svelte";
  import SectionTitle from "../Components/SectionTitle.svelte";
  import Button from "../Components/Button.svelte";

  // BOLT IMPORTS
  import { version } from "../../../shared/shared";
  import { evalTS } from "../../lib/utils/bolt";

  // holds key-value pairs for live settings as string
  let yamlSettingsString: string = $derived.by(() => {
    if ($settingsObject && !$updateInProgress) {
      return Object.keys($settingsObject)
        .filter((key) => $settingsObject[key] !== null)
        .map((key) => `${key}: ${$settingsObject[key]}`)
        .join("\n")
        .trim();
    } else {
      return "";
    }
  });

  // holds key-value pairs for saved settings as string
  let yamlSavedSettingsString: string = $derived.by(() => {
    if ($savedSettings && !$updateInProgress) {
      return Object.keys($savedSettings)
        .filter((key) => $savedSettings[key] !== null)
        .map((key) => `${key}: ${$savedSettings[key]}`)
        .join("\n")
        .trim();
    } else {
      return "";
    }
  });

  // holds styles object as string
  let liveCssString: string = $derived.by(() => {
    if ($styles?.root && !$updateInProgress) {
      let string = $styles?.root?.toString() || "";
      return string;
    } else {
      return "";
    }
  });

  let savedCssString: string = $derived.by(() => {
    if ($savedStyles?.root && !$updateInProgress) {
      let string = $savedStyles?.root?.toString() || "";
      //   string = JSON.stringify($savedStyles);
      return string;
    } else {
      return "";
    }
  });

  let activeTab = $state("Settings");

  function resetFileData() {
    console.log("Resetting file data...");
    evalTS("setVariable", "ai-settings", {});
    evalTS("setVariable", "version", { version: version });
    alert("File data has been reset. Rerun ai2svelte to save changes.");
  }
</script>

<div class="tab-content">
  <Button text="reset file data" onClick={resetFileData} />
  <SectionTitle
    title="Debug objects"
    labels={["Settings", "Styles"]}
    bind:activeValue={activeTab}
    tooltipDescription={["Show settings", "Show styles"]}
  />
  {#if activeTab == "Settings"}
    <p>Saved settings</p>
    <CmTextArea
      bind:textValue={yamlSavedSettingsString}
      readonly={true}
      type="yaml"
    />
    <p>Live settings</p>
    <CmTextArea
      bind:textValue={yamlSettingsString}
      readonly={true}
      type="yaml"
    />
  {:else if activeTab == "Styles"}
    <p>Saved Styles</p>
    <CmTextArea bind:textValue={savedCssString} type="css" readonly={true} />
    <p>Live Styles</p>
    <CmTextArea bind:textValue={liveCssString} type="css" readonly={true} />
  {/if}
</div>

<style lang="scss">
  .tab-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
</style>
