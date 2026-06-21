# ai2svelte — UI Revamp Task Plan

Scope: `ai2svelte/src/` only. Do not modify Bolt CEP files (`src/js/lib/`, `cep.config.ts`, `vite.config.ts`, `vite.es.config.ts`).

---

## Task 1 — Audit & Code Improvement

### Goal

Improve the maintainability, correctness, and robustness of the existing codebase before any UI changes land. All fixes must be in `ai2svelte/src/js/`.

---

### 1.1 — Type Safety

**Issues found:**
- `stores.ts` uses `Record<string, any>` for settings objects (lines 7, 9, 51).
- `Settings.svelte` casts file input as `(e as any).files[0]`.
- `Styles.svelte` has `(e: any)` event handler parameters and bare `@ts-ignore` on lines 17, 26 with no explanation.
- `Preview.svelte` uses `Record<string, any>` in its comparison function.
- `Tabs/types.ts` defines `UserProfile = Record<string, unknown>` — inconsistent with stores.

**Work items:**
- [ ] Define strict TypeScript interfaces for `Settings`, `UserProfile`, `StylesConfig`, and `AnimationEntry` in `Tabs/types.ts`.
- [ ] Replace all `Record<string, any>` usages with these interfaces.
- [ ] Replace `(e as any)` casts with properly typed event handlers (`Event`, `InputEvent`, `MouseEvent`).
- [ ] Replace each bare `@ts-ignore` with a `// @ts-ignore: <reason>` comment explaining why suppression is needed. Remove any that can be fixed instead.

**Acceptance criteria:**
- `pnpm build` completes with zero new TypeScript errors.
- No untyped `any` remains in files under `src/js/main/` except where third-party types are genuinely absent and a comment explains it.

---

### 1.2 — Duplicate & Dead Code

**Issues found:**
- `constrain()` is defined in both `utils/utils.ts` (exported) and `Components/utils.ts` (not exported, local only).
- `toggleShadowCard()` in `Tabs/Styles/utils.ts` is defined but never called — `Shadows.svelte` and `Animations.svelte` have their own local implementations.

**Work items:**
- [ ] Delete the duplicate `constrain()` from `Components/utils.ts`. Update any local callers to import from `utils/utils.ts`.
- [ ] Remove the dead `toggleShadowCard()` from `Tabs/Styles/utils.ts`. If the intent was a shared helper, document this and implement it properly, or remove it.

**Acceptance criteria:**
- `constrain()` has exactly one definition in the codebase.
- `Tabs/Styles/utils.ts` contains no unused exports. Verify with a grep for `toggleShadowCard`.

---

### 1.3 — Error Handling

**Issues found:**
- `RunButton.svelte` (lines 42–45): try/catch only logs errors. The user receives no feedback if `ai2svelte` fails mid-run.
- `Settings.svelte` (lines 133–141): file upload errors are logged but the input is not reset and no user-facing message is shown.
- `Preview.svelte` (lines 70–90): retries up to 10× at 300ms intervals (3 second hang) with no loading state and no user-facing error if all attempts fail.
- Multiple `evalTS()` calls across tabs have no `.catch()`.

**Work items:**
- [ ] `RunButton.svelte`: on catch, surface the error using the existing `Toast` or `Alert` component. Do not swallow it.
- [ ] `Settings.svelte`: on file read failure, reset the `<input type="file">` element and show an `Alert`.
- [ ] `Preview.svelte`: show a loading indicator during the retry loop. After all retries are exhausted, show a user-facing error message instead of silently failing.
- [ ] Add `.catch()` to all `evalTS()` calls that currently have none. Each catch should at minimum show a `Toast` with the error message.

**Acceptance criteria:**
- Every `evalTS()` call in `src/js/main/Tabs/` has an error handler.
- A failed run in `RunButton` triggers a visible `Toast` or `Alert`.
- `Preview.svelte` does not hang silently — a user will see either a loading state or an error.

---

### 1.4 — Performance Bottlenecks

