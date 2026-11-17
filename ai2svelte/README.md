# ai2svelte (extension)

The Adobe Illustrator CEP extension that converts artboards to Svelte components. Built by Reuters Graphics.

## Prerequisites

- Node 20.19+ and pnpm 10+
- Adobe Illustrator
- `PlayerDebugMode=1` set in the Adobe CEP config (needed for `pnpm dev` hot reload)
- `pnpm symlink` run once, to point Illustrator at `dist/`

## Commands

Run from this folder.

| Command | Does |
|---|---|
| `pnpm dev` | Hot-reload dev server |
| `pnpm build` | Full build → `dist/cep/` |
| `pnpm zxp` | Package as an installable `.zxp` (macOS) |
| `pnpm test` | Run the Vitest suite once |
| `pnpm lint` | ESLint over `src/` |
| `pnpm format` | Prettier `--write` over `src/` |
| `pnpm check` | Type-check the panel and the ExtendScript |
| `pnpm test:visual` | Visual regression test (local, needs Illustrator) |
| `pnpm test:persistence` | Styles/settings survive close+reopen (local, needs Illustrator) |

See [`../CLAUDE.md`](../CLAUDE.md) for architecture, conventions and the release process, and the [documentation](https://reuters-graphics.github.io/ai2svelte/) for the user guide.

Based on [Bolt CEP](https://hyperbrew.co/resources/bolt-cep).
