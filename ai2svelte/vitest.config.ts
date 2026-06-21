import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';
import path from 'path';

export default defineConfig({
  plugins: [
    svelte({
      preprocess: sveltePreprocess({
        typescript: true,
        scss: {
          includePaths: [path.resolve(__dirname, 'src/js')],
        },
      }),
      hot: !process.env.VITEST,
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/js/__tests__/setup.ts'],
    include: ['src/js/**/*.test.ts'],
  },
  resolve: {
    // Without 'browser', Vite resolves the Svelte package to its server-side
    // entry (index-server.js), which throws on mount() calls.
    conditions: ['browser'],
    alias: [
      // Redirect all relative imports of the CEP bolt bridge to a test stub.
      // The real module creates `new CSInterface()` at load time which fails outside CEP.
      {
        find: /^(\.{1,2}\/)+lib\/utils\/bolt$/,
        replacement: path.resolve(__dirname, 'src/js/__mocks__/bolt.ts'),
      },
      {
        find: '@esTypes',
        replacement: path.resolve(__dirname, 'src'),
      },
    ],
  },
});
