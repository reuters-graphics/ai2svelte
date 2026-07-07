import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "scripts/visual-test",
  webServer: {
    command: "node scripts/visual-test/serve.mjs",
    port: 4174,
    reuseExistingServer: true,
  },
  use: {
    baseURL: "http://localhost:4174",
  },
});
