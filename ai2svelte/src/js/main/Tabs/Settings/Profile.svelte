<script lang="ts">
  import { onMount } from "svelte";
  import Input from "../../Components/Input.svelte";
</script>

<Input
  label="Settings Profile"
  type="select"
  options={["option1", "option2"]}
  value={"option1"}
/>
