<script lang="ts">
  import { settingsObject, styles } from "../../stores";
  import { evalTS } from "../../../lib/utils/bolt";
  import { saveSettings, tooltipSettings } from "../../utils/utils";
  import { company, displayName, version } from "../../../../shared/shared";
  import { tooltip } from "svooltip";
  import { lastSaved } from "../../stores";

  import Logo from "../../Components/Logo.svelte";
  import RunButton from "./RunButton.svelte";
  import { fly } from "svelte/transition";

  let { refreshSettings = () => {} } = $props();
</script>

<div class="tab-content">
  <div class="content">
    <RunButton {refreshSettings} />

    <button
      class="cta-button"
      onclick={async () => {
        if (window.cep) {
          saveSettings($settingsObject, $styles, version);
          await evalTS("exportAsTemplate");
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
            ? new Date($lastSaved.time).toString()
            : "Never"}
        </p>
      {/key}
    </div>
  </div>

  <div id="credits">
    <Logo />
    <p id="about-line">{displayName} v{version} by {company}</p>
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
    color: var(--color-tertiary);
    letter-spacing: -0.05rem;
  }

  .file-info {
    p {
      text-align: center;
    }
  }
</style>
