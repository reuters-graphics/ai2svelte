// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import svelte from "@astrojs/svelte";

// https://astro.build/config
export default defineConfig({
  site: "https://reuters-graphics.github.io",
  base: "/ai2svelte",
  outDir: "./docs",
  integrations: [
    svelte(),
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
      sidebar: [
        {
          label: "Users",
          items: [
            "users/intro",
            "users/whats-new",
            "users/ai2svelte-settings",
            "users/styles",
            "users/auto-detect",
            "users/tagged-layers",
            "users/snippets",
            "users/font-config",
            "users/examples",
          ],
        },
        {
          label: "Contributors",
          items: ["contributors/intro"],
        },
      ],
      customCss: [
        // Relative path to your custom CSS file
        "./src/styles/custom.css",
      ],
    }),
  ],
});
