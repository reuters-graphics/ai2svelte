<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { get } from "svelte/store";
  import { os, path } from "../lib/cep/node";
  import {
    csi,
    evalES,
    openLinkInBrowser,
    subscribeBackgroundColor,
    evalTS,
  } from "../lib/utils/bolt";
  import { isAppRunning } from "../lib/utils/bolt";
  import "../index.scss";
  import "./main.scss";
  import {
    settingsObject,
    styles,
    updateInProgress,
    isCEP,
    snippets,
  } from "./stores";
  import { convertStringToObject, parseSnippetSettings } from "./Tabs/utils";
  import type { Style } from "./stores";
  // @ts-ignore - Since HostAdapter isn't explicitly typed, linting throws an error we'll ignore
  import { AIEventAdapter, AIEvent } from "../../public/BoltHostAdapter.js";

  import Intro from "./Intro.svelte";
  import TabBar from "./TabBar.svelte";
  import Home from "./Tabs/Home.svelte";
  import CSS from "./Tabs/CSS.svelte";
  import Preview from "./Tabs/Preview.svelte";
  import About from "./Tabs/About.svelte";

  let splashScreen: boolean = $state(false);
  let activeTab: string = $state("HOME");

  $effect(() => {
    if (csi && window.cep) {
      untrack(() => {
        csi.addEventListener("documentAfterActivate", (e) => {
          fetchSettings();
        });
      });
    }
  });

  // $effect.pre(() => {
  //   if (activeTab) {
  //     if (window.cep) {
  //       updateInProgress.set(false);
  //       fetchSettings();
  //     }
  //   }
  // });

  async function fetchSettings() {
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
      fetchSettings();
    } else {
      // handle splash for testing
      setTimeout(() => {
        // splashScreen = false;
      }, 3000);
    }
  });

  function updateSettingsStore(str: string) {
    const updatedString = str.replace("ai2html-settings", "").trim();
    settingsObject.set(
      JSON.parse(JSON.stringify(convertStringToObject(updatedString))),
    );
  }

  function updateStylesStore(str: string) {
    const updatedString = str.replace("shadow-settings", "").trim();
    const obj: Record<string, Style> = {};

    const sheet = new CSSStyleSheet();
    sheet.replaceSync(updatedString);

    Array.from(sheet.cssRules).forEach((style) => {
      if (style.type === CSSRule.STYLE_RULE) {
        const styleRule = style as CSSStyleRule;
        const regex = `${styleRule.selectorText} \\{([^}]*)\\}`;
        const regexPattern = new RegExp(regex);
        const t =
          updatedString.match(regexPattern)?.[1]?.replaceAll("\t", "").trim() ??
          "";
        const allStyles = t
          .split(";")
          .filter((x) => !["", " ", null, undefined].includes(x))
          .map((x) => x.trim());

        const shadowNameRegex = new RegExp(`@includes shadow-([^(]*)(.*)`);
        const matchedStyle = allStyles
          .findLast((x: string) => x.match(/@includes shadow-*/g))
          ?.match(shadowNameRegex);
        const shadowName =
          matchedStyle && matchedStyle[1] ? matchedStyle[1] : "";

        obj[styleRule.selectorText] = {
          styles: allStyles,
          shadowName: shadowName,
        };
      }
    });

    styles.set(obj);
  }

  function updateSnippetsStore(str: string) {
    snippets.set(parseSnippetSettings(unescapeJs(str)));
    console.log(get(snippets));
  }
</script>

<div class="app">
  <Intro bind:loaded={splashScreen} />

  {#if splashScreen}
    <TabBar bind:activeLabel={activeTab} />

    {#if activeTab === "HOME"}
      <Home />
    {:else if activeTab === "CSS"}
      <CSS />
    {:else if activeTab === "PREVIEW"}
      <Preview />
    {:else if activeTab === "ABOUT"}
      <About />
    {/if}
  {/if}
</div>
