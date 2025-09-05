// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import svelte from "@astrojs/svelte";
import preprocess from "svelte-preprocess";

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
          autogenerate: { directory: "users" },
        },
        {
          label: "Contributors",
          autogenerate: { directory: "contributors" },
        },
      ],
    }),
  ],
  vite: {
    assetsInclude: ["**/*.glb"],
  },
});
