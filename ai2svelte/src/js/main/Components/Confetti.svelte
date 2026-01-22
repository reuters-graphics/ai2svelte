<script lang="ts">
  import { confetti } from "@tsparticles/confetti";
  import { triggerConfetti } from "../stores";
  import { userData } from "../state.svelte";

  const colors = $derived([
    userData.theme === "dark" ? "#888" : "#888",
    userData.accentColor || "#dc4300",
  ]);

  function throwConfetti() {
    const end = Date.now() + 0.5 * 1000;

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 45,
        origin: { x: 0, y: 1 },
        colors: colors,
        scalar: 1,
        shapes: ["circle", "square"],
        startVelocity: 40,
        gravity: 3,
      });

      confetti({
        particleCount: 5,
        angle: 120,
        spread: 45,
        origin: { x: 1, y: 1 },
        colors: colors,
        scalar: 1,
        shapes: ["circle", "square"],
        startVelocity: 40,
        gravity: 3,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }

  $effect(() => {
    if ($triggerConfetti) {
      throwConfetti();
      $triggerConfetti = false;
    }
  });
</script>

<div class="background-ele"></div>

<style lang="scss">
  .background-ele {
    position: absolute;
    width: 100vw;
    height: 100lvh;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
</style>
