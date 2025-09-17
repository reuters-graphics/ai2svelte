<script lang="ts">
  import { userData } from "../state.svelte";
  import { settingsObject, savedSettings } from "../stores";
  import AiSettings from "./Settings/AiSettings.svelte";
  import FontSettings from "./Settings/FontSettings.svelte";
  import Input from "../Components/Input.svelte";
  import { readFile, writeFile, tooltipSettings } from "../utils/utils";
  import { onMount, untrack, mount } from "svelte";
  import defaultProfile from "./data/default-profile.json";
  import Toast from "../Components/Toast.svelte";
  import { tooltip } from "svooltip";

  let profileNameDialog: HTMLElement;
  let profileListDialog: HTMLElement;
  let activeProfile: string = $state("");
  let tempActiveProfile: string = $state("");
  let newProfileName: string = $state("");
  let isProfileNameModalOpen: boolean = $state(false);
  let isProfileListModalOpen: boolean = $state(false);
  let refreshKey = $state(1);
  let existingProfiles = $derived.by(() => {
    if (window.cep) {
      let usersProfiles = readFile("user-profiles.json") || {};
      if (!Object.keys(usersProfiles).includes("default")) {
        writeFile("user-profiles.json", {
          ...usersProfiles,
          ...defaultProfile,
        });
        usersProfiles = readFile("user-profiles.json");
      }
      return { ...usersProfiles };
    } else {
      return defaultProfile;
    }
  });

  function resetUI() {
    userData.accentColor = "#dc4300";
    userData.theme = "dark";

    mount(Toast, {
      target: document.body,
      props: { message: "Theme reset!" },
    });
  }

  function resetConfig() {
    $settingsObject = { ...existingProfiles.default };
    refreshKey++;

    mount(Toast, {
      target: document.body,
      props: { message: "Settings reset to **default**" },
    });
  }

  function saveProfile() {
    isProfileNameModalOpen = true;
  }

  function loadProfile() {
    isProfileListModalOpen = true;
  }

  function deleteProfile(profile) {
    if (window.cep && profile !== "default") {
      delete existingProfiles[profile];
      writeFile("user-profiles.json", existingProfiles);
      isProfileListModalOpen = false;
      refreshProfile();
    }
  }

  function handleNewProfile() {
    if (window.cep) {
      writeFile("user-profiles.json", {
        ...existingProfiles,
        [newProfileName]: $settingsObject,
      });
      existingProfiles = readFile("user-profiles.json") || {};
      mount(Toast, {
        target: document.body,
        props: {
          message: `**${newProfileName}** profile created successfully`,
        },
      });
    }
    isProfileNameModalOpen = false;
  }

  function profileLoaded(profile) {
    if (profile && existingProfiles[profile]) {
      activeProfile = profile;
      refreshKey++;
      $settingsObject = { ...existingProfiles[profile] };
      mount(Toast, {
        target: document.body,
        props: { message: `**${profile}** profile loaded successfully` },
      });
    }

    isProfileListModalOpen = false;
  }

  function refreshProfile() {
    if (window.cep) {
      existingProfiles = readFile("user-profiles.json") || {};
    }
  }

  onMount(() => {
    if (window.cep) {
      tempActiveProfile = "default";
    }
  });

  let activeFormat: string = $state("UI");
</script>

<div
  class="dialog-backdrop"
  style="display: {isProfileNameModalOpen ? 'block' : 'none'};"
>
  <dialog
    class="profile-dialog {isProfileNameModalOpen ? 'modal-open' : ''}"
    bind:this={profileNameDialog}
  >
    <p>Save profile settings</p>
    <form method="dialog">
      <Input label="Profile Name" type="text" bind:value={newProfileName} />
      <button
        onclick={() => (newProfileName !== "" ? handleNewProfile() : null)}
        >OK</button
      >
      <button onclick={() => (isProfileNameModalOpen = false)}>Cancel</button>
    </form>
  </dialog>
</div>

<div
  class="dialog-backdrop"
  style="display: {isProfileListModalOpen ? 'block' : 'none'};"
>
  <dialog
    class="profile-dialog {isProfileListModalOpen ? 'modal-open' : ''}"
    bind:this={profileListDialog}
  >
    <p>Load profile settings</p>
    <form method="dialog">
      <Input
        label="Load Profile"
        type="select"
        options={Object.keys(existingProfiles)}
        bind:value={tempActiveProfile}
      />
      <button onclick={() => profileLoaded(tempActiveProfile)}>OK</button>
      <button onclick={() => profileLoaded(null)}>Cancel</button>
      {#if !tempActiveProfile == "default"}
        <button onclick={() => deleteProfile(null)}
          >Delete {tempActiveProfile} Profile</button
        >
      {/if}
    </form>
  </dialog>
</div>

<div class="tab-content">
  <div id="settings-content">
    {#if Object.keys(existingProfiles).length > 0}
      {#key refreshKey}
        <AiSettings
          bind:activeFormat
          defaultProfile={existingProfiles.default}
        />
      {/key}
    {/if}

    <hr />

    <FontSettings {activeFormat} />
  </div>

  <div id="reset-settings">
    <button
      onclick={loadProfile}
      use:tooltip={{
        ...tooltipSettings,
        content: "Load user profile",
      }}>Load Profile</button
    >
    <button
      onclick={saveProfile}
      use:tooltip={{
        ...tooltipSettings,
        content: "Save user profile",
      }}>Save Profile</button
    >
    <button
      class="negative"
      onclick={resetConfig}
      use:tooltip={{
        ...tooltipSettings,
        content: "Reset configuration",
      }}>Reset Config</button
    >
    <button
      class="negative"
      onclick={resetUI}
      use:tooltip={{
        ...tooltipSettings,
        content: "Reset UI Theme",
      }}>Reset Theme</button
    >
  </div>
</div>

<style lang="scss">
  @use "../styles/variables.scss" as *;

  .profile-dialog {
    all: unset;
    min-width: 50vw;
    max-width: 100vw;
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
    gap: 4rem;
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
      font-size: var(--font-size-sm);
      @include animation-default;
    }

    .negative:hover {
      background-color: #ff2400;
    }

    button:hover {
      background-color: var(--color-secondary);
    }
  }
</style>
