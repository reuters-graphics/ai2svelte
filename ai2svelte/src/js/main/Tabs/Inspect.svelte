<script lang="ts">
  import {
    savedSettings,
    settingsObject,
    savedStyles,
    styles,
    updateInProgress,
  } from "../stores";

  // COMPONENT
  import { mount } from "svelte";
  import SectionTitle from "../Components/SectionTitle.svelte";
  import Button from "../Components/Button.svelte";
  import Toast from "../Components/Toast.svelte";

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
    const onError = (label: string) => (error: unknown) => {
      console.error(`[ai2svelte] ${label} failed:`, error);
      mount(Toast, {
        target: document.body,
        props: {
          message: `Error resetting file data: ${error instanceof Error ? error.message : String(error)}`,
          duration: 4000,
        },
      });
    };
    evalTS("setVariable", "ai-settings", {}).catch(onError("setVariable ai-settings"));
    evalTS("setVariable", "version", { version: version }).catch(onError("setVariable version"));
    alert("File data has been reset. Rerun ai2svelte to save changes.");
  }

  let settingsDiff = $derived(
    diffLines(SavedYamlSettingsString, currentYamlSettingsString),
  );
  let stylesDiff = $derived(diffLines(savedCssString, currentCssString));


</script>

<div class="tab-content">
  <div class="inspect-tools">
    <SectionTitle
      title="Debug objects"
      labels={["Settings", "Styles"]}
      bind:activeValue={activeTab}
      tooltipDescription={["Show settings", "Show styles"]}
    />
    {#if activeTab == "Settings"}
      <div class="diff-checker">
        {#each settingsDiff as row}
          <p
            class="status-{row.added ? 'added' : row.removed ? 'removed' : ''}"
          >
            {@html row.value.replaceAll("\n", "<br>")}
          </p>
        {/each}
      </div>
    {:else if activeTab == "Styles"}
      <div class="diff-checker">
        {#each stylesDiff as row}
          <p
            class="status-{row.added ? 'added' : row.removed ? 'removed' : ''}"
          >
            {@html row.value.replaceAll("\n", "<br>")}
          </p>
        {/each}
      </div>
    {/if}
  </div>
  <Button text="reset file metadata" onClick={resetFileData} />
</div>

<style lang="scss">
  .tab-content {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
  }

  .inspect-tools {
    display: flex;
    flex-direction: column;
    gap: var(--space-m);
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
