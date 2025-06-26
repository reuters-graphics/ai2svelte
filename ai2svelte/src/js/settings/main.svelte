<script lang="ts">
  import { onMount } from "svelte";
  import { os, path } from "../lib/cep/node";
  import {
    csi,
    evalES,
    openLinkInBrowser,
    subscribeBackgroundColor,
    evalTS,
  } from "../lib/utils/bolt";
  import "../index.scss";
  import "./main.scss";
  let backgroundColor: string = $state("#282c34");

  import viteLogo from "../assets/vite.svg";
  import svelteLogo from "../assets/svelte.svg";
  import tsLogo from "../assets/typescript.svg";
  import sassLogo from "../assets/sass.svg";
  import nodeJs from "../assets/node-js.svg";
  import adobe from "../assets/adobe.svg";
  import bolt from "../assets/bolt-cep.svg";

  let count: number = $state(0);
  let double: number = $derived(count * 2);

  //* Demonstration of Traditional string eval-based ExtendScript Interaction
  const jsxTest = () => {
    console.log(evalES(`helloWorld("${csi.getApplicationID()}")`));
  };

  //* Demonstration of End-to-End Type-safe ExtendScript Interaction
  const jsxTestTS = () => {
    evalTS("helloStr", "test").then((res) => {
      console.log(res);
    });
    evalTS("helloNum", 1000).then((res) => {
      console.log(typeof res, res);
    });
    evalTS("helloArrayStr", ["ddddd", "aaaaaa", "zzzzzzz"]).then((res) => {
      console.log(typeof res, res);
    });
    evalTS("helloObj", { height: 90, width: 100 }).then((res) => {
      console.log(typeof res, res);
      console.log(res.x);
      console.log(res.y);
    });
    evalTS("helloVoid").then(() => {
      console.log("function returning void complete");
    });
    evalTS("helloError", "test").catch((e) => {
      console.log("there was an error", e);
    });
  };

  const nodeTest = () => {
    alert(
      `Node.js ${process.version}\nPlatform: ${
        os.platform
      }\nFolder: ${path.basename(window.cep_node.global.__dirname)}`,
    );
  };

  onMount(() => {
    if (window.cep) {
      console.log(window.cep);
      subscribeBackgroundColor((c: string) => (backgroundColor = c));
    }
  });
</script>

<div class="app" style="background-color: {backgroundColor};">
  <p>You are in settings now</p>
</div>

<style lang="scss">
  @use "../variables.scss" as *;
</style>
