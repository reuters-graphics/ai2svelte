<script lang="ts">
  import HeadlineComponent from "./ai2svelte/headline.svelte";
  import { Headline, Theme } from "@reuters-graphics/graphics-components";
</script>

{#snippet headline()}
  <Theme base="Dark">
    <Headline
      hed={"Reuters Graphics Interactive"}
      dek={"The beginning of a beautiful page"}
      section={"Global news"}
      authors={["Jane Doe"]}
      publishTime={new Date("2020-01-01").toISOString()}
      getAuthorPage={(author) =>
        `mailto:${author.replace(" ", "")}@example.com`}
    />
  </Theme>
{/snippet}

<HeadlineComponent assetsPath="/docs/" hed={headline} />

<style lang="scss">
  :global {
    .headline-wrapper {
      * {
        color: white !important;
      }
    }
  }
</style>
