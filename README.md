# ai2svelte

An Adobe Illustrator extension that converts vector artwork into responsive [Svelte](https://svelte.dev) components. Built and maintained by [Reuters Graphics](https://www.reuters.com/graphics/).

ai2svelte lets you design graphics in Illustrator and export them as production-ready, text-selectable, responsive Svelte components — no manual re-drawing in code.

> Looking for the old scripts? They live in the [`legacy/`](./legacy) directory and are no longer actively maintained.

## Features

- **Snippet layers** — embed Svelte components directly in your Illustrator document.
- **Preset styling** — apply bundled shadows and animations to art objects.
- **Font configuration** — map Illustrator fonts to CSS `font-family`.
- **Profiles** — save and load different ai2svelte settings as reusable profiles.
- **Multiple exports** — export sequence layers with the `{start, count}` syntax in the artboard name (e.g. `myMap{1,5}`).

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

Dev setup requires Adobe Illustrator, PlayerDebugMode enabled, pnpm 9.6+, and Node 18+. See the [contributor docs](https://reuters-graphics.github.io/ai2svelte/) and [`CLAUDE.md`](./CLAUDE.md) for architecture notes (the extension spans two runtimes: a Svelte panel UI and Adobe ExtendScript).

### Visual regression testing

Before tagging a release, run `pnpm test:visual` (local-only, requires Illustrator installed and a prior `pnpm build`) to catch unintended changes to the conversion engine. It drives real Illustrator to export sample `.ai` fixtures through the actual production export path, then checks the output two ways: a Playwright pixel diff against a committed screenshot, and a Vitest structural diff against the generated `.svelte` text.

The main fixture, `example/preview-dev.ai`, deliberately packs most of ai2svelte's features into a single file — a base raster layer, a tagged PNG24 layer with a blend mode, a tagged SVG layer with nested blend-mode shapes, HTML and plain text layers, a snippet/chart layer, and multiple responsive artboards — so one fixture gives broad coverage without maintaining a pile of small ones.

Baselines are "last approved," not immutable — when a change is intentional, regenerate and accept it:

```bash
pnpm test:visual:generate            # re-run the real Illustrator export
playwright test --update-snapshots   # accept new screenshots
vitest run src/js/main/__tests__/ai2svelte-output.test.ts -u  # accept new .svelte snapshot
```

Feature branches merge into `main`. Please open an issue or PR on [GitHub](https://github.com/reuters-graphics/ai2svelte).

## License

Open source under the ISC License.
