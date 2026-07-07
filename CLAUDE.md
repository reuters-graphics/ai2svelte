# ai2svelte — CLAUDE.md

Adobe Illustrator CEP extension that converts vector graphics to Svelte components. Built by Reuters Graphics; open source.

## Repo Layout

```
/                        # Monorepo root
├── ai2svelte/           # The extension itself (CEP plugin) ← main work lives here
├── src/                 # Astro documentation site source
├── docs/                # Astro build output (published via GitHub Actions)
├── legacy/              # Old scripts, not actively maintained
└── astro.config.mjs     # Docs site config
```

## Extension Structure (`ai2svelte/`)

```
src/
├── js/main/             # Svelte 5 panel UI (runs in CEP browser context)
│   ├── main.svelte      # Root component
│   ├── stores.ts        # Reactive Svelte stores
│   ├── state.svelte.ts  # Rune-based shared state
│   ├── polyfills.ts     # CEP/Chromium 99 shims (e.g. pointer events)
│   ├── precheck/        # Startup environment checks
│   ├── Tabs/            # Tab components: Home, Settings, Styles, Inspect, Preview
│   ├── Components/      # ~22 reusable UI components
│   ├── utils/           # File I/O, styling helpers
│   └── styles/          # SCSS stylesheets
├── jsx/                 # ExtendScript (runs inside Illustrator's scripting engine)
│   ├── index.ts         # Entry point — dispatches to app modules
│   └── ilst/            # Illustrator-specific logic
│       ├── ilst.ts      # Exported functions called from the panel
│       ├── ilstUtils.ts # Shared ExtendScript helpers
│       ├── ai2svelte/   # Core SVG→Svelte conversion logic
│       ├── addSnippet.ts
│       ├── fetchSelectors.ts
│       ├── updateSettings.ts
│       ├── previewWrapper.ts
│       └── dataOperations.ts
└── shared/              # Types shared between JS and JSX
```

Key config files:
- `cep.config.ts` — extension manifest (ID `com.reuters-graphics.ai2svelte`, panel 300×550, Illustrator only)
- `vite.config.ts` — Svelte/CEP frontend build (port 3000)
- `vite.es.config.ts` — ExtendScript build via Rollup (compiles ES6 → ES3)

## Commands

All run from `ai2svelte/`:

```bash
pnpm dev        # Hot-reload dev server (requires Adobe PlayerDebugMode enabled)
pnpm build      # Full build → dist/cep/
pnpm zxp        # Package as installable .zxp
pnpm zip        # Package .zxp + assets as .zip for release
pnpm bake-shadows  # Regen shadowsBaked.json from shadows.json raw data
pnpm test       # Run the Vitest suite once
pnpm test:watch # Vitest in watch mode
pnpm test:ui    # Vitest UI

pnpm test:visual  # Visual regression test — see Visual Regression Testing below
```

Docs site (root):
```bash
pnpm dev        # Astro dev server
pnpm build      # Build static docs to /docs/
```

## Tests

Vitest (jsdom) suite under `src/js/**/__tests__/`. Config in `vitest.config.ts`;
setup in `src/js/__tests__/setup.ts`. The CEP bolt bridge (`lib/utils/bolt`) is
aliased to a stub in `src/js/__mocks__/bolt.ts` because the real module calls
`new CSInterface()` at load, which fails outside CEP. Covers stores, utils, and
UI components; ExtendScript (`src/jsx/`) is not unit-tested — verify that in
Illustrator.

### Visual Regression Testing

`pnpm test:visual` (in `ai2svelte/`) catches unintended changes to the
`ai2svelte.js` conversion engine. **Local-only** — requires Illustrator
installed and a prior `pnpm build` (needs `dist/cep/jsx/index.js`); not run in
CI, which has no licensed Illustrator.

Pipeline (`scripts/visual-test/`): drives real Illustrator via
`osascript`/`do javascript` to run the real export path (`runAi2Svelte`, the
same function `RunButton.svelte` calls) against fixture `.ai` files listed in
`fixtures.json`, bundles the generated `.svelte` output with `src/server.cjs`,
then Playwright renders it and screenshot-diffs against committed baselines
in `scripts/visual-test/__screenshots__/`. A companion Vitest snapshot test
(`src/js/main/__tests__/ai2svelte-output.test.ts`) diffs the generated
`.svelte` text itself, catching logic changes a pixel diff might miss.

