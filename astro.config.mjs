// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import svelte from "@astrojs/svelte";
import preprocess from "svelte-preprocess";
import starlightHeadingBadges from "starlight-heading-badges";
import starlightLlmsTxt from "starlight-llms-txt";

// https://astro.build/config
export default defineConfig({
  site: "https://reuters-graphics.github.io",
  base: "ai2svelte",
  outDir: "./docs",
  trailingSlash: "always",
  integrations: [
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
    ssr: {
      noExternal: ["@reuters-graphics/graphics-components"],
    },
    resolve: {
      noExternal: ["@reuters-graphics/graphics-components"],
    },
  },
});
