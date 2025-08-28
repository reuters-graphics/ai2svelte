<script lang="ts">
  import { userData } from "../state.svelte";
  import { settingsObject } from "../stores";
  import AiSettings from "./Settings/AiSettings.svelte";
  import FontSettings from "./Settings/FontSettings.svelte";

  function resetUI() {
    userData.accentColor = "#dc4300";
    userData.theme = "dark";
  }

  function resetConfig() {
    $settingsObject = {};
  }

  let activeFormat: string = $state("UI");
</script>

<div class="tab-content">
  <div id="settings-content">
    <AiSettings bind:activeFormat />

    <hr />

    <FontSettings {activeFormat} />
  </div>

  <div id="reset-settings">
    <button onclick={resetConfig}>Reset Config</button>
    <button onclick={resetUI}>Reset Theme</button>
  </div>
</div>

<style lang="scss">
  @use "../styles/variables.scss" as *;

  .tab-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 1rem;
  }

  #settings-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
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