Baselines are "last approved," not immutable — when a change is intentional,
regenerate and review the diff, then accept:
```bash
pnpm test:visual:generate            # re-run the real Illustrator export
playwright test --update-snapshots   # accept new screenshots
vitest run src/js/main/__tests__/ai2svelte-output.test.ts -u  # accept new .svelte snapshot
```

`harness.html` renders fixtures at a fixed 800px width, so only the artboard
whose container-query range covers that width gets screenshotted (currently
the `md` breakpoint of `preview-dev.ai`'s xs/sm/md/lg/xl set) — the other
breakpoints' CSS isn't exercised. Deliberate for now: one width keeps the
baseline count low; add a viewport per breakpoint to `visual.spec.ts` if
breakpoint-specific regressions become a real risk.

## Architecture: Two Runtimes

The extension has two distinct execution environments that must be kept in mind at all times:

**1. CEP Frontend** (`src/js/`) — Svelte 5 + TypeScript, runs in a Chromium-based browser embedded in Illustrator's panel. Standard web code.

**2. ExtendScript** (`src/jsx/`) — Adobe's proprietary scripting engine, compiled to **ES3**. No modern JS. No DOM. Uses `types-for-adobe` for Illustrator object model types. Think of it as a completely separate process.

**Bridge:** `evalTS(functionName, ...args)` from `src/js/lib/utils/bolt.ts` calls ExtendScript functions from the frontend. The call is asynchronous from the panel's perspective. All exported functions in `src/jsx/ilst/ilst.ts` are callable this way with full TypeScript type safety.

```ts
// Frontend (JS side) — calling into ExtendScript
import { evalTS } from "../lib/utils/bolt";
const result = await evalTS("ai2svelte", selectedLayers, settings);

// ExtendScript side (ilst.ts) — function must be exported here
export const ai2svelte = (layers: Layer[], settings: Settings) => { ... };
```

## Key Conventions

- **ExtendScript files must compile to ES3.** No arrow functions, spread, destructuring, template literals, `const`/`let` in places where the Rollup Babel transform can't reach. The build uses `@babel/preset-env` targeting ES3. When adding code to `src/jsx/`, test that the compiled output in `dist/` is ES3-clean.
- **Svelte 5 runes syntax** is used throughout the frontend (`$state`, `$derived`, `$effect`, `$props`). Do not use legacy Svelte 4 reactive declarations (`$:`, `export let`).
- **SCSS modules** for component styles. Global tokens in `src/js/main/styles/`.
- **Tests:** Vitest for frontend (`pnpm test`). No test coverage for ExtendScript — verify that by running the actual extension in Illustrator.
- **Branching:** feature branches → `main`. Semver releases tagged; ZXP packages attached to GitHub releases.

## ExtendScript Gotchas

- Use `$.writeln()` for debugging (output shows in Illustrator's ExtendScript Toolkit or debug console).
- File system access uses `File` and `Folder` objects (Adobe's API), not Node.js `fs`.
- Errors in ExtendScript are caught by `evalTS()` and surfaced as rejected promises in the panel.
- `dataOperations.ts` stores extension state as hidden JSON in the Illustrator document's custom data — this is how settings persist across sessions without writing files.

## Dev Setup

Requires:
- Adobe Illustrator installed
- **PlayerDebugMode** enabled (required for `pnpm dev` hot reload): set `PlayerDebugMode=1` in the Adobe CEP config
- Symlink set up: `pnpm symlink` (run once to point Illustrator at the `dist/` folder)
- pnpm 9.6+ and Node 18+

## Release Process

1. Bump version in `ai2svelte/package.json` (drives `cep.config.ts` via import)
2. Update root `CHANGELOG.md`
3. Tag release on `main` — `.github/workflows/release.yml` runs `pnpm zxp` and attaches the `.zxp` to a draft GitHub release

## Docs Site

Source in `/src/` (Astro + Starlight). GitHub Actions (`/.github/workflows/docs.yml`) auto-builds and publishes on push to `main`. To add a doc page, add a `.mdx` file under `src/content/docs/`.
