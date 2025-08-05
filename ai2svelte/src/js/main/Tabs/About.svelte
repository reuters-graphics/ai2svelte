<script lang="ts">
  import { company, displayName, version } from "../../../shared/shared";
  import { userData } from "../state.svelte";

  function resetUI() {
    userData.accentColor = "#dc4300";
    userData.theme = "dark";
  }
</script>

<div class="tab-content">
  <p>{displayName} v{version} by {company}</p>
  <button onclick={resetUI}>Reset UI</button>
</div>

<style lang="scss">
  .tab-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
</style>
