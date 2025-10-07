<script lang="ts">
  // SVELTE IMPORTS
  import { onDestroy, onMount, untrack } from "svelte";
  import {
    settingsObject,
    styles,
    updateInProgress,
    ai2svelteInProgress,
    savedSettings,
    savedStyles,
  } from "./stores";
  import { fly } from "svelte/transition";

  // BOLT IMPORTS
  import { csi, evalTS } from "../lib/utils/bolt";

  // STYLE IMPORT
  import "./index.scss";
  import "./styles/main.scss";

  // OTHER IMPORTS
  import { userData } from "./state.svelte";
  import { readFile, saveSettings } from "./utils/utils";
  import defaultProfile from "./Tabs/data/default-profile.json";
  import { parseCSS } from "./utils/cssUtils";
  // TABS
  import TabBar from "./Components/TabBar.svelte";
  import Settings from "./Tabs/Settings.svelte";
  import Styles from "./Tabs/Styles.svelte";
  import Home from "./Tabs/Home.svelte";
  import Debug from "./Tabs/Debug.svelte";

  let splashScreen: boolean = $state(false);
  let activeTab: string = $state("HOME");
  let previousSettings: Record<string, any> | undefined = $state();
  let showAlert: { flag: boolean; message: string } = $state({
    flag: true,
    message: "",
  });

  // if plugin is running in Illustrator,
  // listen to document change event
  $effect(() => {
    if (csi && window.cep) {
      untrack(() => {
        // fetch current ai file's settings when document changed
        csi.addEventListener("documentAfterActivate", () => {
          // don't fetch settings if ai2svelte is in progress
          // the window might focus off and on while ai2svelte is running
          if ($ai2svelteInProgress) return;
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
    const userSettings = readFile("user-settings.json");
    if (userSettings) {
      userData.theme = userSettings.theme;
      userData.accentColor = userSettings.accentColor;
      userData.fontsConfig = userSettings.fontsConfig || {};
    }

    const fetchedSettings = await evalTS("getVariable", "ai-settings");

    if (Object.keys(fetchedSettings).length == 0) {
      // no settings found, probably first time use
      // use user's default settings
      let usersProfiles = readFile("user-profiles.json");
      if (usersProfiles && Object.keys(usersProfiles).includes("default")) {
        settingsObject.set(usersProfiles.default);
      } else {
        settingsObject.set(defaultProfile);
      }
      savedSettings.set({});
      styles.set({});
      savedStyles.set({});
    } else {
      // settings found, use them
      savedSettings.set({ ...fetchedSettings });
      settingsObject.set({ ...fetchedSettings });
      const fetchedStyles = await evalTS("getVariable", "css-settings");
      const stylesAST = await parseCSS(fetchedStyles.styleText);
      savedStyles.set(stylesAST);
      styles.set(stylesAST);
    }

    updateInProgress.set(false);

    // data is loaded
    if (splashScreen) {
      splashScreen = true;
    }
  }

  onMount(() => {
    if (window.cep) {
      $updateInProgress = true;
      fetchSettings();
      previousSettings = { ...$settingsObject };
      splashScreen = true;
    } else {
      // handle splash for testing
      setTimeout(() => {
        splashScreen = true;
      }, 300);
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
      }
    }
  });

  // if settings/styles changes,
  // show alert saying there are unsaved changes
  $effect(() => {
    if ($settingsObject || $styles) {
      const settingsMatch =
        JSON.stringify($savedSettings) == JSON.stringify($settingsObject);
      const stylesMatch = $savedStyles.css == $styles.css;

      if (stylesMatch && settingsMatch) {
        showAlert = { flag: false, message: "" };
      } else {
        showAlert = {
          flag: true,
          message: "There are unsaved changes. Run ai2svelte to save changes.",
        };
      }
    }
  });
</script>

{#if splashScreen}
  {#if showAlert.flag}
    <div class="alert" transition:fly={{ y: 20 }}>
      {showAlert.message}
    </div>
  {/if}
  <TabBar bind:activeLabel={activeTab} />

  {#if activeTab === "HOME"}
    <Home refreshSettings={fetchSettings} />
  {:else if activeTab === "STYLES"}
    <Styles />
    <!-- {:else if activeTab === "PREVIEW"} -->
    <!-- <Preview /> -->
  {:else if activeTab === "SETTINGS"}
    <Settings />
  {:else if activeTab === "DEBUG"}
    <Debug />
  {/if}
{/if}

<style lang="scss">
  .alert {
    width: 100%;
    text-align: center;
    background-color: hsl(349 46% 12% / 1);
    color: hsl(349 70% 45% / 1);
    padding: 0.25rem 0.25rem 0.35rem 0.25rem;
    border-radius: 2px;
    margin-bottom: 1rem;
  }
</style>
