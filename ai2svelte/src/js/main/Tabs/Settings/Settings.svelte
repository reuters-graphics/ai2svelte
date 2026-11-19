<script lang="ts">
  import { userData } from "../../state.svelte";
  import { settingsObject } from "../../stores";
  import AiSettings from "./AiSettings.svelte";
  import FontSettings from "./FontSettings.svelte";
  import Dialog from "../../Components/Dialog.svelte";
  import Input from "../../Components/Input.svelte";
  import { readFile, writeFile, tooltipSettings } from "../../utils/utils";
  import { mount } from "svelte";
  import defaultProfile from "../data/default-profile.json";
  import Toast from "../../Components/Toast.svelte";
  import { tooltip } from "svooltip";
  import { evalTS, selectFolder } from "../../../lib/utils/bolt";
  import { fs } from "../../../lib/cep/node";
  import type { UserProfiles } from "../types";
  import { exportDebugReport, findDebugData } from "../../utils/debugLog";

  let profileNameDialog = $state<HTMLDialogElement>();
  let profileListDialog = $state<HTMLDialogElement>();
  let tempActiveProfile: string = $state("default");
  let newProfileName: string = $state("");
  let fileLoader: HTMLInputElement;
  let refreshKey: number = $state(1);
  let activeFormat: string = $state("UI");
  let existingProfiles: UserProfiles = $derived.by(() => {
    if (window.cep) {
      let usersProfiles =
        (readFile("user-profiles.json") as UserProfiles) || {};
      if (usersProfiles && !Object.keys(usersProfiles).includes("default")) {
        writeFile("user-profiles.json", {
          ...usersProfiles,
          ...defaultProfile,
        });
        usersProfiles = (readFile("user-profiles.json") as UserProfiles) || {};
      }
      return { ...usersProfiles };
    } else {
      return defaultProfile;
    }
  });

  function resetUI(): void {
    userData.accentColor = "#dc4300";
    userData.theme = "dark";

    mount(Toast, {
      target: document.body,
      props: { message: "Theme reset!" },
    });
  }

  function resetConfig(): void {
    $settingsObject = { ...existingProfiles.default };
    refreshKey++;

    mount(Toast, {
      target: document.body,
      props: { message: "Settings reset to **default**" },
    });
  }

  function deleteProfile(profile: string): void {
    if (window.cep && profile !== "default") {
      delete existingProfiles[profile];
      writeFile("user-profiles.json", existingProfiles);
      mount(Toast, {
        target: document.body,
        props: { message: `Profile deleted successfully` },
      });
      refreshProfile();
    }
  }

  function handleNewProfile(): void {
    if (window.cep) {
      writeFile("user-profiles.json", {
        ...existingProfiles,
        [newProfileName]: $settingsObject,
      });
      existingProfiles = (readFile("user-profiles.json") as UserProfiles) || {};
      mount(Toast, {
        target: document.body,
        props: {
          message: `**${newProfileName}** profile created successfully`,
        },
      });
    }
  }

  function profileLoaded(profile: string | null): void {
    if (profile && existingProfiles[profile]) {
      refreshKey++;
      $settingsObject = { ...existingProfiles[profile] };
      mount(Toast, {
        target: document.body,
        props: { message: `**${profile}** profile loaded successfully` },
      });
    }
  }

  function refreshProfile(): void {
    if (window.cep) {
      existingProfiles = (readFile("user-profiles.json") as UserProfiles) || {};
    }
  }

  function saveProfilesFromFile(input: HTMLInputElement): void {
    const file = input.files?.[0];
    if (!file) return;

    file.text().then((text: string) => {
      let jsonData: UserProfiles;
      try {
        jsonData = JSON.parse(text);

        if (window.cep) {
          writeFile("user-profiles.json", {
            ...existingProfiles,
            ...jsonData,
          });
          existingProfiles =
            (readFile("user-profiles.json") as UserProfiles) || {};
        }

        mount(Toast, {
          target: document.body,
          props: {
            message: `${Object.keys(jsonData).length} profiles loaded from ${file.name}`,
            duration: 2000,
          },
        });
      } catch (err: unknown) {
        console.error("[ai2svelte] Invalid JSON in profiles file:", err);
        mount(Toast, {
          target: document.body,
          props: {
            message: `Error loading ${file.name}. File must be valid JSON.`,
            duration: 3000,
          },
        });
      } finally {
        // Always reset the input so the same file can be re-selected after an error
        input.value = "";
      }
    });
  }

  async function exportDebugReportToFolder(): Promise<void> {
    const toast = (message: string) =>
      mount(Toast, {
        target: document.body,
        props: { message, duration: 4000 },
      });
    let docPath: string;
    try {
      docPath = await evalTS("getFilePath");
    } catch {
      toast("Open the file you want a debug report for, then try again.");
      return;
    }
    const data = findDebugData(docPath);
    if (!data) {
      toast(
        "There's no debug log for this file yet. Export it once, then try again.",
      );
      return;
    }
    selectFolder("", "Save debug report at", (folderPath: string) => {
      try {
        toast(
          `Debug report saved at ${exportDebugReport(folderPath, data)}. It includes a copy of this .ai file plus logs of settings, layer names and file paths, and may cover other documents opened in the same session.`,
        );
      } catch (err: unknown) {
        console.error("[ai2svelte] Debug report export failed:", err);
        toast(`Error saving debug report: ${err}.`);
      }
    });
  }

  function exportProfilesToFile(): void {
    selectFolder("", "Save profiles at", (filePath: string) => {
      const file = filePath + "/profiles.json";
      try {
        fs.writeFileSync(file, JSON.stringify(existingProfiles, null, 2));

        mount(Toast, {
          target: document.body,
          props: {
            message: `File saved successfully at ${file}.`,
            duration: 4000,
          },
        });
      } catch (err: Error | unknown) {
        console.error("Error writing file:", err);
        mount(Toast, {
          target: document.body,
          props: {
            message: `Error writing file: ${err}.`,
            duration: 4000,
          },
        });
      }
    });
  }
