<script lang="ts">
  // SVELTE IMPORTS
  import { onMount, untrack } from "svelte";
  import { fly } from "svelte/transition";
  // BOLT IMPORTS
  import { evalTS } from "../../../lib/utils/bolt";

  // DATA IMPORTS
  import { styles, updateInProgress, ai2svelteInProgress } from "../../stores";

  // OTHER LIB IMPORTS
  import postcss from "postcss";
  import { Rule, type Result, type Root } from "postcss";
  import * as prettier from "prettier/standalone";
  import parserPostCSS from "prettier/plugins/postcss";
  // @ts-ignore
  import {
    AIEvent,
    AIEventAdapter,
  } from "../../../../public/BoltHostAdapter.js";

  // COMPONENT IMPORTS
  import CmTextArea from "../../Components/CMTextArea.svelte";
  import Input from "../../Components/Input.svelte";
  import SectionTabBar from "../../Components/SectionTabBar.svelte";
  import PillsContainer from "./PillsContainer.svelte";
  import ExtraConfigs from "./ExtraConfigs.svelte";
  // @ts-ignore
  import safeParser from "postcss-safe-parser";

  // MISC
  import { syntaxTree } from "@codemirror/language";
  import type { EditorView } from "codemirror";
  import { stylesState } from "./stylesState.svelte";
  import Shadows from "./Shadows.svelte";
  import Animations from "./Animations.svelte";

  let activeTab: string = $state("shadows");
  let activeFormat: string = $state("UI");

  //   let cssSelector: string = $state(`p[class^="g-pstyle"]`);

  let initialLoad: boolean = $state(false);

  let previousStyles: Result<Root> | undefined = undefined;

  let previousSelector: string = "";

  let codeEditor: EditorView | undefined = $state();

  // holds styles object as string
  let cssString: string = $derived.by(() => {
    // don't update while its fetching settings from AI
    if (!$updateInProgress) {
      const string = $styles?.root?.toString() || "";

      return string;
    }
    return "";
  });

  // Sync the derived cssString to the editable version when styles change
  let editableCssString: string = $derived(cssString);

  // disable initial load once
  // the document data is received
  $effect(() => {
    if (initialLoad && editableCssString) {
      initialLoad = false;
    }
  });

  // if css identifier changes
  $effect(() => {
    if (stylesState.cssSelector) {
      previousSelector = stylesState.cssSelector;
    }
  });

  function getStyleIdentifier(): void {
    stylesState.cssSelector =
      stylesState.selectors.at(-1) || 'p[class^="g-pstyle"]';
  }

  // updates cssSelector based on the selected item in AI document
  async function detectIdentifier(): Promise<void> {
    const identifier = await evalTS("fetchSelectedItems");

    if (identifier) {
      stylesState.cssSelector = identifier;
    } else {
      stylesState.cssSelector = 'p[class^="g-pstyle"]';
    }
  }

  /**
   * Adds an event listener for the ART_SELECTION_CHANGED event using the AIEventAdapter singleton.
   * When the selection changes, it fetches the selected items' identifier using evalTS("fetchSelectedItems")
   * and updates the cssSelector variable accordingly. Needs AiHostAdapter plugin installed in the host system.
   *
   * Responsible for populating active css identifier when art selection changes.
   *
   */
  function addSelectionChangeEventListener(): void {
    const adapter = AIEventAdapter.getInstance();
    adapter.addEventListener(AIEvent.ART_SELECTION_CHANGED, async (e: any) => {
      console.log("ai2svelte in progress: styles", $ai2svelteInProgress);
      if ($ai2svelteInProgress) return;
      await detectIdentifier();
    });
  }

  // init styles to a POSTCSS AST format
  async function initiateStyles() {
    if ($styles == undefined || Object.keys($styles).length == 0) {
      $styles = await postcss().process("", { parser: safeParser });
    }
  }

  onMount(async () => {
    await initiateStyles();

    if (window.cep) {
      initialLoad = true;
      addSelectionChangeEventListener();
      detectIdentifier();
    }

    previousStyles = $styles;
  });

  // switches to UI format
  // when format is set to Code
  // and user switches to Animation
  $effect(() => {
    if (activeTab == "animations") {
      untrack(() => {
        if (activeFormat == "Code") {
          activeFormat = "UI";
        }
      });
    }
  });

  /**
   * Parses a SCSS string and updates the reactive `styles` store with the parsed selectors and their styles.
   *
   * @param {string} string - The SCSS code as a string to be parsed.
   * @returns {void}
   * @remarks
   * Uses PostCSS with a SCSS parser to extract selectors and their style rules.
   * Updates the `$styles` store with the new styles.
   * Ignores errors to allow for incomplete or in-progress user input.
   */
  async function updateStyle(string: string): Promise<void> {
    try {
      let object;
      let formatted = string;

      try {
        formatted = await prettier.format(string, {
          parser: "scss",
          plugins: [parserPostCSS],
        });
      } catch (error) {
        // console.log("Prettier formatting error:");
        // console.log(error);
      }

      object = await postcss().process(formatted, { parser: safeParser });

      $styles = object;
    } catch (error) {
      // ignore errors cause user might still be typing the style
    }
  }

  function fetchSelectorFromEditor(): void {
    if (!codeEditor) return;

    let head = codeEditor.state.selection.main.head;

    const tree = syntaxTree(codeEditor.state);
    let node = tree.resolve(head, -1);
    while (
      node &&
      node.type.name !== "RuleSet" &&
      node.type.name !== "StyleRule"
    ) {
      if (node && node.parent) {
        node = node.parent;
      } else {
        break;
      }
    }

    const selectorNode = node.firstChild;
    const selector = selectorNode?.type.name.includes("Selector")
      ? codeEditor.state.sliceDoc(selectorNode.from, selectorNode.to)
      : null;
    stylesState.cssSelector = selector || 'p[class^="g-pstyle"]';
  }
