<script lang="ts">
  // SVELTE IMPORTS
  import { onMount } from "svelte";
  import Preview from "./Preview.svelte";
  import PreviewFrame from "./PreviewFrame.svelte";
  import { Spring } from "svelte/motion";

  let previewWidth: Spring<number> = new Spring(800);
  let previewHeight: Spring<number> = new Spring(400);

  let currentArtboard: string | undefined = $state();

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
    if (previewWidth.current) {
      const container = document.querySelector("#g-Preview-box");
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
  <!-- <PreviewFrame {previewWidth} {previewHeight}> -->
  <Preview
    assetsPath="./"
    onAiMounted={() => {
      setTimeout(() => {
        displaySnippetNames();
      }, 100);
    }}
  />
  <!-- </PreviewFrame> -->
</div>

<style lang="scss">
  .tab-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
    height: 100%;

    :global(.ai2svelte) {
      width: 100%;
    }
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
