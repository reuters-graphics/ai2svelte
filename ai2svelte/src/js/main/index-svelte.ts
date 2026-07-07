// Polyfills must load before any bits-ui code to patch Array.prototype.at
// and other APIs missing in CEP's embedded Chromium (Chrome 73–88).
import "./polyfills";

import App from "./main.svelte";
import { initBolt } from "../lib/utils/bolt";
import { mount } from "svelte";

initBolt();

mount(App, {
  target: document.getElementById("app")!,
});
