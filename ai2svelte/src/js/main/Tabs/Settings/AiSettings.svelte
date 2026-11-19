<script lang="ts">
  import { onMount } from "svelte";
  import { settingsObject } from "../../stores";
  import SectionTitle from "../../Components/SectionTitle.svelte";
  import Input from "../../Components/Input.svelte";
  import CmTextArea from "../../Components/CMTextArea.svelte";
  import { aiSettingsTokens } from "../../utils/settingsTokens";
  import { checkWebpSupport } from "../../utils/rasterJobs";
  import { convertStringToObject } from "./utils";
  import { csi, evalTS } from "../../../lib/utils/bolt";
  import { canonicalizeLanguageTags } from "../../utils/languages";
  import { parseTextTranslationStore } from "../../../../shared/textTranslations";

  let { activeFormat = $bindable("UI"), defaultProfile } = $props();

  let codeContent: HTMLElement | undefined = $state();
  let hasMultipleLanguages = $state(false);
  let translationSettingsError = $state("");
  let translationCountGeneration = 0;
  const visibleSettingKeys = $derived(
    Object.keys($settingsObject).filter(
      (key) => key !== "include_translations" || hasMultipleLanguages,
    ),
  );
  const codeSettingKeys = $derived(Object.keys($settingsObject));

  // webp is hidden where the panel can't encode it, unless it's already the
  // saved value (other systems can still export it; here the images are kept
  // as PNG and the completion alert says so)
  let webpOk = $state(true);
  checkWebpSupport().then((ok) => (webpOk = ok));

  // holds key-value pairs as string
  let yamlString: string = $derived.by(() => {
    return visibleSettingKeys
      .filter((key) => $settingsObject[key] !== null)
      .map((key) => `${key}: ${$settingsObject[key]}`)
      .join("\n")
      .trim();
  });

  let codeYamlString: string = $derived.by(() => {
    return codeSettingKeys
      .filter((key) => $settingsObject[key] !== null)
      .map((key) => `${key}: ${$settingsObject[key]}`)
      .join("\n")
      .trim();
  });

  // same as yamlString but used actively
  // by the text editor
  // Sync the derived yamlString to the editable version when styles change
  let editableYamlString: string = $derived(
    activeFormat === "Code" ? codeYamlString : yamlString,
  );

  async function refreshTranslationLanguageCount() {
    const generation = ++translationCountGeneration;
    try {
      const result = (await evalTS("fetchTextTranslationDocument")) as
        { data?: unknown } | undefined;
      const store = parseTextTranslationStore(result?.data);
      if (generation === translationCountGeneration) {
        hasMultipleLanguages =
          canonicalizeLanguageTags(store.languages).length > 1;
        translationSettingsError = "";
        if (
          hasMultipleLanguages &&
          !Object.prototype.hasOwnProperty.call(
            $settingsObject,
            "include_translations",
          )
        ) {
          $settingsObject = { ...$settingsObject, include_translations: true };
        }
      }
    } catch (error) {
      if (generation === translationCountGeneration) {
        hasMultipleLanguages = false;
        translationSettingsError =
          error instanceof Error ? error.message : String(error);
        console.error(
          "[ai2svelte] could not read document translation languages:",
          error,
        );
      }
    }
  }

  onMount(() => {
    if (Object.keys($settingsObject).length === 0) {
      $settingsObject = { ...defaultProfile };
    }
    void refreshTranslationLanguageCount();
    const handleDocumentChange = () => {
      void refreshTranslationLanguageCount();
    };
    csi.addEventListener("documentAfterActivate", handleDocumentChange);
    const handleTranslationUpdate = (event: Event) => {
      const count = (event as CustomEvent<{ languageCount?: number }>).detail
        ?.languageCount;
      if (typeof count === "number") {
        hasMultipleLanguages = count > 1;
        if (
          hasMultipleLanguages &&
          !Object.prototype.hasOwnProperty.call(
            $settingsObject,
            "include_translations",
          )
        ) {
          $settingsObject = { ...$settingsObject, include_translations: true };
        }
      } else void refreshTranslationLanguageCount();
    };
    window.addEventListener(
      "text-translations-updated",
      handleTranslationUpdate,
    );
    return () => {
      window.removeEventListener(
        "text-translations-updated",
        handleTranslationUpdate,
      );
      translationCountGeneration++;
      csi.removeEventListener("documentAfterActivate", handleDocumentChange);
    };
  });
</script>

<div class="ai-settings">
  <SectionTitle
    title="Settings"
    labels={["UI", "Code"]}
    tooltipDescription={["Simplified settings", "Advanced settings"]}
    bind:activeValue={activeFormat}
  />

  {#if translationSettingsError}
    <p class="feedback error" role="alert">{translationSettingsError}</p>
  {/if}
  <div class="content">
    {#if activeFormat === "UI"}
      <div id="ui-form" class="options content-item">
        {#if $settingsObject && aiSettingsTokens}
          {#each visibleSettingKeys as key, index (key)}
            {@const type =
              aiSettingsTokens.find((item) => item.label == key)?.inputType ||
              "text"}
            <div class="ai-setting">
              {#if type == "select"}
                {@const options = aiSettingsTokens
                  .find((item) => item.label == key)
                  ?.options?.filter(
                    (o) =>
                      webpOk ||
                      o != "webp" ||
                      (key == "image_format" && $settingsObject[key] == "webp"),
                  )}
                <Input
                  label={key}
                  {options}
                  bind:value={$settingsObject[key] as string}
                  delay={index * 30}
                />
              {:else if type == "range"}
                {@const start = aiSettingsTokens.find(
                  (item) => item.label == key,
                )?.start}
                {@const end = aiSettingsTokens.find(
                  (item) => item.label == key,
                )?.end}
                <Input
                  label={key}
                  bind:value={$settingsObject[key] as number}
                  start={start ?? 0}
                  end={end ?? 100}
                  type="range"
                  delay={index * 30}
                />
              {:else}
                <!-- avoid condition here to allow any keys from Code section as text input -->
                <Input
                  label={key}
                  bind:value={$settingsObject[key] as string}
                  type="text"
                  delay={index * 30}
                />
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    {:else if activeFormat === "Code"}
      <div
        id="aisettings-textarea"
        class="content-item code-editor"
        bind:this={codeContent}
      >
        {#if aiSettingsTokens}
          <CmTextArea
            type="yaml"
            bind:textValue={editableYamlString}
            onUpdate={(e: string) => {
              const next = convertStringToObject(e);
              $settingsObject = next;
            }}
            autoCompletionTokens={aiSettingsTokens}
          />
        {/if}
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  @use "../../styles/variables.scss" as *;

  .ai-settings {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .options {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
  }

  .ai-setting {
    flex-grow: 1;
    transition: 0.3s ease;
  }
</style>
