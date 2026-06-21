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
    forcePreview,
    lastPreviewObject,
  } from "../../stores";
  import { userData } from "../../state.svelte";

  // BOLT IMPORTS
  import { csi } from "../../../lib/utils/bolt";
  import { evalTS } from "../../../lib/utils/bolt";
  import { fs, path } from "../../../lib/cep/node";

  // OTHER IMPORTS
  // @ts-ignore: preview-dev.svelte is a generated file and has no TypeScript declarations
  import PreviewDev from "../../example/ai2svelte/preview-dev.svelte";
  import { saveSettings } from "../../utils/utils";
  import config from "../../../../../cep.config";
  import { version } from "../../../../shared/shared";
  // @ts-ignore: startServer.js is a plain JS file with no TypeScript declarations
  import { compileComponent } from "./startServer";
  import type { PreviewObject } from "../../Tabs/types";

  let { forceRender = false }: { forceRender?: boolean } = $props();

  let PreviewComponent: ComponentType | undefined = $state();
  let isLoadingPreview: boolean = $state(false);
  let previewError: string | undefined = $state(undefined);

  let previewWidth: Spring<number> = new Spring(800);
  let previewHeight: Spring<number> = new Spring(400);

  let currentArtboard: HTMLElement | undefined = $state();
  let frameContent: HTMLDivElement | undefined = $state();
  let component: Record<string, unknown> | undefined = undefined;

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
    component?.unmount?.();
    component = undefined;
    isLoadingPreview = true;
    previewError = undefined;

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
        }
      } catch (error) {
        console.error("[ai2svelte] Preview load attempt failed:", error);
        await delay(300);
      }
      tryCount++;
    }

    if (component == undefined) {
      previewError =
        "Could not load the preview component after multiple attempts. Try running ai2svelte again.";
    }

    isLoadingPreview = false;
  }

  function resetForcePreview() {
    $forcePreview = false;
  }

  // Compares two objects by stringifying with sorted keys.
  // Avoids structuredClone — JSON.stringify does not mutate its input.
  const stableStringify = (obj: Record<string, unknown>) =>
    JSON.stringify(obj, Object.keys(obj).sort());

  const deepEqual = (a: Record<string, unknown>, b: Record<string, unknown>) =>
    stableStringify(a) === stableStringify(b);

  onMount(async () => {
    previewWidth.target = window.innerWidth;
    previewHeight.target = 0.8 * window.innerHeight;

    if (window.cep) {
      await loadPreview();
      await create();
    } else {
      component = PreviewDev(frameContent, {
        assetsPath: "./example/ai2svelte/",
        onAiMounted: onAiMounted,
        onArtboardChange: onArtboardChange,
      });
    }

    resetForcePreview();
  });

  onDestroy(() => {
    if (component) {
      unmount(component, {});
    }
  });

  /**
   * Runs the ai2svelte script with the preview settings.
   * Skips the run if settings and styles have not changed since the last preview.
   */
  async function loadPreview() {
    const userDataPath = path.join(csi.getSystemPath("userData"), config.id);
    const writablePath = userDataPath + "/writable/";
    const inputPath = path.resolve(writablePath, "Preview.svelte");
    const outputPath = path.resolve(writablePath, "previewComponent.js");

    const previewObject: PreviewObject = {
      settings: $settingsObject,
      stylesString: $stylesString,
    };

    if (!deepEqual(previewObject as Record<string, unknown>, $lastPreviewObject as Record<string, unknown>) || forceRender) {
      await fs.unlink(inputPath, (err: Error | null) => {
        if (err) throw err;
      });

      await fs.unlink(outputPath, (err: Error | null) => {
        if (err) throw err;
      });

      await evalTS(
        "runPreview",
        {
          settings: $settingsObject,
          code: { css: $stylesString, fontsConfig: userData.fontsConfig },
        },
        writablePath,
      );

      $lastPreviewObject = {
        settings: $settingsObject,
        stylesString: $stylesString,
      };

      compileComponent();
    }
  }

  /**
   * Adds a CSS class and a ::after pseudo-element to each .g-aiSnippet element
   * so the snippet name is displayed as an overlay in the preview.
   */
  function displaySnippetNames() {
    const allSnippets = Array.from(document.querySelectorAll(".g-aiSnippet"));

    allSnippets.forEach((snippetNode) => {
      const snippetName = snippetNode.getAttribute("data-name");
      snippetNode.classList.add(`${snippetName}-variable`);

      const style = document.createElement("style");
      snippetNode.appendChild(style);

      const sheet = style.sheet;
      sheet?.insertRule(
        `
                .${snippetName}-variable::after {
                    --data-name: "${snippetNode.getAttribute("data-name")}";
                }
            `,
        0,
      );
    });
  }
</script>

<div class="tab-content">
  {#if isLoadingPreview}
    <p class="preview-status">Loading preview…</p>
  {:else if previewError}
    <p class="preview-status preview-error">{previewError}</p>
  {/if}
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
    overflow: overlay;
  }

  .preview-status {
    font-size: var(--font-size-base);
    opacity: 0.6;
    padding: var(--space-xs);
  }

  .preview-error {
    color: #ff4444;
    opacity: 1;
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