</script>

<Dialog
  title="Save profile"
  titleId="save-profile-title"
  bind:element={profileNameDialog}
>
  <form
    id="save-profile-form"
    class="profile-form"
    onsubmit={(event) => {
      event.preventDefault();
      if (!newProfileName.trim()) return;
      handleNewProfile();
      profileNameDialog?.close();
    }}
  >
    <label for="profile-name">Profile name</label>
    <input
      id="profile-name"
      name="profile-name"
      type="text"
      autocomplete="off"
      required
      bind:value={newProfileName}
    />
  </form>
  {#snippet utility()}
    <button
      class="dialog-link"
      type="button"
      onclick={() => exportProfilesToFile()}>Export all profiles</button
    >
  {/snippet}
  {#snippet actions()}
    <button class="dialog-button" onclick={() => profileNameDialog?.close()}
      >Cancel</button
    >
    <button
      class="dialog-button primary"
      type="submit"
      form="save-profile-form"
      disabled={!newProfileName.trim()}>Save profile</button
    >
  {/snippet}
</Dialog>

<Dialog
  title="Load profile"
  titleId="load-profile-title"
  bind:element={profileListDialog}
>
  <form
    id="load-profile-form"
    class="profile-form"
    onsubmit={(e) => {
      e.preventDefault();
      profileLoaded(tempActiveProfile);
      profileListDialog?.close();
    }}
  >
    <Input
      label="Profile"
      type="select"
      options={Object.keys(existingProfiles)}
      bind:value={tempActiveProfile}
      portalTarget={profileListDialog}
    />
    <input
      bind:this={fileLoader}
      type="file"
      id="avatar"
      name="avatar"
      accept="application/json"
      style="display: none;"
      onchange={function (this: HTMLInputElement) {
        saveProfilesFromFile(this);
      }}
    />
  </form>
  {#snippet utility()}
    <button
      class="dialog-link"
      type="button"
      onclick={() => fileLoader?.click()}>Import profiles</button
    >
  {/snippet}
  {#if tempActiveProfile !== "default"}
    <div class="profile-tools">
      <button
        class="dialog-button danger"
        type="button"
        onclick={() => {
          deleteProfile(tempActiveProfile);
          tempActiveProfile = "default";
        }}>Delete selected profile</button
      >
    </div>
  {/if}
  {#snippet actions()}
    <button class="dialog-button" onclick={() => profileListDialog?.close()}
      >Cancel</button
    >
    <button class="dialog-button primary" type="submit" form="load-profile-form"
      >Load profile</button
    >
  {/snippet}
</Dialog>

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
      onclick={() => {
        profileNameDialog?.showModal();
      }}
      use:tooltip={{
        ...tooltipSettings,
        content: "Save user profile",
      }}>Save Profile</button
    >
    <button
      onclick={() => profileListDialog?.showModal()}
      use:tooltip={{
        ...tooltipSettings,
        content: "Load user profile",
      }}>Load Profile</button
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
    <button
      onclick={exportDebugReportToFolder}
      use:tooltip={{
        ...tooltipSettings,
        content: "Save this file's logs and snapshot to send for debugging",
      }}>Debug Report</button
    >
  </div>
</div>

<style lang="scss">
  @use "../../styles/variables.scss" as *;

  .profile-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);

    label {
      color: var(--color-text);
      opacity: 0.75;
      font-size: var(--font-size-sm);
      text-transform: uppercase;
    }

    input {
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
      min-height: 2.5rem;
      padding: var(--space-s);
      border: 1px solid var(--color-field-border);
      border-radius: var(--space-s);
      background-color: var(--color-primary);
      color: var(--color-text);
      font: inherit;
    }
  }

  .profile-tools {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-s);
    margin-top: var(--space-l);
    padding-top: var(--space-l);
    border-top: 1px solid var(--color-ruler);
  }

  .tab-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
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
