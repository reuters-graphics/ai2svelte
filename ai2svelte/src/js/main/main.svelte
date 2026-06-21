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
    unsavedChanges,
    forcePreview,
    docName,
    cache,
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
  import {
    fetchSavedSettings,
    readFile,
    saveSettings,
    writeFile,
  } from "./utils/utils";
  import { bakeShadows } from "./utils/bakeShadows";
  // @ts-ignore: precheck.js is a plain JS file with no TypeScript declarations
  import { precheck } from "./precheck/precheck.js";
  import { fetchSettings } from "./utils/utils";
  import type { SettingsObject } from "./Tabs/types";

  // TABS
  import TabBar from "./Components/TabBar.svelte";
  import Settings from "./Tabs/Settings/Settings.svelte";
  import Styles from "./Tabs/Styles/Styles.svelte";
  import Home from "./Tabs/Home/Home.svelte";
  import Inspect from "./Tabs/Inspect.svelte";
  import Alert from "./Components/Alert.svelte";
  import Confetti from "./Components/Confetti.svelte";

  // --- state ---

  let splashScreen: boolean = $state(false);
  let activeTab: string = $state("HOME");
  let previousSettings: SettingsObject | undefined = $state();
  let inspectMode: boolean = $state(false);

  /**
   * Loads user-authored JSON data (animations, shadows, specimens) from disk.
   * Falls back to bundled defaults if no user file exists.
   */
  function fetchStyleJSONs(): void {
    if (window.cep == undefined) {
      $userAnimations = JSON5.parse(defaultAnimations);
      $userShadows = JSON5.parse(defaultShadows);
      $userSpecimens = JSON5.parse(defaultSpecimens);
      $userShadowsBaked = bakeShadows($userShadows);
      return;
    }

    let animations = readFile("user-animations.json");
    if (animations && Object.keys(animations as object).length !== 0) {
      $userAnimations = animations as typeof $userAnimations;
    } else {
      const defAnimations = JSON5.parse(defaultAnimations);
      writeFile("user-animations.json", defAnimations);
      $userAnimations = defAnimations;
    }

    let shadows = readFile("user-shadows.json");
    if (shadows && Object.keys(shadows as object).length !== 0) {
      $userShadows = shadows as typeof $userShadows;
    } else {
      const defShadows = JSON5.parse(defaultShadows);
      writeFile("user-shadows.json", defShadows);
      $userShadows = defShadows;
    }

    $userShadowsBaked = bakeShadows($userShadows);

    let specimens = readFile("user-specimens.json");
    if (specimens && Object.keys(specimens as object).length !== 0) {
      $userSpecimens = specimens as string[];
    } else {
      const defSpecimens = JSON5.parse(defaultSpecimens);
      writeFile("user-specimens.json", defSpecimens);
      $userSpecimens = defSpecimens;
    }
  }

  // Trigger Inspect Tab with Ctrl+Shift+I
  function keyboardListener(e: KeyboardEvent) {
    const isCtrl = e.ctrlKey;
    const isShift = e.shiftKey;
    const isIKey = e.key.toLowerCase() === "i";

    if (isCtrl && isShift && isIKey) {
      e.preventDefault();
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

  /**
   * Restores settings/styles from the in-memory cache when the active AI document
   * changes. Falls back to a full fetchSettings() if no cache entry exists.
   */
  async function handleCache() {
    try {
      $docName = ((await evalTS("getDocumentName")) as unknown as string) || "";

      const activeDocs = ((await evalTS("getActiveDocumentsNames")) as string[]) || [];

      // Evict cache entries for documents that are no longer open
      Object.keys($cache).forEach((key) => {
        if (!activeDocs.includes(key)) {
          delete $cache[key];
        }
      });

      if ($cache[$docName]?.settingsObject) {
        await fetchSavedSettings();
        $settingsObject = $cache[$docName].settingsObject as SettingsObject;
        $styles = $cache[$docName].styles;
      } else {
        fetchSettings().catch((err) => {
          console.error("[ai2svelte] fetchSettings failed:", err);
        });
      }
    } catch (err) {
      console.error("[ai2svelte] handleCache failed:", err);
    }
  }

  async function performPrecheck() {
    precheck();

    handleCache().catch((err) => {
      console.error("[ai2svelte] handleCache error during precheck:", err);
    });

    $docName = ((await evalTS("getDocumentName")) as unknown as string) || "";

    fetchSettings().catch((err) => {
      console.error("[ai2svelte] fetchSettings error during precheck:", err);
    });

    $updateInProgress = false;

    fetchStyleJSONs();
  }

  onMount(() => {
    if (window.cep) {
      $updateInProgress = true;

      performPrecheck().catch((err) => {
        console.error("[ai2svelte] performPrecheck failed:", err);
      });

      previousSettings = { ...$settingsObject };
      splashScreen = true;
    } else {
      fetchStyleJSONs();
      setTimeout(() => {
        splashScreen = true;
      }, 300);
    }

    window.addEventListener("keydown", keyboardListener);

    return () => {
      window.removeEventListener("keydown", keyboardListener);

      // Save settings on panel unload if they changed.
      // Note: in a CEP runtime the panel is rarely truly unloaded,
      // but this acts as a safety net for browser testing.
      if (window.cep) {
        if (
          JSON.stringify(previousSettings) !== JSON.stringify($settingsObject)
        ) {
          saveSettings($settingsObject, { styleText: $styles?.root?.toString() }, version);
        }
      }
    };
  });

  // Show the unsaved-changes banner whenever settings or styles drift from their saved state
  $effect(() => {
    if ($settingsObject || $styles) {
      const settingsMatch =
        JSON.stringify($savedSettings) === JSON.stringify($settingsObject);
      const savedCSS = $savedStyles?.root?.toString() || "";
      const currentCSS = $styles?.root?.toString() || "";
      const stylesMatch = savedCSS.trim() === currentCSS.trim();

      if (stylesMatch && settingsMatch) {
        $unsavedChanges = { flag: false, message: "" };
      } else {
        $unsavedChanges = {
          flag: true,
          message: "There are unsaved changes. Run ai2svelte to save changes.",
        };
      }
    }
  });

  // Re-fetch settings when the active Illustrator document changes
  $effect(() => {
    if (csi && window.cep) {
      untrack(() => {
        csi.addEventListener("documentAfterActivate", async () => {
          // Skip if ai2svelte is mid-run — the window may focus in/out during that
          if ($ai2svelteInProgress) return;

          handleCache().catch((err) => {
            console.error("[ai2svelte] handleCache error on document change:", err);
          });
        });
      });
    }
  });
</script>

{#if splashScreen}
  <Confetti />

  {#if $unsavedChanges.flag}
    <Alert message={$unsavedChanges.message} />
  {/if}
  <TabBar bind:activeLabel={activeTab} {inspectMode} />

  {#if activeTab === "HOME"}
    <Home refreshSettings={fetchSettings} />
  {:else if activeTab === "STYLES"}
    <Styles />
  {:else if activeTab === "SETTINGS"}
    <Settings />
  {:else if activeTab === "INSPECT"}
    <Inspect />
  {/if}
{/if}

<style lang="scss">
</style>
