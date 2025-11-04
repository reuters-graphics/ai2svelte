<script lang="ts">
  import Input from "../../Components/Input.svelte";
  import CmTextArea from "../../Components/CMTextArea.svelte";

  import { userData } from "../../state.svelte";

  let { activeFormat = "UI" } = $props();

  // holds key-value pairs as string
  let yamlString: string = $derived.by(() => {
    return Object.keys(userData.fontsConfig)
      .map((key) => `${key}: ${userData.fontsConfig[key]}`)
      .join("\n")
      .trim();
  });

  // same as yamlString but used actively
  // by the text editor
  let editableYamlString: string = $state("");

  // Sync the derived yamlString to the editable version when styles change
  $effect(() => {
    editableYamlString = yamlString;
  });

  // converts string in textarea to js object
  function convertStringToObject(s: string) {
    const obj: { [key: string]: unknown } = {};
    s.trim()
      .split("\n")
      .forEach((line) => {
        const [key, ...rest] = line.split(":");
        if (key && rest.length) {
          let value: unknown = rest.join(":").trim();
          // Try to convert to number if possible
          // if (parseInt(value as string)) {
          //     value = Number(value);
          // }
          obj[key.trim()] = value;
        }
      });

    userData.fontsConfig = obj;
  }
</script>

<div class="font-settings">
  <p class="title">Font Configuration</p>
  {#if activeFormat === "UI"}
    <div class="options content-item">
      {#each Object.keys(userData.fontsConfig) as key, index}
        <div class="ai-setting">
          <Input
            label={key}
            bind:value={userData.fontsConfig[key]}
            type="text"
            delay={index * 30}
          />
        </div>
      {/each}
    </div>
  {:else if activeFormat === "Code"}
    <div class="content-item code-editor">
      <CmTextArea
        type="yaml"
        bind:textValue={editableYamlString}
        onUpdate={(e: string) => {
          convertStringToObject(e);
        }}
      />
    </div>
  {/if}
</div>

<style lang="scss">
  .font-settings {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .ai-setting {
    flex-grow: 1;
    transition: 0.3s ease;
  }
  .options {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
  }
  .title {
    text-transform: uppercase;
    font-size: var(--font-size-lg);
    letter-spacing: 0.1rem;
    font-weight: 500;
    user-select: none;
  }
</style>
