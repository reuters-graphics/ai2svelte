<script lang="ts">
  // COMPONENT IMPORTS
  import AnimationCard from "../../Components/AnimationCard.svelte";

  import { styles, userAnimations } from "../../stores";
  import { stylesState } from "./stylesState.svelte";

  // OTHER LIB IMPORTS
  import postcss from "postcss";
  import { Rule } from "postcss";

  // UTILS
  import type { AnimationItem } from "../types";
  import { removeIfEmpty } from "./utils";
  import { onMount } from "svelte";

  let allAnimations: AnimationItem[] = $state([]);

  /**
   * Toggles the presence of an animation card in the styles object for a given CSS selector.
   *
   * @param {string} animationUsage - The usage string of the animation, typically containing the mixin call.
   * @param {string} animationDefinition - The definition or description of the animation.
   * @param {boolean} operation - If true, adds the animation to the styles; if false, removes it.
   *
   * The function parses the animation usage to extract the animation identifier,
   * then either adds or removes the animation from the styles object for the current CSS selector.
   * If the styles array for the selector becomes empty after removal, the selector is deleted from the styles object.
   */
  function toggleAnimationCard(
    animationUsage: string,
    animationName: string,
    animationDefinition: string,
    animationRule: string,
    operation: boolean
  ): void {
    const animationMixinRegex = new RegExp(/.*@include (.*)\(\)/);
    const mixinCheck = animationUsage?.match(animationMixinRegex);
    const animationIdentifier = mixinCheck ? mixinCheck[1] : undefined;

    let rule: Rule | null =
      ($styles.root?.nodes.find(
        (node) =>
          node.type === "rule" && node.selector === stylesState.cssSelector
      ) as Rule) || null;

    const animationParam = `animation-${animationName}()`;

    if (operation) {
      // Create a comment node
      const comment = postcss.comment({
        text: `${animationIdentifier} ${animationDefinition}`,
      });

      // Create an @include AtRule
      const animationInclude = postcss.atRule({
        name: "include",
        params: animationParam,
      });

      // If rule doesn't exist, create it
      if (!rule) {
        rule = postcss.rule({ selector: stylesState.cssSelector });
        $styles.root.append(rule);
      }

      // add animation definition as comment
      rule.append(comment);

      // Add or update a declaration
      rule.append(animationInclude);

      let animationDeclExists = false;
      let existingValue = "";

      rule.walkDecls((decl) => {
        if (decl.prop === "animation") {
          animationDeclExists = true;
          existingValue = decl.value;
          decl.value = existingValue + ", " + animationRule;
        }
      });

      if (!animationDeclExists) {
        // Add animation declaration
        rule.append({ prop: "animation", value: animationRule });
      }
    } else {
      rule.walkDecls((decl) => {
        if (decl.prop === "animation") {
          const animRegex = new RegExp(`\\s*${animationName}([^,)]*)`);
          let newAnimString = decl.value
            .replace(animRegex, "")
            .split(",")
            .filter((x) => x !== "")
            .join(",");
          if (newAnimString == "") {
            decl.remove();
          } else {
            decl.value = newAnimString;
          }
        }
      });

      rule.walkAtRules("include", (atRule) => {
        if (atRule.params === animationParam) {
          atRule.remove();
        }
      });

      rule.walkComments((comment) => {
        if (comment.text == `${animationIdentifier} ${animationDefinition}`) {
          comment.remove();
        }
      });

      removeIfEmpty(rule);
    }

    $styles = $styles;
  }

  function clearAnimationSelection() {
    allAnimations.forEach((x) => {
      x.active = false;

      let rule: Rule | null =
        ($styles.root?.nodes.find(
          (node) =>
            node.type === "rule" && node.selector === stylesState.cssSelector
        ) as Rule) || null;

      let animationParam = `animation-${x.name}()`;

      if (rule) {
        rule.walkAtRules("include", (atRule) => {
          if (atRule.params === animationParam) {
            x.active = true;
          }
        });
      }
    });
  }

  function fetchAnimations() {
    allAnimations = [...$userAnimations]
      .map((x) => ({
        name: x.name,
        usage: x.usage,
        active: false,
        arguments: x.arguments,
        animationRule: x.animationRule,
        definition: x.definition,
        candidate: x.candidate,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  onMount(() => {
    // load local shadows and animations
    fetchAnimations();
  });

  // clear card selection
  // when user inputs new css selector
  $effect(() => {
    if (stylesState.cssSelector) {
      clearAnimationSelection();
    }
  });
</script>

<div class="card-container content-item">
  {#each allAnimations as animation, index}
    <AnimationCard
      name={animation.name}
      animationArguments={animation.arguments}
      bind:active={animation.active}
      animationRule={animation.animationRule}
      definition={animation.definition}
      candidate={animation.candidate}
      onChange={() => {
        allAnimations[index].active = animation.active;
        allAnimations = [...allAnimations];
        toggleAnimationCard(
          animation.usage,
          animation.name,
          animation.arguments,
          animation.animationRule,
          animation.active
        );
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
