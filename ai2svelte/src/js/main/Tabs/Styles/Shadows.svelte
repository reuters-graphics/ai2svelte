<script lang="ts">
  import ShadowCard from "../../Components/ShadowCard.svelte";

  import { styles, userShadowsBaked } from "../../stores";
  import { stylesState } from "./stylesState.svelte";

  // OTHER LIB IMPORTS
  import postcss from "postcss";
  import { Rule } from "postcss";

  // UTILS
  import type { ShadowCardItem } from "../types";
  import { onMount } from "svelte";
  import { removeIfEmpty } from "./utils";

  let allShadows: ShadowCardItem[] = $state([]);

  /**
   * Toggles a shadow mixin string in the styles object for a given CSS selector.
   *
   * @param {string} shadowName - The name of the shadow mixin to toggle.
   * @param {boolean} operation - If true, adds the shadow; if false, removes it.
   *
   * The function constructs a shadow mixin string using the provided shadowName and a global shadowColor.
   * If the array becomes empty after removal, the selector is deleted from the styles object.
   * The styles store is updated at the end to trigger reactivity.
   */
  function toggleShadowCard(shadowName: string, operation: boolean) {
    const shadowParam = `shadow-${shadowName}(${stylesState.shadowColor})`;

    let rule: Rule | null =
      ($styles.root?.nodes.find(
        (node) =>
          node.type === "rule" && node.selector === stylesState.cssSelector
      ) as Rule) || null;

    // true to add
    // false to remove
    if (operation) {
      // Create an @include AtRule
      const shadowInclude = postcss.atRule({
        name: "include",
        params: shadowParam,
      });

      // if rule doesn't exist already,
      //  create it
      if (!rule) {
        rule = postcss.rule({ selector: stylesState.cssSelector });
        $styles.root.append(rule);
      }

      // Add or update a declaration
      rule.append(shadowInclude);
    } else {
      rule.walkAtRules("include", (atRule) => {
        if (atRule.params === shadowParam) {
          atRule.remove();
        }
      });

      removeIfEmpty(rule);
    }
    $styles = $styles;
  }

  function fetchShadows() {
    allShadows = [...$userShadowsBaked]
      .map((x) => ({
        id: x.id,
        shadow: x.shadow,
        active: false,
        dataName: "",
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Clears active selection of shadow and animation cards.
   * And toggles style cards associated with the new css identifier.
   *
   */
  function clearShadowSelection() {
    allShadows.forEach((x) => {
      const shadowParam = `shadow-${x.dataName}(${stylesState.shadowColor})`;

      x.active = false;

      let rule: Rule | null =
        ($styles?.root?.nodes.find(
          (node) =>
            node.type === "rule" && node.selector === stylesState.cssSelector
        ) as Rule) || null;

      if (rule) {
        rule.walkAtRules("include", (atRule) => {
          if (atRule.params === shadowParam) {
            x.active = true;
          }
        });
      }
    });
  }

  onMount(() => {
    // get all local shadows
    fetchShadows();
  });

  // clear card selection
  // when user inputs new css selector
  $effect(() => {
    if (stylesState.cssSelector) {
      clearShadowSelection();
    }
  });
</script>

<div class="card-container content-item">
  {#each allShadows as shadow, index (shadow.id)}
    <ShadowCard
      name={shadow.id}
      shadow={shadow.shadow}
      specimen={stylesState.specimen}
      specimenWeight={stylesState.specimenWeight}
      backdrop={stylesState.backdrop}
      shadowColor={stylesState.shadowColor}
      fillColor={stylesState.fillColor}
      bind:active={shadow.active}
      bind:dataName={shadow.dataName}
      onChange={() => {
        allShadows[index].active = shadow.active;
        allShadows = [...allShadows];
        toggleShadowCard(shadow.dataName, shadow.active);
      }}
      delay={index * 10}
    />
  {/each}
</div>

<style lang="scss">
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
