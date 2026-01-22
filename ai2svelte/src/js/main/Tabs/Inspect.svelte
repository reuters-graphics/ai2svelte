<script lang="ts">
  import {
    savedSettings,
    settingsObject,
    savedStyles,
    styles,
    updateInProgress,
  } from "../stores";

  // COMPONENT
  import SectionTitle from "../Components/SectionTitle.svelte";
  import Button from "../Components/Button.svelte";

  // BOLT IMPORTS
  import { version } from "../../../shared/shared";
  import { evalTS } from "../../lib/utils/bolt";

  // LIB IMPORTS
  import { diffLines } from "diff";

  // holds key-value pairs for current settings as string
  let currentYamlSettingsString: string = $derived.by(() => {
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
  let SavedYamlSettingsString: string = $derived.by(() => {
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
  let currentCssString: string = $derived.by(() => {
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

  let settingsDiff = $derived(
    diffLines(SavedYamlSettingsString, currentYamlSettingsString),
  );
  let stylesDiff = $derived(diffLines(savedCssString, currentCssString));

  $inspect(settingsDiff);
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
    <div class="diff-checker">
      {#each settingsDiff as row}
        <p class="status-{row.added ? 'added' : row.removed ? 'removed' : ''}">
          {@html row.value.replaceAll("\n", "<br>")}
        </p>
      {/each}
    </div>
  {:else if activeTab == "Styles"}
    <div class="diff-checker">
      {#each stylesDiff as row}
        <p class="status-{row.added ? 'added' : row.removed ? 'removed' : ''}">
          {@html row.value.replaceAll("\n", "<br>")}
        </p>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .tab-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .diff-checker {
    padding: var(--space-l);
    color: var(--color-text);
    background-color: var(--color-primary);
    border-radius: var(--space-s);

    p {
      padding: 2px 4px;
      margin: 0;
    }

    .status-removed {
      color: #d82028;
      background-color: #ca003522;
    }

    .status-added {
      color: #038c33;
      background-color: #038c3322;
    }
  }
</style>
