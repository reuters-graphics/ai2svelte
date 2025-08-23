<script lang="ts">
  import { company, displayName, version } from "../../../shared/shared";
  import { userData } from "../state.svelte";
  import CmTextArea from "../Components/CMTextArea.svelte";
  import SectionTitle from "../Components/SectionTitle.svelte";
  import { settingsObject } from "../stores";

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

  function resetConfig() {
    $settingsObject = {};
  }
</script>

<div class="content">
  <div class="tab-content">
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

  <div id="bottom-content">
    <div id="reset-settings">
      <button onclick={resetConfig}>Reset Config</button>
      <button onclick={resetUI}>Reset Theme</button>
    </div>
    <p id="about-line">{displayName} v{version} by {company}</p>
  </div>
</div>

<style lang="scss">
  @use "../styles/variables.scss" as *;

  .content {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 1rem;
  }

  .tab-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  #bottom-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  #about-line {
    text-align: center;
  }

  #reset-settings {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;

    button {
      all: unset;
      cursor: pointer;
      padding: 1rem;
      background-color: var(--color-primary);
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.1rem;
      @include animation-default;
    }

    button:hover {
      background-color: #ff2400;
    }
  }
</style>
