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

Feature branches merge into `main`. Please open an issue or PR on [GitHub](https://github.com/reuters-graphics/ai2svelte).

## License

Open source under the ISC License.
