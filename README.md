# ai2svelte

An Adobe Illustrator extension that converts vector artwork into responsive [Svelte](https://svelte.dev) components. Built and maintained by [Reuters Graphics](https://www.reuters.com/graphics/).

ai2svelte lets you design graphics in Illustrator and export them as production-ready, text-selectable, responsive Svelte components — no manual re-drawing in code.

> Looking for the old scripts? They live in the [`legacy/`](./legacy) directory and are no longer actively maintained.

## Features

- **Snippet layers** — embed Svelte components directly in your Illustrator document.
- **Preset styling** — apply bundled shadows and animations to art objects.
- **Font configuration** — map Illustrator fonts to CSS `font-family`.
- **Profiles** — save and load different ai2svelte settings as reusable profiles.
- **Multiple exports** — end layer names with a number (`map1`, `map2`…) and set `project_name` with a `{start,count}` placeholder (e.g. `map{1,3}layer`). See the docs. (`output: multiple-files` is a separate option that groups artboards by name.)

## Installation

Visit the [documentation](https://reuters-graphics.github.io/ai2svelte/) for install instructions and a full user guide.

## Contributing

To work on the extension:

```bash
cd ai2svelte
pnpm install
pnpm dev        # hot-reload dev server (requires Adobe PlayerDebugMode)
pnpm build      # full build → dist/cep/
pnpm test       # run the Vitest suite
```

Dev setup requires Adobe Illustrator, PlayerDebugMode enabled, pnpm 10+, and Node 20.19+. See the [contributor docs](https://reuters-graphics.github.io/ai2svelte/) and [`CLAUDE.md`](./CLAUDE.md) for architecture notes (the extension spans two runtimes: a Svelte panel UI and Adobe ExtendScript).

### Tests

Run from `ai2svelte/`. The first two work anywhere; the rest drive real Illustrator (macOS, local-only, run `pnpm build` first).

| Command | What it checks | When to run |
|---|---|---|
| `pnpm test` | Vitest (jsdom): stores, utils, UI components, precheck. ExtendScript isn't covered. | Every change |
| `pnpm check` | Type-checks the panel (`check:frontend`) and ExtendScript (`check:jsx`). | Every change |
| `pnpm test:visual` | Exports `.ai` fixtures through real Illustrator, then diffs screenshots (Playwright) and the generated `.svelte` (Vitest snapshot). | After touching `ai2svelte.js` or the export path; before a release |
| `pnpm test:persistence` | Styles/settings saved by an export survive closing and reopening the document (XMP). Quits/relaunches Illustrator; needs no open documents. | After touching `dataOperations.ts` or saving; before a release |
| `pnpm replay "<debug-folder>"` | Not a test: replays a user's debug report in Illustrator to reproduce a bug. | When triaging a bug report |

Helpers: `pnpm test:visual:build-fixtures [presets\|layers]` rebuilds the scripted fixtures, and `pnpm test:visual:preview` serves them in a browser.

#### Visual regression details

Before tagging a release, run `pnpm test:visual` (local-only, requires Illustrator installed and a prior `pnpm build`) to catch unintended changes to the conversion engine. It drives real Illustrator to export sample `.ai` fixtures through the actual production export path, then checks the output two ways: a Playwright pixel diff against a committed screenshot, and a Vitest structural diff against the generated `.svelte` text.

The main fixture, `example/preview-dev.ai`, deliberately packs most of ai2svelte's features into a single file — a base raster layer, a tagged PNG24 layer with a blend mode, a tagged SVG layer with nested blend-mode shapes, HTML and plain text layers, a snippet/chart layer, and multiple responsive artboards — so one fixture gives broad coverage without maintaining a pile of small ones.

Baselines are "last approved," not immutable — when a change is intentional, regenerate and accept it:

```bash
pnpm test:visual:generate            # re-run the real Illustrator export
pnpm exec playwright test --update-snapshots   # accept new screenshots
pnpm exec vitest run src/js/main/__tests__/ai2svelte-output.test.ts -u  # accept new .svelte snapshot
```

Feature branches merge into `main`. Please open an issue or PR on [GitHub](https://github.com/reuters-graphics/ai2svelte).

## License

Open source under the ISC License.
