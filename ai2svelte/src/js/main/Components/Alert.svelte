<script lang="ts">
  import { fly } from "svelte/transition";
  let { message } = $props();
</script>

<div class="alert" transition:fly={{ y: 20 }}>
  {message}
</div>

<style lang="scss">
  .alert {
    width: 100%;
    text-align: center;
    background-color: hsl(349 70% 45% / 0.2);
    color: hsl(349 70% 45% / 1);
    padding: 0.25rem 0.25rem 0.35rem 0.25rem;
    border-radius: 0.25rem;
    margin-bottom: 1rem;
  }
</style>
