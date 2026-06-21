---
name: bits-ui-migration
description: bits-ui v2 migration status — 5 components migrated on branch feat/bits-ui, CEP polyfill required
metadata:
  type: project
---

Branch `feat/bits-ui` (off `fix/code-audit`) migrates 5 panel UI components to bits-ui v2 for accessibility and keyboard navigation.

**Completed migrations:**
| Component | bits-ui primitive | Event handling | CEP-safe? |
|---|---|---|---|
| `Dropdown.svelte` | `Select.Root` | `onpointerdown` on trigger | Yes, via polyfill |
| `Selector.svelte` | `RadioGroup.Root` | `onclick` on items | Yes, native |
| `InputRange.svelte` | `Slider.Root` | document `pointerdown`/`pointermove`/`pointerup` | Yes, via polyfill |
| `TabBar.svelte` | `Tabs.Root` | `onclick` on triggers | Yes, native |
| `ThemeSwitcher.svelte` | `Toggle.Root` | `onclick` | Yes, native |

**Key implementation details:**
- Child snippet pattern (`{#snippet child({ props })}`) is required on ALL bits-ui elements that need Svelte `use:action` directives (tooltip, etc.) — without it Svelte's scoped CSS also won't target the element.
- `Slider.Root` child snippet needed to wrap a `<div class="range">` so scoped CSS works; `Slider.Thumb` sits INSIDE the snippet as an invisible keyboard-focusable element.
- `Select.Content` uses Floating UI for positioning; the dropdown may be portaled to `document.body`. Chaser animation uses `getBoundingClientRect` (viewport-relative offsets) which works regardless of portaling.
- `dragging = $bindable(false)` on `InputRange` is exposed so `Input.svelte` can hide the label while the slider is being dragged.
- `data-state="active"` (bits-ui standard) replaces hand-rolled `data-active` comparisons on tab buttons.

**Critical polyfill in `src/js/main/polyfills.ts`:**
- `Array.prototype.at` (Chrome 92+) — bits-ui keyboard nav uses it
- `pointerdown`/`pointerup` synthesis from `mousedown`/`mouseup` — CEP 12 drops these (see [[cep-pointerdown-bug]])

**How to apply:** When adding more bits-ui components that use floating content (Popover, Combobox, Tooltip, etc.) or interact via `pointerdown`, the polyfill already covers them. No extra work needed.
