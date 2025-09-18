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

  import { styleObjectToString } from "../utils/cssUtils";

  // holds key-value pairs for live settings as string
  let yamlSettingsString: string = $derived.by(() => {
    return Object.keys($settingsObject)
      .filter((key) => $settingsObject[key] !== null)
      .map((key) => `${key}: ${$settingsObject[key]}`)
      .join("\n")
      .trim();
  });

  // holds key-value pairs for saved settings as string
  let yamlSavedSettingsString: string = $derived.by(() => {
    return Object.keys($savedSettings)
      .filter((key) => $savedSettings[key] !== null)
      .map((key) => `${key}: ${$savedSettings[key]}`)
      .join("\n")
      .trim();
  });

  // holds styles object as string
  let liveCssString: string = $derived.by(() => {
    let string = styleObjectToString($styles);
    return string;
  });

  let savedCssString: string = $derived.by(() => {
    let string = styleObjectToString($savedStyles);
    return string;
  });

  onMount(() => {});

  let activeTab = $state("Settings");
</script>

<div class="tab-content">
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
