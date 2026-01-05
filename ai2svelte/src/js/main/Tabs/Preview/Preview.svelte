<script lang="ts">
  // SVELTE IMPORTS
  import { onDestroy, onMount, unmount, type ComponentType } from "svelte";
  import { Spring } from "svelte/motion";
  import PreviewFrame from "../../Components/PreviewFrame.svelte";

  // DATA IMPORTS
  import {
    settingsObject,
    stylesString,
    styles,
    unsavedChanges,
  } from "../../stores";
  import { userData } from "../../state.svelte";

  // BOLT IMPORTS
  import { csi } from "../../../lib/utils/bolt";
  import { evalTS } from "../../../lib/utils/bolt";
  import { fs, path } from "../../../lib/cep/node";

  // OTHER IMPORTS
  // @ts-ignore
  import BirdStats from "../../example/ai2svelte/bird-stats.svelte";
  import { saveSettings } from "../../utils/utils";
  import config from "../../../../../cep.config";
  import { version } from "../../../../shared/shared";
  // @ts-ignore
  import { compileComponent } from "./startServer";

  let PreviewComponent: ComponentType | undefined = $state();

  let previewWidth: Spring<number> = new Spring(800);
  let previewHeight: Spring<number> = new Spring(400);

  let currentArtboard: HTMLElement | undefined = $state();

  let frameContent: HTMLDivElement | undefined = $state();

  let component: Record<string, any> | undefined = undefined;

  function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const onAiMounted = () => {
    setTimeout(() => {
      displaySnippetNames();
    }, 100);
  };

  const onArtboardChange = (artboard: HTMLElement) => {
    currentArtboard = artboard;
    displaySnippetNames();
  };

  async function create() {
    // reset component if it exists
    component?.unmount();
    component = undefined;

    const userDataPath = path.join(csi.getSystemPath("userData"), config.id);
    const writablePath = userDataPath + "/writable/";
    let tryCount = 0;
    const maxTries = 10;

    while (component == undefined && tryCount < maxTries) {
      const filePath =
        "file://" + writablePath + "previewComponent.js" + "?" + Date.now();
      try {
        const componentRaw = (await import(/* @vite-ignore */ filePath))
          ?.default;

        if (componentRaw) {
          component = componentRaw(frameContent, {
            onAiMounted: onAiMounted,
            onArtboardChange: onArtboardChange,
          });

          console.log("Mounted preview component:", component);
        }
      } catch (error) {
        console.error(error);
        await delay(300);
      }
      tryCount++;
    }
  }

  onMount(async () => {
    previewWidth.target = window.innerWidth;
    previewHeight.target = 0.8 * window.innerHeight;

    if (window.cep) {
      saveSettings($settingsObject, $styles, version);

      console.log("✅ Generated preview.js successfully.");
      await loadPreview();
      await create();
    } else {
      component = BirdStats(frameContent, {
        assetsPath: "../../../assets",
        onAiMounted: onAiMounted,
        onArtboardChange: onArtboardChange,
      });
    }
  });

  onDestroy(() => {
    if (component) {
      unmount(component, {});
    }
  });

  /**
   * Runs the ai2svelte script with the preview settings
   *
   * @async
   * @returns {Promise<void>} Resolves when the preview has been loaded.
   */
  async function loadPreview() {
    // const extensionPath = csi.getSystemPath("extension");
    const userDataPath = path.join(csi.getSystemPath("userData"), config.id);
    const writablePath = userDataPath + "/writable/";
    const inputPath = path.resolve(writablePath, "Preview.svelte");
    const outputPath = path.resolve(writablePath, "previewComponent.js");

    // run ai2svelte script with preview settings
    // run only if there are unsaved changes
    if ($unsavedChanges.flag) {
      await fs.unlink(inputPath, (err) => {
        if (err) throw err;
        console.log("Preview.svelte was deleted");
      });

      await fs.unlink(outputPath, (err) => {
        if (err) throw err;
        console.log("preview.js was deleted");
      });

      console.log("✅ Generated preview.svelte successfully.");

      await evalTS(
        "runPreview",
        {
          settings: $settingsObject,
          code: { css: $stylesString, fontsConfig: userData.fontsConfig },
        },
        writablePath
      );

      compileComponent();

      console.log("✅ Generated preview.js successfully.");
    }
  }

  /**
   * Adds a CSS class to each element with the "g-aiSnippet" class based on its "data-name" attribute,
   * and injects a style element to define a CSS custom property (--data-name) for each snippet.
   *
   * Note: This function assumes that each "g-aiSnippet" element has a unique "data-name" attribute.
   */
  function displaySnippetNames() {
    console.log("Displaying snippet names...");

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
</script>

<div class="tab-content">
  <PreviewFrame {previewWidth} {previewHeight}>
    <div class="frame-content" bind:this={frameContent}></div>
  </PreviewFrame>
</div>

<style lang="scss">
  .tab-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .frame-content {
    background-color: gray;
    width: 100%;
    height: 100%;
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
