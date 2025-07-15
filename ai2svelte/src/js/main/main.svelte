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
  import unescapeJs from "unescape-js";
  import "../index.scss";
  import "./main.scss";
  import {
    settingsObject,
    styles,
    updateInProgress,
    isCEP,
    snippets,
  } from "./stores";
  import {
    convertStringToObject,
    parseSnippetSettings,
    initTippy,
  } from "./Tabs/utils";
  import type { Style } from "./stores";

  import TabBar from "./TabBar.svelte";
  import Home from "./Tabs/Home.svelte";
  import CSS from "./Tabs/CSS.svelte";
  import Preview from "./Tabs/Preview.svelte";

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

  $effect.pre(() => {
    if (activeTab) {
      if (window.cep) {
        updateInProgress.set(true);
        fetchSettings();
      }
    }
  });

  async function fetchSettings() {
    const fetchedSettings = await evalTS("getVariable", "ai-settings");
    settingsObject.set(fetchedSettings);

    updateInProgress.set(false);
  }

  onMount(() => {
    initTippy();

    isCEP.set(window.cep);
    if (get(isCEP)) {
      fetchSettings();
    }

    tippy("[data-tippy-content]", {
      theme: "dark",
      arrow: false,
      placement: "top",
      delay: [500, null],
    });
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
  <TabBar bind:activeLabel={activeTab} />

  {#if activeTab === "HOME"}
    <Home />
  {:else if activeTab === "CSS"}
    <CSS />
  {:else if activeTab === "PREVIEW"}
    <Preview />
  {/if}
</div>
