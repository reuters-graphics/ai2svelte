// eslint.config.js
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';
// import svelteConfig from './svelte.config.js';

export default ts.config(
  {
    ignores: [
      'src/js/lib/cep/', // vendored Adobe CEP libs
      'src/js/public/webp/', // vendored wasm encoder
      'src/jsx/lib/json2.js', // vendored JSON polyfill
      'src/public/BoltHostAdapter.js', // vendored Bolt adapter
      'src/js/main/example/', // ai2svelte export output (visual-test fixtures)
      'src/js/main/src/', // ai2svelte export output
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      },
      ecmaVersion: 2022,
      sourceType: "module"
    }
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    // See more details at: https://typescript-eslint.io/packages/parser/
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: ['.svelte'], // Add support for additional file extensions, such as .svelte
        parser: ts.parser,
        // Specify a parser for each language, if needed:
        // parser: {
        //   ts: ts.parser,
        //   js: espree,    // Use espree for .js files (add: import espree from 'espree')
        //   typescript: ts.parser
        // },

        // We recommend importing and specifying svelte.config.js.
        // By doing so, some rules in eslint-plugin-svelte will automatically read the configuration and adjust their behavior accordingly.
        // While certain Svelte settings may be statically loaded from svelte.config.js even if you don’t specify it,
        // explicitly specifying it ensures better compatibility and functionality.
        // svelteConfig
      }
    }
  },
  {
    // tsc already reports undefined names, with the real Illustrator types
    // (typescript-eslint recommends this)
    files: ['**/*.ts', '**/*.svelte'],
    rules: { 'no-undef': 'off' },
  },
  {
    // ExtendScript engine (plain JS): Illustrator's globals, not the browser's
    // (so e.g. an undeclared `top` is caught instead of matching window.top)
    files: ['src/jsx/**/*.js', 'src/jsx/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "LogicalExpression[operator='||'] > LogicalExpression[operator='&&']",
          message:
            'ExtendScript misevaluates a || b && c (Babel strips parens): use plain ifs',
        },
      ],
    },
    languageOptions: {
      globals: Object.fromEntries(
        [
          'app', '$', 'File', 'Folder', 'module',
          'BlendModes', 'DocumentColorSpace', 'ElementPlacement', 'ExportType',
          'ExportOptionsJPEG', 'ExportOptionsPNG24', 'ExportOptionsPNG8',
          'ExportOptionsSVG', 'FontBaselineOption', 'IllustratorSaveOptions',
          'PointType', 'SaveOptions', 'SVGCSSPropertyLocation',
          'SVGDocumentEncoding', 'SVGDTDVersion', 'SVGFontSubsetting', 'TextType',
          'UserInteractionLevel',
        ].map((name) => [name, 'readonly']),
      ),
    },
  },
  {
    files: ['**/*.cjs'], // CommonJS (node globals are already on)
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        // ES3 (ExtendScript) has no optional catch binding, so `catch (e)` stays
        { caughtErrors: 'none', argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-nocheck': 'allow-with-description' },
      ],
    },
  }
);