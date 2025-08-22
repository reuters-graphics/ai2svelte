<script lang="ts">
  import { company, displayName, version } from "../../../shared/shared";
  import { userData } from "../state.svelte";
  import CmTextArea from "../Components/CMTextArea.svelte";
  import SectionTitle from "../Components/SectionTitle.svelte";

  // holds key-value pairs as string
  let yamlString: string = $derived.by(() => {
    return Object.keys(userData.fontsConfig)
      .filter((key) => userData.fontsConfig[key] !== null)
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

  function resetUI() {
    userData.accentColor = "#dc4300";
    userData.theme = "dark";
  }

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

<div class="tab-content">
  <p>{displayName} v{version} by {company}</p>
  <button onclick={resetUI}>Reset UI</button>

  <SectionTitle
    title={"Font Configuration"}
    labels={[]}
    tooltipDescription={[]}
  />
  <CmTextArea
    type="yaml"
    bind:textValue={editableYamlString}
    onUpdate={(e: string) => {
      convertStringToObject(e);
    }}
  />
</div>

<style lang="scss">
  .tab-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
</style>
