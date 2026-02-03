<script lang="ts">
  import { slide } from "svelte/transition";
  let { message } = $props();
</script>

<div class="alert" transition:slide={{ axis: "y", duration: 200 }}>
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
