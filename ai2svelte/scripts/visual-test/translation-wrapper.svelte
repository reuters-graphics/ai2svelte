<script>
  import Graphic from "./translation.svelte";

  let {
    assetsPath = "/",
    onAiMounted = null,
    onArtboardChange = null,
  } = $props();
  let lang = $state("en");
</script>

<button type="button" onclick={() => (lang = "fr")}>French</button>
<button type="button" onclick={() => (lang = "fr-CA")}>French Canada</button>
<button type="button" onclick={() => (lang = "FR")}>French uppercase</button>
<button type="button" onclick={() => (lang = "fr-@")}>Malformed French tag</button>
<button type="button" onclick={() => (lang = "ar")}>Arabic</button>
<button type="button" onclick={() => (lang = "de")}>German</button>
<button type="button" onclick={() => (lang = "it")}>Unknown language</button>
<Graphic {assetsPath} {onAiMounted} {onArtboardChange} {lang} />
