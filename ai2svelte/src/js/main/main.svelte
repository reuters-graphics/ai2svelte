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
  import { convertStringToObject, parseSnippetSettings } from "./Tabs/utils";
  import tippy from "tippy.js";
  import type { Style } from "./stores";

  import TabBar from "./TabBar.svelte";
  import Home from "./Tabs/Home.svelte";
  import Components from "./Tabs/Components.svelte";
  import Extras from "./Tabs/Extras.svelte";

  let activeTab: string = $state("HOME");

  //* Demonstration of Traditional string eval-based ExtendScript Interaction
  const jsxTest = () => {
    console.log(evalES(`helloWorld("${csi.getApplicationID()}")`));
  };

  //* Demonstration of End-to-End Type-safe ExtendScript Interaction
  const jsxTestTS = () => {
    evalTS("helloStr", "test").then((res) => {
      console.log(res);
    });
    evalTS("helloNum", 1000).then((res) => {
      console.log(typeof res, res);
    });
    evalTS("helloArrayStr", ["ddddd", "aaaaaa", "zzzzzzz"]).then((res) => {
      console.log(typeof res, res);
    });
    evalTS("helloObj", { height: 90, width: 100 }).then((res) => {
      console.log(typeof res, res);
      console.log(res.x);
      console.log(res.y);
    });
    evalTS("helloVoid").then(() => {
      console.log("function returning void complete");
    });
    evalTS("helloError", "test").catch((e) => {
      console.log("there was an error", e);
    });
    // evalTS("helloWorld").then((res) => {
    //   console.log(typeof res, res);
    // });
  };

  const nodeTest = () => {
    alert(
      `Node.js ${process.version}\nPlatform: ${
        os.platform
      }\nFolder: ${path.basename(window.cep_node.global.__dirname)}`,
    );
  };

  $effect(() => {
    if (csi && window.cep) {
      untrack(() => {
        csi.addEventListener("documentAfterActivate", (e) => {
          fetchSettings();
        });

        csi.addEventListener("selectionAfterChange", (e) => {
          console.log(e);
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
    const settings = await evalTS("fetchAiSettings", "ai2html-settings");
    updateSettingsStore(settings);

    const styles = await evalTS("fetchAiSettings", "shadow-settings");
    updateStylesStore(styles);

    const snippets = await evalTS("fetchAiSettings", "snippet-settings");
    updateSnippetsStore(snippets);

    updateInProgress.set(false);
  }

  onMount(() => {
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
  {:else if activeTab === "COMPONENTS"}
    <Components />
  {:else if activeTab === "EXTRAS"}
    <Extras />
  {/if}
</div>
