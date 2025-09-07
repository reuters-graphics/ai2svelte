<script lang="ts">
  import { userData } from "../state.svelte";
  import { settingsObject } from "../stores";
  import AiSettings from "./Settings/AiSettings.svelte";
  import FontSettings from "./Settings/FontSettings.svelte";
  import Input from "../Components/Input.svelte";
  import { readFile, writeFile } from "../utils/utils";
  import { onMount } from "svelte";

  let profileNameDialog: HTMLElement;
  let activeProfile: string = $state("default");
  let newProfileName: string = $state("placeholder");
  let isModalOpen: boolean = $state(false);
  let existingProfiles = $state({});

  function resetUI() {
    userData.accentColor = "#dc4300";
    userData.theme = "dark";
  }

  function resetConfig() {
    $settingsObject = {};
  }

  function saveProfile() {
    isModalOpen = true;
  }

  function handleNewProfile(event) {
    if (window.cep) {
      writeFile("user-profiles.json", {
        ...existingProfiles,
        [newProfileName]: $settingsObject,
      });
      existingProfiles = readFile("user-profiles.json") || {};
    }
    console.log(newProfileName);
    isModalOpen = false;
  }

  onMount(() => {
    if (window.cep) {
      existingProfiles = readFile("user-profiles.json") || {};
      activeProfile = Object.keys(existingProfiles)[0] || "default";
    }
  });

  $effect(() => {
    if (activeProfile && existingProfiles[activeProfile]) {
      console.log("settings changed to :" + activeProfile);
      console.log(existingProfiles[activeProfile]);
      $settingsObject = { ...existingProfiles[activeProfile] };
    }
  });

  let activeFormat: string = $state("UI");
</script>

<div class="dialog-backdrop" style="display: {isModalOpen ? 'block' : 'none'};">
  <dialog
    class="profile-dialog {isModalOpen ? 'modal-open' : ''}"
    bind:this={profileNameDialog}
  >
    <p>Save profile settings</p>
    <form method="dialog" onsubmit={handleNewProfile}>
      <Input label="Profile Name" type="text" bind:value={newProfileName} />
      <button>OK</button>
    </form>
  </dialog>
</div>

<div class="tab-content">
  <div id="settings-content">
    <Input
      label="Settings Profile"
      type="select"
      options={Object.keys(existingProfiles)}
      bind:value={activeProfile}
    />
    <AiSettings bind:activeFormat />

    <hr />

    <FontSettings {activeFormat} />
  </div>

  <div id="reset-settings">
    <button onclick={saveProfile}>Save Profile</button>
    <button>Delete Profile</button>
    <button onclick={resetConfig}>Reset Config</button>
    <button onclick={resetUI}>Reset Theme</button>
  </div>
</div>

<style lang="scss">
  @use "../styles/variables.scss" as *;

  .profile-dialog {
    all: unset;
    max-width: 100%;
    position: absolute;
    z-index: 10;
    top: 50%;
    left: 50%;
    transform-origin: center;
    transform: translate(-50%, -50%) scale(0.9);
    background-color: var(--color-secondary);
    padding: 1rem;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    opacity: 0;
    pointer-events: none;
    transition: 0.2s cubic-bezier(0.45, 0, 0.29, 1.43);

    form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    button {
      all: unset;
      cursor: pointer;
      flex: 1;
      padding: 1rem;
      background-color: var(--color-primary);
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.1rem;
      @include animation-default;
    }

    button:hover {
      background-color: var(--color-accent-primary);
    }
  }

  .modal-open {
    pointer-events: unset;
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }

  .dialog-backdrop {
    position: absolute;
    z-index: 3;
    width: 100vw;
    height: 100vh;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
  }

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
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
    width: 100%;

    button {
      all: unset;
      cursor: pointer;
      flex: 1;
      padding: 1rem;
      background-color: var(--color-primary);
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.1rem;
      font-size: var(--font-size-xs);
      @include animation-default;
    }

    button:hover {
      background-color: #ff2400;
    }
  }
</style>