**Issues found:**
- `Preview.svelte` (lines 97–101): uses `structuredClone` + `JSON.stringify` with sorted keys for deep equality — extremely expensive, called on every preview update.
- `Tabs/Styles/utils.ts` (line 82): PostCSS re-parses the full stylesheet on every keystroke in the code editor with no debounce.
- `stores.ts` (lines 60–68): the `cache` derived store calls `Object.keys()` + `get()` on every `settingsObject`/`styles` change with no debounce before writing to disk.

**Work items:**
- [ ] `Preview.svelte`: replace the `structuredClone` + `JSON.stringify` deep-equal with a lightweight comparison (e.g. compare only the fields that drive a re-render, or use a simple JSON.stringify without the clone).
- [ ] `Tabs/Styles/utils.ts`: wrap the PostCSS parse call in a debounce (200–300ms). Import a small debounce utility from `utils/utils.ts` or add one there.
- [ ] `stores.ts`: debounce the `writeFile` call inside the cache derived store (300ms). The store can update reactively, but disk writes should not fire on every keystroke.

**Acceptance criteria:**
- Typing in the Styles code editor does not trigger more than one parse per 300ms burst.
- Disk writes from the cache store are debounced — verified by adding a temporary `console.log` during dev.
- Preview comparison does not call `structuredClone`.

---

### 1.5 — Resource Cleanup

**Issues found:**
- `stylesState.svelte.ts` (line 25): `styles.subscribe()` stores no unsubscribe function — the subscription leaks if the component is ever torn down.
- `Tabs/Styles/Styles.svelte`: `addSelectionChangeEventListener()` is called on mount but has no corresponding cleanup.
- `main.svelte` (line 195): window `keydown` listener is cleaned up in `onMount`'s return, but this pattern is fragile when combined with the document-switching logic above it.

**Work items:**
- [ ] `stylesState.svelte.ts`: store the return value of `styles.subscribe()` and call it in `onDestroy` (or use a `$effect` with a cleanup return).
- [ ] `Styles.svelte`: ensure `addSelectionChangeEventListener` is accompanied by a matching removal on destroy.
- [ ] `main.svelte`: audit all `addEventListener` calls and confirm each has a matching `removeEventListener` in the appropriate cleanup path.

**Acceptance criteria:**
- No `subscribe()` call in `src/js/main/` is missing its unsubscribe.
- All `addEventListener` calls have a corresponding `removeEventListener`.

---

### 1.6 — State Management Consolidation

**Issues found:**
- Two parallel state systems exist: legacy Svelte stores (`stores.ts`) and Svelte 5 runes (`state.svelte.ts`, `stylesState.svelte.ts`). New code added to stores occasionally re-reads from rune-based state and vice versa, creating implicit coupling.
- `state.svelte.ts` is only 9 lines and its purpose is unclear relative to `stores.ts`.

**Work items:**
- [ ] Add a comment block at the top of both `stores.ts` and `state.svelte.ts` documenting what each owns and why both exist. This is the minimum — the goal is clarity, not a full migration.
- [ ] Identify any cross-reads (a store reading from rune state or vice versa) and document them with a comment explaining the dependency direction.
- [ ] If `state.svelte.ts` is only a stepping stone, open a follow-up issue or add a `// TODO: migrate stores.ts to runes` comment with a short rationale.

**Acceptance criteria:**
- A developer new to the codebase can read the comment headers and understand which system to use for new code.
- No silent cross-dependencies between the two systems remain undocumented.

---

### 1.7 — Production Logging

**Issues found:**
- 20+ `console.log` calls with development content (emoji, raw objects, partial data) remain in production code across multiple files.

**Work items:**
- [ ] Remove all `console.log` calls that are debugging artifacts.
- [ ] Any logging that is intentional (e.g. reporting CEP bridge errors) should use `console.warn` or `console.error` with a consistent prefix like `[ai2svelte]`.

**Acceptance criteria:**
- `grep -r "console\.log" src/js/main/` returns zero results, or every remaining result has a comment explaining why it is intentional.

---

## Task 2 — bits-ui Adoption

### Goal

