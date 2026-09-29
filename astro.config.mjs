// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import svelte from "@astrojs/svelte";
import preprocess from "svelte-preprocess";
import starlightHeadingBadges from "starlight-heading-badges";
import starlightLlmsTxt from "starlight-llms-txt";
import exampleExportPaths from "./scripts/example-export-paths.mjs";

// https://astro.build/config
export default defineConfig({
  site: "https://reuters-graphics.github.io",
  base: "ai2svelte",
  outDir: "./docs",
  trailingSlash: "always",
  integrations: [
    exampleExportPaths(),
    svelte({
      preprocess: preprocess(),
    }),
    starlight({
      title: "ai2svelte",
      logo: {
        light: "./src/assets/logo-light.svg",
        dark: "./src/assets/logo-dark.svg",
        replacesTitle: true,
      },
      favicon:
        "https://graphics.thomsonreuters.com/style-assets/images/logos/favicon/favicon.ico",
      head: [
        {
          tag: "link",
          attrs: {
            rel: "icon",
            href: "https://graphics.thomsonreuters.com/style-assets/images/logos/favicon/favicon.ico",
            sizes: "32x32",
          },
        },
      ],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/reuters-graphics/ai2svelte/",
        },
      ],
      customCss: [
        // Relative path to your custom CSS file
        "./src/styles/custom.css",
      ],
      sidebar: [
        {
          label: "Users",
          items: [{ autogenerate: { directory: "users" } }],
        },
        {
          label: "Contributors",
          items: [{ autogenerate: { directory: "contributors" } }],
        },
      ],
      plugins: [
        starlightHeadingBadges(),
        starlightLlmsTxt({
          projectName: "ai2svelte",
        }),
      ],
    }),
  ],
  vite: {
    assetsInclude: ["**/*.glb"],
    // model-viewer is imported dynamically in component3, so Vite only
    // discovers it on first use and re-optimizes mid-session (504 Outdated
    // Optimize Dep). Pre-bundling it at startup avoids that.
    optimizeDeps: {
      include: ["@google/model-viewer"],
      // graphics-components' TileMap imports a maplibre-gl worker with a
      // ?worker&url query, which the dep optimizer can't resolve. It crashes
      // the optimizer outright, which hangs every module request in dev. The
      // package is already noExternal below, so skipping the pre-bundle is
      // consistent, and nothing here imports TileMap.
      exclude: ["@reuters-graphics/graphics-components"],
    },
    ssr: {
      noExternal: ["@reuters-graphics/graphics-components"],
    },
    resolve: {
      noExternal: ["@reuters-graphics/graphics-components"],
    },
  },
});
