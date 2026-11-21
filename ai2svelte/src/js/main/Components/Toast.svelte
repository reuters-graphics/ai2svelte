<script lang="ts">
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";

  interface Props {
    message: string;
    duration?: number;
  }

  let { message = "Some text goes here...", duration = 1000 }: Props = $props();

  let toastActive = $state();

  onMount(() => {
    toastActive = true;
    setTimeout(() => {
      toastActive = false;
    }, duration);
  });
</script>

{#if toastActive}
  <div
    class="toast"
    in:fly={{ y: 20, duration: 400 }}
    out:fly={{ y: -20, duration: 400 }}
  >
    {#each message.split("**") as part, i (i)}{#if i % 2 === 1}<strong
          >{part}</strong
        >{:else}{part}{/if}{/each}
  </div>
{/if}

<style lang="scss">
  @use "../styles/variables.scss" as *;

  .toast {
    width: 88%;
    position: absolute;
    top: 90%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 11;
    padding: var(--space-s);
    border-radius: var(--radius-sm);
    background-color: var(--color-primary);
  }
</style>
