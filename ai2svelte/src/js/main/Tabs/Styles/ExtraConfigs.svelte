<script lang="ts">
  import { tooltip } from "svooltip";
  import ColorPicker from "svelte-awesome-color-picker";

  // UTILS
  import { fetchNewImageURL, tooltipSettings } from "../../utils/utils";
  // @ts-ignore
  import { captureRegion } from "./screenSnip";

  // MEDIA
  import replaceImageIcon from "../../../assets/replace_image.svg";
  import typeSpecimenIcon from "../../../assets/type_specimen.svg";
  import captureRegionIcon from "../../../assets/capture_region.svg";

  // DATA IMPORTS
  import { currentBackdrop, userSpecimens } from "../../stores";
  import { onMount } from "svelte";
  import { stylesState } from "./stylesState.svelte";
  import type { SpecimenWeight } from "./stylesState.svelte";

  // NODE IMPORTS
  import { os, path } from "../../../lib/cep/node";

  let { activeTab = "shadows", activeFormat = "UI" } = $props();

  // change this number when new backdrops are added
  const maxBackdropCount: number = 14;

  let allSpecimens: string[] = $state([]);

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
      stylesState.backdrop = newImageURL;
    }
  }

  /**
   * Changes the type specimen and increments the type weight from 100-900.
   */
  function changeSpecimen(): void {
    if (allSpecimens.length) {
      stylesState.specimen =
        allSpecimens[Math.floor(Math.random() * allSpecimens.length)];
    } else {
      stylesState.specimen =
        "My dev job requires fixing buggy code with zeal and panache";
    }

    const weight = ((stylesState.specimenWeight + 50) % 900) + 50;
    stylesState.specimenWeight = weight as SpecimenWeight;
  }

  async function captureBackdrop(): Promise<void> {
    await captureRegion();
  }

  onMount(async () => {
    allSpecimens = [...$userSpecimens];

    changeSpecimen();
    stylesState.backdrop = await fetchNewImageURL();
  });
</script>

<div
  id="extra-configs"
  class={activeTab == "shadows" && activeFormat == "UI"
    ? "showConfigs"
    : "hideConfigs"}
>
  {#if window.cep && os.platform() === "darwin"}
    <button
      id="capture-region"
      onclick={captureBackdrop}
      aria-label="Capture backdrop"
      use:tooltip={{
        ...tooltipSettings,
        content: "Capture backdrop",
      }}
    >
      <img
        style="width: 100%;"
        src={captureRegionIcon}
        alt="Capture backdrop"
      />
    </button>
  {/if}

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
    style="--picker-color: {stylesState.fillColor};"
    use:tooltip={{
      ...tooltipSettings,
      content: "Fill color (view only)",
    }}
  >
    <ColorPicker
      position="responsive"
      label=""
      isAlpha={false}
      bind:hex={stylesState.fillColor}
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
    style="--picker-color: {stylesState.shadowColor};"
    use:tooltip={{
      ...tooltipSettings,
      content: "Shadow color",
    }}
  >
    <ColorPicker
      position="responsive"
      label=""
      isAlpha={false}
      bind:hex={stylesState.shadowColor}
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

<style lang="scss">
  @use "../../styles/variables.scss" as *;

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
    gap: var(--space-m);
    background-color: var(--color-primary);
    border: 10px solid rgba($tranparentSecondary, 0.5);
    padding: var(--space-m) var(--space-m);
    border-radius: var(--space-3xl);
    @include animation-default;

    button {
      width: 20px;
      height: 20px;
    }

    #replace-image,
    #replace-specimen,
    #capture-region {
      padding: 0;
      margin: 0;
      border: unset;
      background: transparent;
      cursor: pointer;
    }

    #replace-image:hover,
    #replace-specimen:hover,
    #capture-region:hover {
      filter: brightness(1.5);
    }
  }
</style>
