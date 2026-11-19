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
pnpm lint       # ESLint over src/
pnpm format     # Prettier --write over src/ (format:check to verify only)

pnpm test:visual  # Visual regression test — see Visual Regression Testing below
pnpm test:persistence  # Styles/settings survive close+reopen — see Persistence Testing below
pnpm test:text   # Text tab scan/replace against real Illustrator (local-only, needs pnpm build)
```

Docs site (root):
```bash
pnpm dev        # Astro dev server
pnpm build      # Build static docs to /docs/
pnpm lint       # ESLint over the docs site (skips ai2svelte/, legacy/, docs/)
pnpm format     # Prettier --write (format:check to verify only)
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

A fixture with a `files` list is a multiple export (`multi-export.ai`: layers
`step1`/`label1`, `step2:svg`, `step3` plus shared `base`, exported with
`project_name: "multi{1,3}step"`). The test asserts exactly those `.svelte`
files were written and screenshots/snapshots each one (`bundle-<component>.js`).

Feature fixtures (`presets.ai`, `layers.ai`) are scripted, not hand-drawn:
`pnpm test:visual:build-fixtures [presets|layers]` rebuilds them in
Illustrator (and `scripts/visual-test/styles/presets.scss`). Rebuild after the
shadow/animation library changes. A fixture's `cssPath` is user SCSS as typed in
the Styles tab; `generate.mjs` prepends the real mixins (`generateAllMixins`).
- `presets`: all 29 shadows, all 21 animations (frozen at 400ms via
  `freezeAnimations`), custom SCSS, a style missing from the library.
- `layers`: `:div`/`:symbol`/`:png`/`:svg`/`:snippet` layers, notes → `data-*`
  (`expect.present`/`absent` in `fixtures.json`), a `fixed` artboard tag, a mapped
  font, `priority_fetch`. `layers-settings` re-exports it with other settings.
- `layers.ai`'s `narrow:image_only` artboard and `layers-settings`'
  `render_text_as: "image"` cover the image-only text path (it threw before the
  `textData.html` fix). The artboards run wide → narrow: an early build once
  dropped the wide artboard's `:div`/`:symbol`/text HTML with that order, and it
  never reproduced (14 clean rebuilds), so keeping it guards the symptom. If
  `layers` suddenly loses that HTML, run `pnpm build` first (stale `dist`).
- Not covered: `:webp` (converted by the panel), `fit_mode`/`max_width` (need a
  container height), `responsiveness: fixed`.

`pnpm replay "<debug report folder>" --to-fixture <name>` turns a user's report
into a fixture: it copies the snapshot `.ai` into `src/js/main/example/`, the
logged CSS into `scripts/visual-test/styles/`, and appends the logged settings
to `fixtures.json` (after a typed `y`; it doesn't run Illustrator, so run
`pnpm test:visual:generate <name>` next). Only with the document owner's consent:
never commit client artwork.

Baselines are "last approved," not immutable — when a change is intentional,
regenerate and review the diff, then accept:
```bash
pnpm test:visual:generate            # re-run the real Illustrator export
pnpm exec playwright test --update-snapshots   # accept new screenshots
pnpm exec vitest run src/js/main/__tests__/ai2svelte-output.test.ts -u  # accept new .svelte snapshot
```

