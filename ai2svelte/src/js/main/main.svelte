<script lang="ts">
  // SVELTE IMPORTS
  import { onMount, untrack } from "svelte";
  import {
    settingsObject,
    styles,
    updateInProgress,
    ai2svelteInProgress,
    savedSettings,
    savedStyles,
    userAnimations,
    userShadows,
    userSpecimens,
    userShadowsBaked,
  } from "./stores";

  // BOLT IMPORTS
  import { csi, evalTS } from "../lib/utils/bolt";
  import { version } from "../../shared/shared";

  // STYLE IMPORT
  import "./index.scss";
  import "./styles/main.scss";
  import defaultAnimations from "./Tabs/data/animations.json?raw";
  import defaultShadows from "./Tabs/data/shadows.json?raw";
  import defaultSpecimens from "./Tabs/data/specimens.json?raw";

  // OTHER IMPORTS
  import JSON5 from "json5";
  import { userData } from "./state.svelte";
  import { readFile, saveSettings, writeFile } from "./utils/utils";
  import defaultProfile from "./Tabs/data/default-profile.json";
  import { parseCSS } from "./utils/cssUtils";
  import { bakeShadows } from "./utils/bakeShadows";
  import postcss from "postcss";
  // @ts-ignore
  import safeParser from "postcss-safe-parser";
  // @ts-ignore
  import { precheck } from "./precheck/precheck.js";

  // TABS
  import TabBar from "./Components/TabBar.svelte";
  import Settings from "./Tabs/Settings/Settings.svelte";
  import Styles from "./Tabs/Styles.svelte";
  import Home from "./Tabs/Home/Home.svelte";
  import Inspect from "./Tabs/Inspect.svelte";
  import Alert from "./Components/Alert.svelte";

  let splashScreen: boolean = $state(false);
  let activeTab: string = $state("HOME");
  let previousSettings: Record<string, any> | undefined = $state();
  let showAlert: { flag: boolean; message: string } = $state({
    flag: true,
    message: "",
  });

  let inspectMode: boolean = $state(false);

  /**
   * Fetches plugin settings from Illustrator document,
   * updates the corresponding Svelte stores, and manages the splash screen state.
   *
   * @async
   * @returns {Promise<void>} Resolves when settings and styles have been fetched and updated.
   */
  async function fetchSettings(): Promise<void> {
    // fetch user settings
    // and update the store
    const userSettings = readFile("user-settings.json");
    if (userSettings && Object.keys(userSettings).length != 0) {
      console.log("found user settings");
      userData.theme = userSettings.theme;
      userData.accentColor = userSettings.accentColor;
      userData.fontsConfig = userSettings.fontsConfig || {};
    } else {
      console.log("no user settings found, creating settings file");
      writeFile("user-settings.json", userData);
    }

    console.log("fetching settings...");
    const fetchedSettings = await evalTS("getVariable", "ai-settings");

    if (Object.keys(fetchedSettings).length == 0) {
      // no settings found, first time use
      // use user's default settings
      let usersProfiles = await readFile("user-profiles.json");

      if (usersProfiles && Object.keys(usersProfiles).includes("default")) {
        settingsObject.set(usersProfiles.default);
      } else {
        settingsObject.set(defaultProfile.default);
      }
      savedSettings.set({});
      $styles = await postcss().process("", { parser: safeParser });
      $savedStyles = await postcss().process("", { parser: safeParser });
    } else {
      // settings found, use them
      savedSettings.set({ ...fetchedSettings });
      settingsObject.set({ ...fetchedSettings });
      const fetchedStyles = await evalTS("getVariable", "css-settings");
      const stylesAST = await parseCSS(fetchedStyles.styleText);
      $savedStyles = await postcss().process(stylesAST.root.clone(), {
        from: undefined,
      });
      $styles = await postcss().process(stylesAST.root.clone(), {
        from: undefined,
      });
    }
  }

  /**
   * Fetches users style JSONs from user data
   */
  function fetchStyleJSONs(): void {
    if (window.cep == undefined) {
      // take defaults into account for browser
      $userAnimations = JSON5.parse(defaultAnimations);
      $userShadows = JSON5.parse(defaultShadows);
      $userSpecimens = JSON5.parse(defaultSpecimens);
      $userShadowsBaked = bakeShadows($userShadows);
      return;
    }
    // handle user animations
    let animations = readFile("user-animations.json");
    if (animations && Object.keys(animations).length !== 0) {
      $userAnimations = animations;
    } else {
      let defAnimations = JSON5.parse(defaultAnimations);
      writeFile("user-animations.json", defAnimations);
      $userAnimations = defAnimations;
    }

    // handle user shadows
    let shadows = readFile("user-shadows.json");
    if (shadows && Object.keys(shadows).length !== 0) {
      $userShadows = shadows;
    } else {
      let defShadows = JSON5.parse(defaultShadows);
      writeFile("user-shadows.json", defShadows);
      $userShadows = defShadows;
    }

    $userShadowsBaked = bakeShadows($userShadows);

    // handle user specimens
    let specimens = readFile("user-specimens.json");
    if (specimens && Object.keys(specimens).length !== 0) {
      $userSpecimens = specimens;
    } else {
      let defSpecimens = JSON5.parse(defaultSpecimens);
      writeFile("user-specimens.json", defSpecimens);
      $userSpecimens = defSpecimens;
    }
  }

  //   Trigger Inspect Tab with Ctrl+Shift+I
  function keyboardListener(e: KeyboardEvent) {
    const isCtrl = e.ctrlKey;
    const isShift = e.shiftKey;
    const isIKey = e.key.toLowerCase() === "i";

    if (isCtrl && isShift && isIKey) {
      e.preventDefault(); // Optional: prevent default DevTools opening
      inspectMode = !inspectMode;

      if (!inspectMode && activeTab === "INSPECT") {
        const labelHome = document.querySelector<HTMLElement>("#label-Home");
        labelHome?.click();
      } else if (inspectMode && activeTab !== "INSPECT") {
        setTimeout(() => {
          const labelInspect =
            document.querySelector<HTMLElement>("#label-Inspect");
          labelInspect?.click();
        }, 100);
      }
    }
  }

  function performPrecheck() {
    // do initial checks
    precheck();

    fetchSettings();
    $updateInProgress = false;

    fetchStyleJSONs();
  }

  onMount(() => {
    // load user settings and styles on mount
    if (window.cep) {
      $updateInProgress = true;

      performPrecheck();

      previousSettings = { ...$settingsObject };
      splashScreen = true;
    } else {
      fetchStyleJSONs();
      // handle splash for testing
      setTimeout(() => {
        splashScreen = true;
      }, 300);
    }

    window.addEventListener("keydown", keyboardListener);

    return () => {
      window.removeEventListener("keydown", keyboardListener);

      // save XMPMetadata when settings object changes
      // avoid saving XMPMetadata on style changes to prevent too many calls
      if (window.cep) {
        // save settings objects if settings are modified
        if (
          JSON.stringify(previousSettings) !== JSON.stringify($settingsObject)
        ) {
          saveSettings($settingsObject, $styles, version);
        }
      }
    };
  });

  // if settings/styles changes,
  // show alert saying there are unsaved changes
  $effect(() => {
    if ($settingsObject || $styles) {
      const settingsMatch =
        JSON.stringify($savedSettings) == JSON.stringify($settingsObject);
      const savedCSS = $savedStyles?.css || "";
      const currentCSS = $styles?.css || "";
      const stylesMatch = savedCSS == currentCSS;

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
          fetchStyleJSONs();
        });
      });
    }
  });
</script>

{#if splashScreen}
  {#if showAlert.flag}
    <Alert message={showAlert.message} />
  {/if}
  <TabBar bind:activeLabel={activeTab} {inspectMode} />

  {#if activeTab === "HOME"}
    <Home refreshSettings={fetchSettings} />
  {:else if activeTab === "STYLES"}
    <Styles />
    <!-- {:else if activeTab === "PREVIEW"} -->
    <!-- <Preview /> -->
  {:else if activeTab === "SETTINGS"}
    <Settings />
  {:else if activeTab === "INSPECT"}
    <Inspect />
  {/if}
{/if}

<style lang="scss">
</style>
