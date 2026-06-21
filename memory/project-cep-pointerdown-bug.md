---
name: cep-pointerdown-bug
description: CEP 12 (Chromium 99) drops pointerdown/pointerup events — bits-ui Select and Slider break silently
metadata:
  type: project
---

CEP 12 (Illustrator 2022, Chromium 99) dispatches `pointermove` but **never** dispatches `pointerdown` or `pointerup` for mouse button presses. Mouse events (`mousedown`, `mouseup`, `click`) fire normally. Keyboard events fire normally.

**Why:** CEP's native event bridge maps OS mouse events to Chromium's input system but omits the pointer event pair for button state changes. This is a platform-level bug in CEP 12's event forwarding, not a web standards or Chrome issue.

**Impact on bits-ui v2:**
- `Select.Trigger` — opens only on `pointerdown` (calls `preventDefault()` on it to suppress focus change). No `onclick` fallback on the trigger. **Mouse clicks completely non-functional.**
- `Slider.Root` — attaches document-level `pointerdown`/`pointerup`/`pointermove` listeners. Without `pointerdown`, `isActive` is never set and drag does nothing. **Drag completely non-functional.** (`pointermove` DOES fire, so once `isActive` is set it works.)
- `Tabs.Trigger`, `Toggle.Root`, `RadioGroup.Item` — all use `onclick`. **Unaffected.**

**Symptom pattern:** Spacebar works (keyboard `keydown` handler), mouse clicks do nothing — for Select and Slider only.

**Fix:** `ai2svelte/src/js/main/polyfills.ts` — document-level capture listener that synthesizes `PointerEvent('pointerdown')` from `mousedown` when no native `pointerdown` preceded it (flag `nativePDFired` guards against double-firing in real browsers). Same pattern for `pointerup` ← `mouseup`. Synthesized events have `isTrusted: false`; bits-ui does not check `isTrusted` so they work.

**How to apply:** Any future bits-ui component that uses `pointerdown`/`pointerup` will work automatically once the polyfill is loaded. The polyfill is already in `src/js/main/polyfills.ts`, imported first in `src/js/main/index-svelte.ts`. See [[bits-ui-migration]] for full migration details.

**Debugging method used:** Chrome DevTools Protocol (CDP) at `localhost:8860`. See [[cep-debugging]] for the full recipe.
