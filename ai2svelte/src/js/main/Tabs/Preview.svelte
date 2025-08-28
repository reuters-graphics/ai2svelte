<script lang="ts">
  // SVELTE IMPORTS
  import { onMount, type Component } from "svelte";
  import { Spring } from "svelte/motion";
  import PreviewFrame from "../Components/PreviewFrame.svelte";
  import { compile } from "svelte/compiler";

  // DATA IMPORTS
  import { settingsObject, stylesString, styles } from "../stores";

  // BOLT IMPORTS
  import { csi } from "../../lib/utils/bolt";
  import { evalTS } from "../../lib/utils/bolt";
  import { fs, path } from "../../lib/cep/node";

  // OTHER IMPORTS
  // @ts-ignore
  import BirdStats from "../example/ai2svelte/bird-stats.svelte";
  import { saveSettings } from "../utils/utils";

  let PreviewComponent: Component | undefined = $state();

  let previewWidth: Spring<number> = new Spring(800);
  let previewHeight: Spring<number> = new Spring(400);

  let currentArtboard: string | undefined = $state();

  onMount(async () => {
    previewWidth.target = window.innerWidth;
    previewHeight.target = 0.8 * window.innerHeight;

    if (window.cep) {
      saveSettings($settingsObject, $styles);
      loadPreview();
      getSvelteFile();
    }
  });

  /**
   * Runs the ai2svelte script with the preview settings
   *
   * @async
   * @returns {Promise<void>} Resolves when the preview has been loaded.
   */
  async function loadPreview() {
    const extensionPath = csi.getSystemPath("extension");
    const writablePath = extensionPath + "/writable/";

    // run ai2svelte script with preview settings
    await evalTS(
      "runPreview",
      {
        settings: $settingsObject,
        code: { css: $stylesString },
      },
      writablePath
    );

    const inputPath = path.resolve(writablePath, "preview.svelte");
    const outputPath = path.resolve(writablePath, "preview.js");

    const source = fs.readFileSync(inputPath, "utf-8");

    const { js } = compile(source, {});

    fs.writeFileSync(outputPath, js.code);
    console.log("✅ Compiled preview.svelte to preview.js");
  }

  /**
   * Asynchronously loads a Svelte component from a writable file path and assigns it to `PreviewComponent`.
   *
   * @async
   * @returns {Promise<void>} Resolves when the component is imported and assigned.
   */
  async function getSvelteFile() {
    const extensionPath = csi.getSystemPath("extension");
    const writablePath = extensionPath + "/writable/";
    const filePath = writablePath + "preview.svelte";

    setTimeout(async () => {
      const component = (await import(/* @vite-ignore */ filePath)).default;
      PreviewComponent = component;
    }, 1000);
  }

  /**
   * Adds a CSS class to each element with the "g-aiSnippet" class based on its "data-name" attribute,
   * and injects a style element to define a CSS custom property (--data-name) for each snippet.
   *
   * Note: This function assumes that each "g-aiSnippet" element has a unique "data-name" attribute.
   */
  function displaySnippetNames() {
    // fetch all the snippets
    const allSnippets = Array.from(document.querySelectorAll(".g-aiSnippet"));

    allSnippets.forEach((snippetNode) => {
      const snippetName = snippetNode.getAttribute("data-name");
      snippetNode.classList.add(`${snippetName}-variable`);

      const style = document.createElement("style");
      snippetNode.appendChild(style);

      const sheet = style.sheet;

      // Add CSS rules
      sheet?.insertRule(
        `
                .${snippetName}-variable::after {
                    --data-name: "${snippetNode.getAttribute("data-name")}";
                }
            `,
        0
      );
    });
  }

  // if preview viewport changes, listen for active artboard
  $effect(() => {
    if (previewWidth.current && PreviewComponent) {
      const container = document.querySelector("#g-preview-box");
      currentArtboard =
        container?.firstElementChild?.getAttribute("id") || undefined;
    }
  });

  // if active artboard changes, re-link snippet names
  $effect(() => {
    if (currentArtboard) {
      displaySnippetNames();
    }
  });
</script>

<div class="tab-content">
  <PreviewFrame {previewWidth} {previewHeight}>
    {#if PreviewComponent}
      <PreviewComponent
        onAiMounted={() => {
          setTimeout(() => {
            displaySnippetNames();
          }, 0);
        }}
      />
    {:else}
      <BirdStats assetsPath={"../../../assets"} />
    {/if}
  </PreviewFrame>
</div>

<style lang="scss">
  .tab-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  :global {
    .g-aiSnippet {
      outline: 2px solid #ffffff44;
      background-color: rgba(0, 0, 0, 0.2) !important;
      backdrop-filter: blur(4px);
    }

    .g-aiSnippet::after {
      content: var(--data-name);
      position: absolute;
      padding: 8px;
      text-align: center;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
  }
</style>
