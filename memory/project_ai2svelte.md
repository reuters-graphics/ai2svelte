---
name: project-ai2svelte
description: Core facts about the ai2svelte project — purpose, stack, architecture, dev setup
metadata:
  type: project
---

ai2svelte is an Adobe Illustrator CEP extension (panel plugin) built by Reuters Graphics that converts vector graphics into Svelte components. It is open source and used by both the internal Reuters Graphics team and external developers.

**Why:** Design-to-code workflow for graphics journalists who build SVG-heavy Svelte components.

**How to apply:** All tasks are in service of this workflow. Feature work usually touches either the Svelte panel UI or the ExtendScript Illustrator scripting layer (or both via the evalTS bridge).

## Stack

- **Frontend (CEP panel):** Svelte 5 (runes syntax), TypeScript, Vite 6, SCSS, CodeMirror 6
- **ExtendScript:** Adobe proprietary scripting engine, compiled ES6→ES3 via Babel/Rollup
- **Bridge:** `evalTS()` in `src/js/lib/utils/bolt.ts` calls ExtendScript functions type-safely
- **Docs site:** Astro 6 + Starlight (separate from the extension)
- **Package manager:** pnpm 9.6+, Node 18+
- **Current version:** 1.0.7

## Key Paths

- Extension source: `ai2svelte/src/`
- Svelte UI entry: `ai2svelte/src/js/main/main.svelte`
- ExtendScript entry: `ai2svelte/src/jsx/index.ts`
- Exported ExtendScript functions (callable from panel): `ai2svelte/src/jsx/ilst/ilst.ts`
- Extension manifest: `ai2svelte/cep.config.ts`

## Dev Setup Requirements

- Adobe Illustrator installed locally (user has this)
- PlayerDebugMode=1 enabled in CEP config
- `pnpm symlink` run once to set up the extension symlink
- `pnpm dev` for hot-reload development

## Release Flow

1. Bump version in `ai2svelte/package.json`
2. Update `CHANGELOG.md`
3. `pnpm zip` → produces `.zip` in `dist/`
4. Tag on `main`, attach to GitHub release

Branches: feature branches → `main`, semver tagging.
