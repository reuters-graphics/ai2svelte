<script lang="ts">
  // SVELTE IMPORTS
  import { onDestroy, onMount, untrack } from "svelte";
  import { fly, slide } from "svelte/transition";
  // BOLT IMPORTS
  import { evalTS } from "../../lib/utils/bolt";

  // DATA IMPORTS
  import {
    styles,
    updateInProgress,
    currentBackdrop,
    ai2svelteInProgress,
    userAnimations,
    userShadowsBaked,
    userSpecimens,
  } from "../stores";

  // OTHER LIB IMPORTS
  import postcss from "postcss";
  import { Rule, type Result, type Root } from "postcss";
  import * as prettier from "prettier/standalone";
  import parserPostCSS from "prettier/plugins/postcss";
  import ColorPicker from "svelte-awesome-color-picker";
  import { tooltip } from "svooltip";
  // @ts-ignore
  import { AIEvent, AIEventAdapter } from "../../../public/BoltHostAdapter.js";

  // UTILS
  import { fetchNewImageURL, tooltipSettings } from "../utils/utils";
  import type { AnimationItem, ShadowCardItem } from "./types";

  // MEDIA
  import replaceImageIcon from "../../assets/replace_image.svg";
  import typeSpecimenIcon from "../../assets/type_specimen.svg";

  // COMPONENT IMPORTS
  import AnimationCard from "../Components/AnimationCard.svelte";
  import CmTextArea from "../Components/CMTextArea.svelte";
  import Input from "../Components/Input.svelte";
  import Pill from "../Components/Pill.svelte";
  import SectionTabBar from "../Components/SectionTabBar.svelte";
  import ShadowCard from "../Components/ShadowCard.svelte";
  // @ts-ignore
  import safeParser from "postcss-safe-parser";

  let activeTab: string = $state("");
  let activeFormat: string = $state("UI");

  let specimen: string = $state("");
  let specimenWeight: 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 =
    $state(400);
  let backdrop: string | undefined = $state();
  const maxBackdropCount: number = 14;
  let fillColor: string = $state("#ffffff");
  let shadowColor: string = $state("#000000");
  let cssSelector: string = $state(`p[class^="g-pstyle"]`);

  let initialLoad: boolean = $state(false);

  let allShadows: ShadowCardItem[] = $state([]);

  let allAnimations: AnimationItem[] = $state([]);

  let allSpecimens: string[] = $state([]);

  let previousStyles: Result<Root> | undefined = undefined;

  let previousSelector: string = "";

  // holds styles object as string
  let cssString: string = $derived.by(() => {
    // don't update while its fetching settings from AI
    if (!$updateInProgress) {
      const string = $styles?.root?.toString() || "";

      //   if (window.cep) {
      //     evalTS("updateAiSettings", "shadow-settings", string);
      //   }
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
  // clear card selection
  $effect(() => {
    if (cssSelector) {
      clearShadowSelection();
      previousSelector = cssSelector;
    }
  });

  async function detectIdentifier(): Promise<void> {
    const identifier = await evalTS("fetchSelectedItems");
    const node = $styles?.root?.nodes?.[0];
    if (node && "type" in node && node.type === "rule") {
      cssSelector =
        identifier || (node as Rule).selector || 'p[class^="g-pstyle"]';
    } else {
      cssSelector = 'p[class^="g-pstyle"]';
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
      if ($ai2svelteInProgress) return;
      await detectIdentifier();
    });
  }

  onMount(async () => {
    if ($styles == undefined || Object.keys($styles).length == 0) {
      $styles = await postcss().process("", { parser: safeParser });
    }

    allShadows = [...$userShadowsBaked]
      .map((x) => ({
        id: x.id,
        shadow: x.shadow,
        active: false,
        dataName: "",
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

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

    allSpecimens = [...$userSpecimens];

    activeTab = "shadows";

    // set first selector from styles object as css selector
    const node = $styles?.root?.nodes?.[0];
    if (node && "type" in node && node.type === "rule") {
      cssSelector = (node as Rule).selector || 'p[class^="g-pstyle"]';
    } else {
      cssSelector = 'p[class^="g-pstyle"]';
    }

    if (window.cep) {
      initialLoad = true;
      addSelectionChangeEventListener();
      detectIdentifier();
    }

    previousStyles = $styles;

    changeSpecimen();
    backdrop = await fetchNewImageURL();
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
   * Asynchronously changes the backdrop image by fetching a new image URL.
   * If fetching fails, the function retries recursively.
   * On success, updates the `backdrop` variable with the new image URL.
   *
   * @async
   * @returns {Promise<void>} Resolves when the backdrop is updated.
   */
  async function changeBackdrop(): Promise<void> {
    let newImageURL;
    try {
      $currentBackdrop = ($currentBackdrop + 1) % maxBackdropCount;
      newImageURL = await fetchNewImageURL();
    } catch (error) {
      newImageURL = `https://picsum.photos/200`;
      console.log(error);
      return;
    }

    if (newImageURL) {
      backdrop = newImageURL;
    }
  }

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
          parser: "scss", // or "scss" if you're using SCSS
          plugins: [parserPostCSS],
        });
      } catch (error) {
        console.log("Prettier formatting error:");
        console.log(error);
      }

      object = await postcss().process(formatted, { parser: safeParser });

      styles.set(object);
    } catch (error) {
      // ignore errors cause user might still be typing the style
    }
  }

  /**
   * Changes the type specimen and increments the type weight from 100-900.
   */
  function changeSpecimen(): void {
    if (allSpecimens.length) {
      specimen = allSpecimens[Math.floor(Math.random() * allSpecimens.length)];
    } else {
      specimen = "My dev job requires fixing buggy code with zeal and panache";
    }

    specimenWeight = ((specimenWeight + 50) % 900) + 50;
  }

  function checkIfRuleIsEmpty(rule: Rule) {
    if (!rule.nodes || rule.nodes.length === 0) {
      rule.remove(); // Clean up empty rules
    }
  }

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

    let rule =
      $styles.root?.nodes.find(
        (node) => node.type === "rule" && node.selector === cssSelector
      ) || null;

    const animationParam = `animation-${animationName}()`;

    if (operation) {
      if (!rule) {
        rule = postcss.rule({ selector: cssSelector });
        $styles.root.append(rule);
      }

      // Create a comment node
      const comment = postcss.comment({
        text: `${animationIdentifier} ${animationDefinition}`,
      });

      // add animation definition as comment
      if ("type" in rule && rule.type === "rule") {
        (rule as Rule).append(comment);
      }

      // Create an @include AtRule
      const animationInclude = postcss.atRule({
        name: "include",
        params: animationParam,
      });

      // Add or update a declaration
      if ("type" in rule && rule.type === "rule") {
        (rule as Rule).append(animationInclude);
      }

      let animationDeclExists = false;
      let existingValue = "";
      if ("walkDecls" in rule && typeof rule.walkDecls === "function") {
        rule.walkDecls((decl) => {
          if (decl.prop === "animation") {
            animationDeclExists = true;
            existingValue = decl.value;
            decl.value = existingValue + ", " + animationRule;
          }
        });
      }

      if (!animationDeclExists) {
        // Add animation declaration
        if ("type" in rule && rule.type === "rule") {
          (rule as Rule).append({ prop: "animation", value: animationRule });
        }
      }
    } else {
      if (rule && "walkDecls" in rule && typeof rule.walkDecls === "function") {
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

        if (rule.type == "rule") {
          checkIfRuleIsEmpty(rule);
        }
      }
    }

    $styles = $styles;
  }

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
    const shadowString: string =
      "@include shadow-" + shadowName + "(" + shadowColor + ")";
    const shadowParam = `shadow-${shadowName}(${shadowColor})`;

    let rule =
      $styles.root?.nodes.find(
        (node) => node.type === "rule" && node.selector === cssSelector
      ) || null;
    // true to add
    // false to remove
    if (operation) {
      if (!rule) {
        rule = postcss.rule({ selector: cssSelector });
        $styles.root.append(rule);
      }
      // Create an @include AtRule
      const shadowInclude = postcss.atRule({
        name: "include",
        params: shadowParam,
      });
      // Add or update a declaration
      if ("type" in rule && rule.type === "rule") {
        (rule as Rule).append(shadowInclude);
      }
    } else {
      if (rule && "walkDecls" in rule && typeof rule.walkDecls === "function") {
        rule.walkAtRules("include", (atRule) => {
          if (atRule.params === shadowParam) {
            atRule.remove();
          }
        });

        if (rule.type == "rule") {
          checkIfRuleIsEmpty(rule);
        }
      }
    }
    $styles = $styles;
  }

  /**
   * Clears active selection of shadow and animation cards.
   * And toggles style cards associated with the new css identifier.
   *
   */
  function clearShadowSelection() {
    allShadows.forEach((x) => {
      const shadowParam = `shadow-${x.dataName}(${shadowColor})`;

      x.active = false;

      let rule =
        $styles.root?.nodes.find(
          (node) => node.type === "rule" && node.selector === cssSelector
        ) || null;

      if (rule) {
        if (
          rule &&
          "walkDecls" in rule &&
          typeof rule.walkDecls === "function"
        ) {
          rule.walkAtRules("include", (atRule) => {
            if (atRule.params === shadowParam) {
              x.active = true;
            }
          });
        }
      }
    });

    allAnimations.forEach((x) => {
      const animationMixinRegex = new RegExp(/.*@include (.*)\(\)/);
      const mixinCheck = x.usage?.match(animationMixinRegex);

      x.active = false;

      let rule =
        $styles.root?.nodes.find(
          (node) => node.type === "rule" && node.selector === cssSelector
        ) || null;

      let animationParam = `animation-${x.name}()`;

      if (rule) {
        if (
          rule &&
          "walkDecls" in rule &&
          typeof rule.walkDecls === "function"
        ) {
          rule.walkAtRules("include", (atRule) => {
            if (atRule.params === animationParam) {
              x.active = true;
            }
          });
        }
      }
    });
  }