Replace the interactive state-management and accessibility layer of specific components with [bits-ui](https://www.bits-ui.com) primitives. Visual appearance, SCSS, and animations must stay the same. Only accessibility behaviour and internal state management change.

Do not replace components that have no applicable bits-ui primitive. Do not introduce Tailwind CSS.

---

### 2.0 — Setup

- [ ] Install `bits-ui` as a dependency: `pnpm add bits-ui` (inside `ai2svelte/`).
- [ ] Verify the installed version supports Svelte 5 runes (bits-ui v2+).
- [ ] Confirm `pnpm build` still passes after install.

**Acceptance criteria:**
- `bits-ui` appears in `ai2svelte/package.json` dependencies.
- No existing component is broken by the install.

---

### 2.1 — Dropdown → `bits-ui Select`

**File:** `Components/Dropdown.svelte`

**Current problems:**
- Outside-click dismiss is implemented with a manual `window.addEventListener` / `removeEventListener` pair — fragile and easy to leak.
- No keyboard navigation (arrow keys, Enter, Escape).
- No `aria-expanded`, `aria-haspopup`, or `role="listbox"` on the trigger or menu.

**What changes:**
- Replace the open/close state machine and outside-click handling with `Select.Root`, `Select.Trigger`, `Select.Content`, and `Select.Item` from bits-ui.
- Keep the existing chaser `<li>` highlight animation — it is purely CSS/Svelte transition and can live inside `Select.Content`'s slot markup.
- Keep the `fly`/`slide` Svelte transitions on the menu by applying them to the element rendered inside `Select.Content`.
- Keep all existing SCSS classes unchanged.

**Acceptance criteria:**
- Dropdown opens and closes with mouse click (same as before).
- Pressing `Escape` closes the menu.
- Arrow keys navigate options; `Enter` selects.
- Clicking outside closes the menu without a leaked window listener.
- `aria-expanded` is present on the trigger button.
- Visual appearance and animation are unchanged.
- The manual `window.addEventListener("click", closeMenu)` pattern is gone.

---

### 2.2 — Selector → `bits-ui RadioGroup`

**File:** `Components/Selector.svelte`

**Current problems:**
- Uses `<button>` elements with `aria-pressed` to simulate a radio group — not semantically correct.
- No roving tabindex; tabbing cycles through every button individually.
- The hidden `<input type="radio">` inside each button exists to paper over the semantic gap.

**What changes:**
- Replace with `RadioGroup.Root` and `RadioGroup.Item` from bits-ui.
- Remove the hidden `<input type="radio">` — bits-ui handles the role and keyboard behaviour.
- Keep `svooltip` on each item — it is a Svelte action and composes without conflict.
- Keep all SCSS classes and the `data-checked` attribute (bits-ui sets `data-state="checked"` — map this in CSS or add a `data-checked` attribute via a snippet).
- Keep the `$bindable()` two-way binding on `value`.

**Acceptance criteria:**
- Arrow keys navigate between options within the group; Tab moves focus out of the group entirely (roving tabindex).
- The hidden `<input type="radio">` is removed.
- `role="radiogroup"` and `role="radio"` are present in the rendered HTML.
- Tooltips still appear on hover.
- Visual appearance is unchanged.

---

### 2.3 — InputRange → `bits-ui Slider`

**File:** `Components/InputRange.svelte`

**Current problems:**
- Custom mouse event handling (`mousedown`, `mousemove`, `mouseup` on `document`) with no keyboard support.
- `aria-valuemin` and `aria-valuemax` are hardcoded to 0 and 100 regardless of the `start`/`end` props.
- No keyboard increment/decrement.

**What changes:**
- Replace the drag logic with `Slider.Root` and `Slider.Range`/`Slider.Thumb` from bits-ui. bits-ui manages the drag, keyboard, and ARIA values.
- Keep the Svelte `Spring` animation on the fill bar — read `Slider.Root`'s current value in a `$derived` and feed it into the Spring.
- Keep the floating value label (`range-value` `<p>`) — render it alongside the bits-ui thumb.
- Keep all SCSS classes.
- Wire `start`, `end`, and `stepper` props to bits-ui's `min`, `max`, and `step` attributes.

**Acceptance criteria:**
- Arrow keys increment/decrement the value by `stepper`.
- `aria-valuemin`/`aria-valuemax`/`aria-valuenow` reflect the actual `start`/`end`/`value` props.
- Mouse drag still works.
- The Spring fill animation is intact.
- The manual `document.addEventListener("mouseup")` / `document.addEventListener("mousemove")` pattern is removed.

---

### 2.4 — TabBar → `bits-ui Tabs`

**File:** `Components/TabBar.svelte`

**Current problems:**
- Uses `<input type="radio">` + `<label>` to drive tab switching — the active tab is tracked via a bound DOM reference (`activeTab: HTMLElement`) rather than a value, making the state implicit.
- `onMount` timeout hack (line ~60) to set the initial active tab by querying the DOM.
- No `role="tablist"` / `role="tab"` / `role="tabpanel"` structure.

**What changes:**
- Replace the radio + label mechanism with `Tabs.Root`, `Tabs.List`, `Tabs.Trigger`, and `Tabs.Content` from bits-ui.
- `activeLabel` becomes the controlled `value` on `Tabs.Root` — replace the DOM reference approach with a string value.
- Remove the `onMount` timeout. Set the initial value via `Tabs.Root`'s `value` prop.
- The extra right-side content (ThemeSwitcher, ColorPicker, RunButton) lives outside `Tabs.List` as it does today; no change needed there.
- Keep all SCSS classes.

**Acceptance criteria:**
- `role="tablist"`, `role="tab"`, and `role="tabpanel"` are present in rendered HTML.
- The `onMount` setTimeout is removed.
- `activeLabel` is driven by a string value, not a DOM element reference.
- Arrow keys navigate between tabs.
- Clicking a tab switches content (same as before).
- Visual appearance is unchanged.

---

### 2.5 — ThemeSwitcher → `bits-ui Toggle` *(optional)*

**File:** `Components/ThemeSwitcher.svelte`

This is lower priority. The current implementation is functionally correct. Adopting `Toggle.Root` from bits-ui adds `aria-pressed` semantics and keyboard activation automatically.

- [ ] Replace the outer `<button>` with `Toggle.Root`. Bind `pressed` to the `theme` boolean state.
- Keep all existing SCSS and the animated icon swap.

**Acceptance criteria:**
- `aria-pressed` is present and updates on toggle.
- Space/Enter key activates the toggle.
- Visual appearance is unchanged.

---

### 2.6 — Code Readability Standards for Task 2

All components modified in Task 2 must follow these standards:

- **One comment per bits-ui primitive** explaining why it was chosen over a plain HTML element (e.g. `<!-- Slider.Root manages drag, keyboard inc/dec, and ARIA value attributes -->`).
- **Section separators** in the `<script>` block: group imports, props, derived state, and effects with a single-line comment header (e.g. `// --- props`, `// --- state`, `// --- effects`).
- **No inline logic in templates** longer than a ternary. Extract complex expressions into `$derived` variables with descriptive names.
- **Props interfaces** must be defined with explicit TypeScript types — no implicit `any`.

---

### Out of Scope for Task 2

The following components must **not** be touched:

| Component | Reason |
|---|---|
| `CMTextArea.svelte` | CodeMirror — no bits-ui equivalent |
| `AnimationCard.svelte` | Domain-specific, purely visual |
| `ShadowCard.svelte` | Domain-specific, purely visual |
| `PreviewFrame.svelte` | Custom Spring resize — no bits-ui equivalent |
| `Confetti.svelte` | Particle animation |
| `Intro.svelte` | Splash screen, no interactivity |
| `Logo.svelte` | Static SVG brand asset |
| `Toast.svelte` | Simple, functional — bits-ui has no Toast primitive |
| `Alert.svelte` | Simple, functional — bits-ui AlertDialog is a modal, not a banner |
| `Chip.svelte` / `Pill.svelte` | Simple enough that adding bits-ui overhead is not worth it |
| `SectionTitle.svelte` / `SectionTabBar.svelte` | Layout-only, no interactive state |
| `Button.svelte` / `InputText.svelte` | Simple wrappers, no accessibility gap |
| All `src/jsx/` files | ExtendScript — entirely separate runtime |
| All Bolt CEP files | Not in scope |

---

## Branching Strategy

- Task 1 and Task 2 should be developed on separate branches and merged to `main` sequentially (Task 1 first).
- Suggested branch names: `fix/code-audit` and `feat/bits-ui`.
- Each task merges via PR with a summary of what changed and a manual smoke-test checklist against Illustrator.
