<script lang="ts">
  const DOCS_URL =
    "https://reuters-graphics.github.io/ai2svelte/users/whats-new/";
  import { mount } from "svelte";
  import { settingsObject, styles } from "../../stores";
  import { evalTS, openLinkInBrowser } from "../../../lib/utils/bolt";
  import { saveSettings, tooltipSettings } from "../../utils/utils";
  import { checkForUpdate } from "../../utils/updateCheck";
  import Toast from "../../Components/Toast.svelte";
  import UpdateTicker from "../../Components/UpdateTicker.svelte";
  import { company, displayName, version } from "../../../../shared/shared";
  import { tooltip } from "svooltip";
  import { lastSaved } from "../../stores";
  import { updateStatus } from "../../state.svelte";

  import Logo from "../../Components/Logo.svelte";
  import RunButton from "./RunButton.svelte";
  import { fly } from "svelte/transition";

  let { refreshSettings = () => {} } = $props();

  $effect(() => {
    if (updateStatus.checked) return;
    updateStatus.checked = true;
    checkForUpdate(version).then((update) => {
      if (!update) return;
      updateStatus.available = true;
      updateStatus.version = update.version;
      updateStatus.url = update.url;
    });
  });
</script>

<div class="tab-content">
  <div class="content">
    {#if updateStatus.available && !updateStatus.dismissed}
      <UpdateTicker
        url={updateStatus.url}
        version={updateStatus.version}
        onDismiss={() => (updateStatus.dismissed = true)}
      />
    {/if}

    <RunButton {refreshSettings} />

    <button
      class="cta-button"
      onclick={async () => {
        if (window.cep) {
          const saved = await saveSettings(
            $settingsObject,
            { styleText: $styles?.root?.toString() },
            version,
          );
          if (!saved) {
            mount(Toast, {
              target: document.body,
              props: {
                message: "Settings could not be saved to the document",
                duration: 4000,
              },
            });
          }
          try {
            await evalTS("exportAsTemplate");
          } catch (error) {
            console.error("[ai2svelte] exportAsTemplate failed:", error);
            mount(Toast, {
              target: document.body,
              props: {
                message: `Error exporting template: ${error instanceof Error ? error.message : String(error)}`,
                duration: 4000,
              },
            });
          }
        }
      }}
      use:tooltip={{
        ...tooltipSettings,
        content: "Export as a reusable template",
      }}>Export as template</button
    >

    <div class="file-info">
      <strong><p>Last saved</p></strong>
      {#key $lastSaved}
        <p in:fly={{ y: 20, duration: 200 }}>
          {$lastSaved !== "Never" && $lastSaved.time
            ? new Date($lastSaved.time).toLocaleString("en-IN", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                timeZoneName: "short",
              })
            : "Never"}
        </p>
      {/key}
    </div>
  </div>

  <div id="credits">
    <Logo />
    <p id="about-line">{displayName} v{version} by {company}</p>
    <button id="docs-link" onclick={() => openLinkInBrowser(DOCS_URL)}
      >Read documentation</button
    >
  </div>
</div>

<style lang="scss">
  @use "../../styles/variables.scss" as *;

  #credits {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
  }

  .content {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 0.25rem;
  }

  .tab-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    justify-content: space-between;
    gap: 16px;
  }

  .cta-button {
    cursor: pointer;
    padding: 1rem;
    color: var(--color-text);
    background-color: var(--color-primary);
    border: unset;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-s);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.2rem;
    margin-bottom: 1rem;
    @include animation-default;
  }

  .cta-button:hover {
    background-color: var(--color-accent-primary);
    color: var(--color-white);
  }

  .cta-button:disabled {
    $primary-clr: var(--color-accent-primary);
    $secondary-clr: rgba(0, 0, 0, 0.25);
    cursor: not-allowed;
    opacity: 0.5;
    color: var(--color-white);
    background:
      repeating-linear-gradient(
        -45deg,
        $primary-clr,
        $primary-clr 8px,
        $secondary-clr 8px,
        $secondary-clr 16px
      ),
      $primary-clr;
    background-size: 200% 200%;
    animation: flicker 4s linear infinite;
  }

  #about-line {
    text-align: center;
    color: var(--color-text-muted);
    letter-spacing: -0.05rem;
  }

  #docs-link {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--color-text-secondary);
    font-size: var(--font-size-s);
    text-decoration: underline;
    text-underline-offset: 2px;

    &:hover {
      color: var(--color-accent-primary);
    }
  }

  .file-info {
    p {
      text-align: center;
    }
  }
</style>
