// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'ai2svelte',
			logo: {
				light: './src/assets/logo-light.svg',
				dark: './src/assets/logo-dark.svg',
				replacesTitle: true,
			},
			favicon:
				'https://graphics.thomsonreuters.com/style-assets/images/logos/favicon/favicon.ico',
			head: [
				{
				tag: 'link',
				attrs: {
					rel: 'icon',
					href: 'https://graphics.thomsonreuters.com/style-assets/images/logos/favicon/favicon.ico',
					sizes: '32x32',
				},
				},
			],
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/reuters-graphics/ai2svelte/' }],
		}),
	],
});
