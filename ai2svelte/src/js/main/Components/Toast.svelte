<script lang="ts">
  import { onMount } from "svelte";
  import { fade, fly } from "svelte/transition";
  import { Markdown } from "@reuters-graphics/svelte-markdown";

  interface Props {
    message: string;
    duration: number;
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
    <Markdown source={message} />
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
    padding: 1rem;
    border-radius: 8px;
    background-color: var(--color-primary);
  }
</style>
