<script lang="ts">
  import { onDestroy, onMount, untrack } from "svelte";
  import { get } from "svelte/store";
  import { csi, evalTS } from "../lib/utils/bolt";
  import "./index.scss";
  import { isCEP, settingsObject, styles, updateInProgress } from "./stores";
  import { userData } from "./state.svelte";
  import "./styles/main.scss";
  import { readUserSettings, saveSettings } from "./utils/utils";

  import Intro from "./Components/Intro.svelte";
  import TabBar from "./Components/TabBar.svelte";
  import Settings from "./Tabs/Settings.svelte";
  import CSS from "./Tabs/CSS.svelte";
  import Home from "./Tabs/Home.svelte";
  import Preview from "./Tabs/Preview.svelte";

  let splashScreen: boolean = $state(false);
  let activeTab: string = $state("HOME");
  let previousSettings: Record<string, any> | undefined = $state();

  // if plugin is running in Illustrator,
  // listen to document change event
  $effect(() => {
    if (csi && window.cep) {
      untrack(() => {
        // fetch current ai file's settings when document changed
        csi.addEventListener("documentAfterActivate", () => {
          fetchSettings();
        });
      });
    }
  });

  /**
   * Fetches plugin settings from Illustrator document,
   * updates the corresponding Svelte stores, and manages the splash screen state.
   *
   * @async
   * @returns {Promise<void>} Resolves when settings and styles have been fetched and updated.
   */
  async function fetchSettings() {
    // fetch user settings
    // and update the store
    const userSettings = readUserSettings();
    if (userSettings) {
      userData.theme = userSettings.theme;
      userData.accentColor = userSettings.accentColor;
      userData.fontsConfig = userSettings.fontsConfig || {};
    }

    const fetchedSettings = await evalTS("getVariable", "ai-settings");
    settingsObject.set(fetchedSettings);

    const fetchedStyles = await evalTS("getVariable", "css-settings");
    styles.set(fetchedStyles);

    updateInProgress.set(false);

    // data is loaded
    if (splashScreen) {
      splashScreen = true;
    }
  }

  onMount(() => {
    isCEP.set(window.cep);

    if (get(isCEP)) {
      $updateInProgress = true;
      fetchSettings();
      previousSettings = { ...$settingsObject };
      splashScreen = true;
    } else {
      // handle splash for testing
      setTimeout(() => {
        splashScreen = true;
      }, 3000);
    }
  });

  onDestroy(() => {
    // save XMPMetadata when settings object changes
    // avoid saving XMPMetadata on style changes to prevent too many calls
    if (window.cep) {
      // save settings objects if settings are modified
      if (
        JSON.stringify(previousSettings) !== JSON.stringify($settingsObject)
      ) {
        saveSettings($settingsObject, $styles);
        console.log("saved");
      }
    }
  });
</script>

<div class="app">
  <!-- <Intro bind:loaded={splashScreen} /> -->

  {#if splashScreen}
    <TabBar bind:activeLabel={activeTab} />

    {#if activeTab === "HOME"}
      <Home />
    {:else if activeTab === "CSS"}
      <CSS />
    {:else if activeTab === "PREVIEW"}
      <Preview />
    {:else if activeTab === "SETTINGS"}
      <Settings />
    {/if}
  {/if}
</div>
