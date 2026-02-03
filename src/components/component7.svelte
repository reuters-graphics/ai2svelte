<script lang="ts">
  import DynamicText from "./ai2svelte/dynamicText.svelte";
</script>

<div>
  <DynamicText
    debugTaggedText={true}
    assetsPath="/ai2svelte/"
    taggedText={{
      text: {
        myTag: {
          text1: `This is a :text layer with a dynamic value from Svelte!
		  
		  The width of the text box, along with the styling, remains the same as in Illustrator.`,
        },
      },
      htext: {
        myTag2: {
          text2: `This is an <span style="background-color: lightblue; color: dodgerblue; border-radius: 4px; padding: 2px 8px;">:htext</span> layer with a dynamic value from Svelte!<br/><br/>:htext allows you to inject <span class="images">
			<img style="width: 48px; aspect-ratio: 1; padding: 0; border-radius: 48px; border: 3px solid #fff;" src="https://picsum.photos/200/300?random=1" alt="Example Image" />
			<img style="width: 48px; aspect-ratio: 1; padding: 0; margin: 0px -24px; border-radius: 48px; border: 3px solid #fff;" src="https://picsum.photos/200/300?random=2" alt="Example Image" />
			<img style="width: 48px; aspect-ratio: 1; padding: 0; border-radius: 48px; border: 3px solid #fff;" src="https://picsum.photos/200/300?random=3" alt="Example Image" />
			</span> raw HTML content.`,
        },
      },
    }}
  />
</div>

<style lang="scss">
  :global(.images) {
    display: inline;
  }
</style>
