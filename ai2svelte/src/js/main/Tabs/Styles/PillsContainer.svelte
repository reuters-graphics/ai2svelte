<script lang="ts">
  import { slide } from "svelte/transition";
  import Pill from "../../Components/Pill.svelte";

  import { stylesState } from "./stylesState.svelte";

  let { styles = $bindable() } = $props();
</script>

{#if styles && styles.root?.nodes.length}
  <div class="pills-container" transition:slide={{ duration: 200 }}>
    {#each stylesState.selectors as selector}
      <Pill
        name={selector}
        active={selector == stylesState.cssSelector}
        onClick={() => {
          stylesState.cssSelector = selector;
        }}
        onRemove={() => {
          // delete styles[selector];
          styles.root.nodes.splice(
            styles.root.nodes.findIndex(
              (x) => x.type === "rule" && x.selector == selector
            ),
            1
          );
          styles = styles;
          // replace identifier with default style
          const node = styles?.root?.nodes?.[0] || null;
          if (node && node.type === "rule") {
            stylesState.cssSelector = node.selector || `p[class^="g-pstyle"]`;
          }
        }}
      />
    {/each}
  </div>
{/if}

<style lang="scss">
  .pills-container {
    width: 100%;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }
</style>