</script>

<div class="shadow-content" in:fly={{ y: -50, duration: 300 }}>
  <PillsContainer bind:styles={$styles} />

  <Input label="Identifier" type="text" bind:value={stylesState.cssSelector} />

  <ExtraConfigs {activeTab} {activeFormat} />

  <SectionTabBar
    labels={["shadows", "animations"]}
    tooltipDescription={["Add shadows", "Add animations"]}
    formats={["UI", "Code"]}
    formatTooltipDescription={["Simplified settings", "Advanced settings"]}
    bind:activeFormat
    bind:activeTab
  ></SectionTabBar>

  <div class="content">
    {#if activeFormat == "UI"}
      {#if activeTab == "shadows"}
        <Shadows />
      {:else if activeTab == "animations"}
        <Animations />
      {/if}
    {:else if activeFormat == "Code"}
      <div
        class="code-editor content-item"
        in:fly={{ y: -50, duration: 300 }}
        out:fly={{ y: 50, duration: 300 }}
      >
        <CmTextArea
          bind:editor={codeEditor}
          bind:textValue={editableCssString}
          type="css"
          onUpdate={(e: string) => {
            updateStyle(e);
            getStyleIdentifier();
            fetchSelectorFromEditor();
          }}
        />
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  @use "../../styles/shadows.scss" as *;
  @use "../../styles/variables.scss" as *;

  :global {
    .option-container:has(#select-Identifier) {
      margin-bottom: var(--space-xs);
    }

    .showConfigs {
      bottom: 0%;
      opacity: 1;
    }

    .hideConfigs {
      bottom: -5%;
      opacity: 0;
    }
  }

  .shadow-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-m);
  }

  .card-container {
    width: 100%;
    display: grid;
    grid-gap: var(--space-s);
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));

    @media screen and (max-width: 559px) {
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    }
  }
</style>