`harness.html` renders fixtures at a fixed 800px width, so only the artboard
whose container-query range covers that width gets screenshotted (currently
the `md` breakpoint of `preview-dev.ai`'s xs/sm/md/lg/xl set) — the other
breakpoints' CSS isn't exercised. Deliberate for now: one width keeps the
baseline count low; add a viewport per breakpoint to `visual.spec.ts` if
breakpoint-specific regressions become a real risk.

### Persistence Testing

`pnpm test:persistence` (in `ai2svelte/`) checks that styles (shadow,
animation, custom CSS) and settings saved by an export survive closing and
reopening the document. **Local-only**, needs Illustrator and a prior
`pnpm build`; refuses to run if any document is open, and quits/relaunches
Illustrator for its quit cases (`--skip-quit` to skip; pass a substring to run
matching cases only, e.g. `pnpm test:persistence SAVECHANGES`).

`scripts/persistence-test.mjs` builds temp `.ai` files, replays the panel's
export flow (`saveAndSnapshotDocument`, `runAi2Svelte`, `setVariable` ×4),
then crosses 13 close mechanisms (plain/save/menu/AppleScript closes, edit +
Cmd+S, Save As…) with 3 open mechanisms, plus a stale-revert case and quit +
relaunch. Guards the bug where `setVariable` wrote XMP to disk only and the
next Illustrator save wrote the open-time XMP back over it (fixed in
`dataOperations.ts` by mirroring into `doc.XMPString`).

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

## Time limit

ExtendScript is single-threaded and can't be interrupted from the panel, so
`ai2svelte.js` polls `checkAbort()` at every progress update (artboard, layer,
tile) and stops with a `UserError` after 10 minutes (`timeoutSeconds` overrides
it). `convertArtItems`, `forEachImageLayer`, `exportSVG` and
`copyArtboardForImageExport` clean up in `finally`/`catch`, so an abort or error
leaves no hidden layers, temp layer or temp document. A hang *inside* one
Illustrator call (e.g. a modal dialog during `app.executeMenuCommand`) can't be
caught: the panel's watchdog (`utils/exportControl.ts`, 15 minutes) frees the UI.

There is deliberately no Cancel button. While a script runs, Illustrator's main
thread is busy, so neither the ScriptUI progress window nor the CEP panel can
take focus or clicks. (A flag-file cancel was built and removed for that reason.)

While `main()` runs, the engine sets Illustrator's alert level to
`DONTDISPLAYALERTS` (restored before the completion alert, aborted runs
included), so an Illustrator modal dialog (e.g. a Save prompt for a temp doc)
surfaces as an error ("the operation was cancelled") instead of blocking the
script. Test scripts that drive Illustrator should not set the level themselves:
it lasts for the whole Illustrator session.

An output folder that doesn't exist and can't be created stops the export with
an error (`ensureFolder`). It used to only warn, and exporting an SVG into a
missing folder makes Illustrator open a native Save As dialog, which no alert
level suppresses and which blocks the script indefinitely. `Folder.create()` fails
for paths through a symlink, e.g. a document in `/tmp` (use `/private/tmp` in
scratch scripts).

## Removed Settings

Keep this list current when a setting is dropped or renamed, so stale keys in old docs/profiles are recognisable. Strip removed keys from saved profiles in `src/js/main/precheck/precheck.js` (versioned `.flags.json` migrations). Settings saved in a document's XMP are not migrated: the engine warns "unused parameter" for unknown keys, so add no-op removals to `REMOVED_SETTINGS` in `ai2svelte.js` (`renameLegacySettings`) to drop them silently. Leave a key out of that list (e.g. `respect_height`) when the warning is useful because the user should switch to the replacement.

`use_lazy_loader` was removed and then revived in 1.0.10 with real lazy loading. Before 1.0.10 it did nothing but defaulted to `true`, so values saved by older versions are dropped: from profiles by the 1.0.10 precheck migration and from document XMP by `dropStaleSettings` in `utils.ts` (keyed on the saved `version`). The engine has no version info, so it never strips the key itself: its "text-block settings" are the panel's settings.

| Setting | Version | Why / replacement |
|---|---|---|
| `jpg_quality` | 1.0.10 | Renamed `image_quality` (also drives WebP); old name still read by the engine |
| `html_output_extension` | 1.0.9 | `.svelte` is the only output |
| `respect_height` | 1.0.5 | Replaced by `fit_mode` (`width` / `height` / `cover`) |

## Dormant: Preview

The Preview tab (in-panel render of the exported component) was removed from the UI in v1.0.4 but kept on purpose for a likely CEP → UXP migration — don't delete it. Pieces: `src/js/main/Tabs/Preview/` (not imported anywhere, so not bundled), `Components/PreviewFrame.svelte`, `src/jsx/ilst/previewWrapper.ts`, the commented-out `runPreview` + `wrapper` import in `src/jsx/ilst/ilst.ts`. The only trace in the jsx is the commented-out `runPreview` (and its `isPreview` line) in `ilst.ts`. To revive: uncomment in `ilst.ts`, import `Preview.svelte` into the tab bar. Caveats: the Preview's `startServer.js` spawns the system `node`, and CEP's Chromium 99 can't render container queries, so a revived preview can't show the real responsive output.

## Dev Setup

Requires:
- Adobe Illustrator installed
- **PlayerDebugMode** enabled (required for `pnpm dev` hot reload): set `PlayerDebugMode=1` in the Adobe CEP config
- Symlink set up: `pnpm symlink` (run once to point Illustrator at the `dist/` folder)
- pnpm 10+ and Node 20.19+

## Release Process

1. Bump version in `ai2svelte/package.json` (drives `cep.config.ts` via import)
2. Add release notes to `src/content/docs/users/01-whats-new.mdx` (no CHANGELOG — `ai2svelte/CHANGELOG.md` is the Bolt CEP template's)
3. On macOS with Illustrator: `pnpm build && pnpm test:visual && pnpm test:persistence` — all must pass
4. Tag release on `main` — `.github/workflows/release.yml` drafts a GitHub release for the tag (no build; see below)
5. Run `pnpm zxp` **on macOS** to build the signed `.zxp`, then attach it to the draft release (`gh release upload <tag> dist/zxp/*.zxp` or via the GitHub UI)

`pnpm zxp`/`pnpm zip` both shell out to Adobe's `ZXPSignCmd` (bundled in `vite-cep-plugin`), which only ships macOS and Windows binaries — it cannot run on `ubuntu-latest`, so the release workflow no longer builds or signs the package itself.

## Docs Site

Source in `/src/` (Astro + Starlight). GitHub Actions (`/.github/workflows/docs.yml`) auto-builds and publishes on push to `main`. To add a doc page, add a `.mdx` file under `src/content/docs/`.
