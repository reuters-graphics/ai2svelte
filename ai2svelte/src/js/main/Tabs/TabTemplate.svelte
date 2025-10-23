<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { evalTS } from "../../lib/utils/bolt";

  onMount(() => {});
</script>

<div class="tab-content"></div>

<style lang="scss">
  .tab-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
</style>
