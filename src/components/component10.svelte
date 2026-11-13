<script lang="ts">
  import Canal from "./ai2svelte/evergiven.svelte";

  // Every text object carries its translations as data-* attributes, written
  // as notes in Illustrator's Attributes panel:
  //   en: "Cause disputed"
  //   es: "Causa en disputa"
  // The language comes from the control on the page (ExampleFrame sends an
  // "example:lang" event), so there's no dictionary in the code.
  //
  // The numbered badges are plain text objects with the note "badge: true".
  // Their circle is CSS too, but it lives in the ai2svelte styles (the custom
  // CSS saved in the .ai file), so it's part of the exported component.

  let root: HTMLElement | undefined = $state();
  let lang = $state("en");

  $effect(() => {
    // The control may have been used before this component hydrated
    lang =
      (window as Window & { __exampleLang?: string }).__exampleLang ?? "en";
    const onLang = (e: Event) => (lang = (e as CustomEvent<string>).detail);
    window.addEventListener("example:lang", onLang);
    return () => window.removeEventListener("example:lang", onLang);
  });

  $effect(() => {
    if (!root) return;
    root.querySelectorAll<HTMLElement>("[data-en]").forEach((el) => {
      const p = el.querySelector("p");
      if (p) p.textContent = el.dataset[lang] ?? el.dataset.en ?? "";
    });
  });
</script>

<div class="wrap" {lang} dir={lang === "ar" ? "rtl" : "ltr"} bind:this={root}>
  <Canal assetsPath="/ai2svelte/" />
</div>

<style lang="scss">
  .wrap {
    max-width: 1200px;
    margin: 0 auto;
    /* No side padding: the artboards switch on this box's width, so it has to
       be exactly the width of the page (or of the frame the page controls set). */
    padding: 56px 0 16px;
  }

  // On a phone the page controls stack above the artwork
  @media (max-width: 30rem) {
    .wrap {
      padding-top: 104px;
    }
  }

  // Text boxes are placed from the left in the artwork, so right-to-left
  // text is right-aligned inside them. The number badges stay centred.
  .wrap[dir="rtl"] :global([data-en]:not([data-badge]) p) {
    text-align: right !important;
  }
</style>