</script>

<div class="shadow-content" in:fly={{ y: -50, duration: 300 }}>
  {#if $styles && $styles.root?.nodes.length}
    <div class="pills-container" transition:slide={{ duration: 200 }}>
      {#each $styles.root?.nodes
        .filter((x) => x.type === "rule" && x.selector)
        .map((x) => (x.type === "rule" ? x.selector : "")) as selector}
        <Pill
          name={selector}
          active={selector == cssSelector}
          onClick={() => {
            cssSelector = selector;
          }}
          onRemove={() => {
            // delete $styles[selector];
            $styles.root.nodes.splice(
              $styles.root.nodes.findIndex(
                (x) => x.type === "rule" && x.selector == selector
              ),
              1
            );
            $styles = $styles;
            // replace identifier with default style
            const node = $styles?.root?.nodes?.[0] || null;
            if (node && node.type === "rule") {
              cssSelector = node.selector || `p[class^="g-pstyle"]`;
            }
          }}
        />
      {/each}
    </div>
  {/if}

  <Input label="Identifier" type="text" bind:value={cssSelector} />

  <div
    id="extra-configs"
    class={activeTab == "shadows" && activeFormat == "UI"
      ? "showConfigs"
      : "hideConfigs"}
  >
    <button
      id="replace-image"
      onclick={changeBackdrop}
      aria-label="Change backdrop"
      use:tooltip={{
        ...tooltipSettings,
        content: "Change backdrop",
      }}
    >
      <img style="width: 100%;" src={replaceImageIcon} alt="Change backdrop" />
    </button>
    <button
      id="replace-specimen"
      onclick={changeSpecimen}
      aria-label="Change type specimen"
      use:tooltip={{
        ...tooltipSettings,
        content: "Change type specimen",
      }}
    >
      <img
        style="width: 100%;"
        src={typeSpecimenIcon}
        alt="Change type specimen"
      />
    </button>
    <div
      id="picker-fill"
      style="--picker-color: {fillColor};"
      use:tooltip={{
        ...tooltipSettings,
        content: "Fill color (view only)",
      }}
    >
      <ColorPicker
        position="responsive"
        label=""
        isAlpha={false}
        bind:hex={fillColor}
        sliderDirection="horizontal"
        --picker-width="160px"
        --picker-height="120px"
        --slider-width="20px"
        --picker-indicator-size="40px"
        --picker-z-index="10"
        --input-size="20px"
        --cp-border-color="#ffffff22"
        --cp-bg-color="#292929"
        --cp-text-color="#ffffff"
        --cp-input-color="#292929"
      />
    </div>
    <div
      id="picker-shadow"
      style="--picker-color: {shadowColor};"
      use:tooltip={{
        ...tooltipSettings,
        content: "Shadow color",
      }}
    >
      <ColorPicker
        position="responsive"
        label=""
        isAlpha={false}
        bind:hex={shadowColor}
        sliderDirection="horizontal"
        --picker-width="160px"
        --picker-height="120px"
        --slider-width="20px"
        --picker-indicator-size="40px"
        --picker-z-index="10"
        --input-size="20px"
        --cp-border-color="#ffffff22"
        --cp-bg-color="#292929"
        --cp-text-color="#ffffff"
        --cp-input-color="#292929"
      />
    </div>
  </div>

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
        <div class="card-container content-item">
          {#each allShadows as shadow, index (shadow.id)}
            <ShadowCard
              name={shadow.id}
              shadow={shadow.shadow}
              {specimen}
              {specimenWeight}
              {backdrop}
              {shadowColor}
              {fillColor}
              bind:active={shadow.active}
              bind:dataName={shadow.dataName}
              onChange={() => {
                allShadows[index].active = shadow.active;
                allShadows = [...allShadows];
                toggleShadowCard(shadow.dataName, shadow.active);
              }}
              delay={index * 20}
            />
          {/each}
        </div>
      {:else if activeTab == "animations"}
        <div class="card-container content-item">
          {#each allAnimations as animation, index}
            <AnimationCard
              name={animation.name}
              animation={animation.usage}
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
              delay={index * 20}
            />
          {/each}
        </div>
      {/if}
    {:else if activeFormat == "Code"}
      <div
        class="code-editor content-item"
        in:fly={{ y: -50, duration: 300 }}
        out:fly={{ y: 50, duration: 300 }}
      >
        <CmTextArea
          bind:textValue={editableCssString}
          type="css"
          onUpdate={(e: string) => {
            updateStyle(e);
          }}
        />
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  @use "../styles/shadows.scss" as *;
  @use "../styles/variables.scss" as *;

  :global {
    .option-container:has(#select-Identifier) {
      margin-bottom: 16px;
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
    gap: 16px;
  }

  .pills-container {
    width: 100%;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
  }

  #extra-configs {
    $tranparentSecondary: var(--color-secondary);
    position: fixed;
    z-index: 2;
    margin: 0 auto;
    left: 50%;
    transform: translate(-50%, -50%);
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
    display: flex;
    flex-direction: row;
    justify-content: space-around;
    align-items: center;
    gap: 16px;
    background-color: var(--color-primary);
    border: 10px solid rgba($tranparentSecondary, 0.5);
    padding: 1rem 1.25rem;
    border-radius: 24px;
    @include animation-default;

    button {
      width: 20px;
      height: 20px;
    }

    #replace-image,
    #replace-specimen {
      padding: 0;
      margin: 0;
      border: unset;
      background: transparent;
      cursor: pointer;
    }

    #replace-image:hover,
    #replace-specimen:hover {
      filter: brightness(1.5);
    }
  }

  .card-container {
    width: 100%;
    display: grid;
    grid-gap: 8px;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));

    @media screen and (max-width: 559px) {
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    }
  }
</style>
