# ai2svelte — Testing Strategy

Scope: `ai2svelte/src/` only. No test infrastructure changes touch Bolt CEP files, `cep.config.ts`, or build configs unless noted.

---

## Overview

The extension runs two runtimes. Tests must cover both, but with different tooling:

| Runtime | Tooling | What it covers |
|---|---|---|
| **CEP Frontend** (`src/js/`) | Vitest + Svelte Testing Library | Pure utilities, stores, component logic, evalTS call sites |
| **ExtendScript** (`src/jsx/`) | Manual checklist only | No native test runner for ES3; verify via Illustrator debug console |
| **End-to-end** | Manual checklist | Full user paths that require a live Illustrator document |

No existing test suite. Every task below sets up infrastructure or adds tests from scratch.

---

## Task 1 — Test Infrastructure

### 1.1 — Install and configure Vitest

**Work items:**
- [ ] `pnpm add -D vitest @vitest/ui jsdom` (inside `ai2svelte/`)
- [ ] Add a `vitest.config.ts` that:
  - Sets `environment: "jsdom"` for component tests
  - Sets `resolve.alias` for `$lib` and other Svelte path aliases matching `vite.config.ts`
  - Excludes `src/jsx/` (ExtendScript; not testable by Vitest)
- [ ] Add a `test` script to `ai2svelte/package.json`: `"test": "vitest run"` and `"test:ui": "vitest --ui"`
- [ ] Confirm `pnpm test` runs and exits 0 (zero test files at this point is fine)

**Acceptance criteria:**
- `pnpm test` from `ai2svelte/` exits cleanly.
- `vitest.config.ts` exists.

---

### 1.2 — Install Svelte Testing Library

**Work items:**
- [ ] `pnpm add -D @testing-library/svelte @testing-library/jest-dom @testing-library/user-event`
- [ ] Add a `setupTests.ts` that imports `@testing-library/jest-dom/vitest`
- [ ] Wire `setupTests.ts` into `vitest.config.ts` via `setupFiles`

**Acceptance criteria:**
- `expect(element).toBeInTheDocument()` is available in test files without extra imports.

---

### 1.3 — Mock evalTS globally

`evalTS` calls ExtendScript from the panel. Tests must not hit the real bridge.

**Work items:**
- [ ] Create `src/js/__mocks__/bolt.ts` that exports a `vi.fn()` named `evalTS` returning a resolved promise
- [ ] Register the mock path in `vitest.config.ts` via `alias` or `moduleNameMapper`
- [ ] Write one smoke test confirming the mock is picked up and `evalTS` does not throw

**Acceptance criteria:**
- Any test that imports `evalTS` gets the mock, not the real bridge.

---

## Task 2 — Unit Tests: Utility Functions

### 2.1 — `utils/utils.ts`

Key functions to test: `constrain`, `debounce` (if added per earlier plan), any file-path or string helpers.

**Work items:**
- [ ] `constrain(value, min, max)`:
  - Returns `value` when within range
  - Clamps to `min` when below
  - Clamps to `max` when above
  - Handles equal `min`/`max` edge case
- [ ] Any exported `debounce`:
  - Delays execution by the specified timeout
  - Calls function once per burst (multiple rapid calls → one actual call)
  - Calls with the most recent arguments

**Test file:** `src/js/__tests__/utils.test.ts`

---

### 2.2 — PostCSS / Styles utilities (`Tabs/Styles/utils.ts`)

**Work items:**
- [ ] CSS selector parsing: given a PostCSS AST string, extracting all selectors returns the correct array
- [ ] Toggle logic: toggling a shadow rule on/off produces the expected CSS output
- [ ] Toggle logic: toggling an animation rule on/off produces the expected CSS output
- [ ] Debounce wrapping of `parseCss`: confirm only one parse fires per burst (mock `postcss` parse)

**Test file:** `src/js/__tests__/stylesUtils.test.ts`

---

### 2.3 — `stores.ts` derived values

Focus on logic that is pure / testable without DOM or evalTS.

**Work items:**
- [ ] `stylesString` derived store: setting `styles` to a PostCSS AST node produces the correct CSS string
- [ ] `unsavedChanges` derived store: evaluates to `true` when `settingsObject` diverges from `savedSettings`
- [ ] `cacheObj` derived store: produces the correct shape when `docName`, `settingsObject`, and `stylesString` are set

**Test file:** `src/js/__tests__/stores.test.ts`

---

## Task 3 — Component Tests

Each test file lives alongside the component under `__tests__/` in the same directory.

### 3.1 — `Button.svelte`

**Work items:**
- [ ] Renders with the correct label text
- [ ] `disabled` prop disables the button and prevents click
- [ ] `onClick` callback fires on click when not disabled
- [ ] `minimal` prop applies the expected CSS class

---

### 3.2 — `InputText.svelte`

**Work items:**
- [ ] Renders label and input
- [ ] Typing updates bound `value`
- [ ] `readonly` prop prevents input changes

---

### 3.3 — `Dropdown.svelte`

**Work items:**
- [ ] Renders the trigger with initial selected option
- [ ] Clicking the trigger opens the option list
- [ ] Clicking an option fires the change handler and closes the list
- [ ] Pressing `Escape` closes the open list
- [ ] Arrow keys navigate options; `Enter` selects (bits-ui provides this — test it works)
- [ ] `aria-expanded` is present on the trigger

---

### 3.4 — `Selector.svelte`

**Work items:**
- [ ] Renders all provided label options
- [ ] Clicking an option updates `value`
- [ ] Only the active option has `data-checked` / `data-state="checked"`
- [ ] Arrow keys move focus between options (bits-ui roving tabindex)
- [ ] Tab key exits the group (roving tabindex)
- [ ] `role="radiogroup"` and `role="radio"` are present

---

### 3.5 — `InputRange.svelte`

**Work items:**
- [ ] Renders with initial `value`
- [ ] Arrow key press increments value by `stepper`
- [ ] `aria-valuemin`/`aria-valuemax`/`aria-valuenow` reflect `start`/`end`/`value` props
- [ ] Value is clamped within `start`–`end` range

---

### 3.6 — `Toast.svelte`

**Work items:**
- [ ] Renders with the message text
- [ ] Auto-dismisses after `duration` ms (use `vi.useFakeTimers`)
- [ ] Does not render after dismissal

---

### 3.7 — `Alert.svelte`

**Work items:**
- [ ] Renders when `message` is set in the `alertObject` store
- [ ] Does not render when `alertObject` message is empty

---

### 3.8 — `ThemeSwitcher.svelte`

**Work items:**
- [ ] Clicking the button toggles the theme between `"dark"` and `"light"`
- [ ] `aria-pressed` updates to reflect current theme state
- [ ] Space/Enter key activates the toggle

---

### 3.9 — `Pill.svelte`

**Work items:**
- [ ] Renders the name prop as text
- [ ] Clicking the remove button fires the `onRemove` callback
- [ ] `active` prop applies the expected CSS class
- [ ] Clicking the pill itself (not remove) fires the `onClick` callback

---

### 3.10 — `TabBar.svelte`

**Work items:**
- [ ] Renders all provided tab labels
- [ ] Clicking a tab updates `activeLabel`
- [ ] `role="tablist"` and `role="tab"` are present
- [ ] Arrow keys navigate between tabs
- [ ] Tab panels are connected via `aria-controls` / `aria-labelledby`

---

## Task 4 — Integration Tests: evalTS Call Sites

These tests verify that the panel components call `evalTS` correctly and handle its responses (using the mock from Task 1.3).

### 4.1 — `RunButton.svelte`

**Setup:** Mock `evalTS("runAi2Svelte")` to return a resolved value.

**Work items:**
- [ ] Clicking "Run" calls `evalTS("runAi2Svelte")` with the current settings and CSS code
- [ ] While running, button is disabled and shows a loading state
- [ ] On resolved response with missing font families: shows a toast listing them
- [ ] On resolved response with no missing fonts: triggers confetti (test `triggerConfetti` store is set)
- [ ] On rejected promise: shows an error toast (test that toast message is set)

**Test file:** `Tabs/Home/__tests__/RunButton.test.ts`

---

### 4.2 — Home tab — Export as Template

**Work items:**
- [ ] Clicking "Export as Template" calls `evalTS("exportAsTemplate")`
- [ ] On rejection: shows error toast

**Test file:** `Tabs/Home/__tests__/Home.test.ts`

---

### 4.3 — Settings tab — Profile management

**Setup:** Mock `evalTS("setVariable")` and `evalTS("getVariable")` calls made via `utils.ts`.

**Work items:**
- [ ] "Save Profile" — opens dialog, accepting a name calls the write path
- [ ] "Load Profile" — selecting a profile name sets `settingsObject` to that profile's values
- [ ] "Reset Config" — calls write path with the "default" profile data
- [ ] "Import from File" — reading a valid JSON blob updates profile store; an invalid file shows an alert
- [ ] "Export to File" — triggers file download with correct JSON content

**Test file:** `Tabs/Settings/__tests__/Settings.test.ts`

---

### 4.4 — Styles tab — Identifier auto-detection

**Setup:** Mock `evalTS("fetchSelectedItems")` to return `"p.g-pstyle0"`.

**Work items:**
- [ ] On `ART_SELECTION_CHANGED` event: calls `evalTS("fetchSelectedItems")` and updates the identifier input
- [ ] The returned selector is added to the styles AST as a new rule

**Test file:** `Tabs/Styles/__tests__/Styles.test.ts`

---

### 4.5 — Inspect tab — Reset metadata

**Work items:**
- [ ] Clicking "Reset File Metadata" calls `evalTS("setVariable", "ai-settings", {})` and `evalTS("setVariable", "version", ...)`
- [ ] The button is only available in inspect mode (Ctrl+Shift+I activated)

**Test file:** `Tabs/__tests__/Inspect.test.ts`

---

### 4.6 — `main.svelte` — Document lifecycle

**Setup:** Mock `evalTS("getDocumentName")` and `evalTS("getActiveDocumentsNames")`.

**Work items:**
- [ ] On mount: calls `getDocumentName` and sets `docName` store
- [ ] On `documentAfterActivate` event: calls `getDocumentName` again and updates store
- [ ] Document switching updates the cache correctly (new doc loads cached settings)

**Test file:** `__tests__/main.test.ts`

---

## Task 5 — Manual Test Checklists

These paths require a live Illustrator environment. Execute against a real document before each release.

### 5.1 — First Launch

- [ ] Open Illustrator with no previously saved extension data
- [ ] Extension panel loads without errors (check CEP console at `localhost:8860`)
- [ ] Home tab is active by default
- [ ] Last Saved shows "Never"
- [ ] Settings tab shows default profile values
- [ ] Styles tab loads with an empty CSS editor and default identifier

---

### 5.2 — Run ai2svelte (Happy Path)

- [ ] Open a document with Svelte-compatible AI layers
- [ ] Go to Home tab, click "Run AI2SVELTE"
- [ ] Button becomes disabled during execution
- [ ] Confetti plays on success
- [ ] "Last Saved" timestamp updates
- [ ] Generated `.svelte` file appears on disk in the expected output path

---

### 5.3 — Run ai2svelte (Missing Fonts)

- [ ] Open a document with a font not mapped in Settings
- [ ] Click "Run AI2SVELTE"
- [ ] A toast appears listing the unmapped font families
- [ ] The run still completes (missing fonts are a warning, not an error)

---

### 5.4 — Run ai2svelte (Failure)

- [ ] Open a document with an intentionally invalid configuration
- [ ] Click "Run AI2SVELTE"
- [ ] An error toast appears with a readable message
- [ ] The panel does not freeze or go into a loading state permanently

---

### 5.5 — Settings: Profile Lifecycle

- [ ] Save a new profile with a custom name → appears in Load Profile dropdown
- [ ] Load that profile → settings update in the panel
- [ ] Delete the profile from Load Profile dialog → it no longer appears in the list
- [ ] Reset Config → settings revert to the "default" profile values
- [ ] Export profiles → a valid JSON file is downloaded
- [ ] Import that JSON → profiles appear under Load Profile

---

### 5.6 — Settings: Theme and Accent

- [ ] Toggle theme switcher → panel switches between dark/light; persists across panel close/reopen
- [ ] Change accent color → primary interactive elements update color; persists

---

### 5.7 — Settings: Font Mapping

- [ ] Add a font mapping (font family name → CSS variable)
- [ ] Run ai2svelte → generated output uses the mapped CSS variable instead of the literal font name
- [ ] Remove the mapping → regenerated output reverts to literal font name

---

### 5.8 — Styles: UI Mode — Shadows

- [ ] Select an object in Illustrator → identifier field auto-fills with the CSS class
- [ ] Toggle a shadow card ON → corresponding `@include shadow-*` rule appears in the code editor
- [ ] Toggle it OFF → rule is removed
- [ ] Change shadow color → color hex value updates in the CSS rule
- [ ] Cycle backdrop images (ExtraConfigs) → shadow preview updates
- [ ] Change specimen text → preview specimen text updates

---

### 5.9 — Styles: UI Mode — Animations

- [ ] Toggle an animation card ON → animation rule appears in the CSS
- [ ] Toggle it OFF → animation rule is removed
- [ ] Multiple animations can be active simultaneously without rules conflicting

---

### 5.10 — Styles: Code Mode

- [ ] Switch to Code format → CodeMirror editor loads with the current CSS
- [ ] Edit CSS in the editor → parsed AST updates (shadows/animations cards reflect change after switching back to UI mode)
- [ ] Type invalid CSS → PostCSS parse error appears in the editor gutter or alert
- [ ] The editor does not block the UI during typing (debounce in effect)

---

### 5.11 — Styles: Selector Pills

- [ ] After adding styles for multiple selectors, all appear as pills in the PillsContainer
- [ ] Clicking a pill → identifier field updates to that selector and its styles load
- [ ] Clicking the remove button on a pill → that selector's rules are deleted from the CSS
- [ ] Removed selector's pill disappears immediately

---

### 5.12 — Preview: Load and Resize

- [ ] Run ai2svelte to generate a preview component
- [ ] Switch to Preview tab → component loads and renders in the iframe
- [ ] Drag the resize handle → frame resizes with Spring animation; dimensions display during drag
- [ ] Click Refresh → preview reloads

---

### 5.13 — Preview: Loading State and Error

- [ ] Delete the generated preview JS file manually
- [ ] Click Refresh → loading indicator appears during retries
- [ ] After all retries fail → user-facing error message appears (no silent hang)

---

### 5.14 — Document Switching

- [ ] Open two Illustrator documents with different settings
- [ ] Switch between documents → panel loads each document's settings and styles independently
- [ ] Making changes in Document A, then switching to B and back → Document A's unsaved changes are preserved in memory

---

### 5.15 — Export as Template

- [ ] Click "Export as Template" on the Home tab
- [ ] Illustrator "Save as Template" dialog opens
- [ ] Saving creates a `.ait` file in the expected location

---

### 5.16 — Inspect Mode (Debug)

- [ ] Press Ctrl+Shift+I → Inspect tab appears
- [ ] Diff view shows no diff when settings are in sync
- [ ] Modify settings → diff view shows the change in green/red
- [ ] Click "Reset File Metadata" → XMP data is cleared; confirms with a log in the CEP console
- [ ] Press Ctrl+Shift+I again → Inspect tab hides

---

### 5.17 — Error Resilience (CEP Bridge Failures)

- [ ] Simulate ExtendScript error (e.g. call with bad args via Inspect console)
- [ ] Panel shows a toast with the error message
- [ ] Panel remains interactive after the error (no frozen state)

---

## Task 6 — ExtendScript Verification Checklist

Run these via Illustrator's ExtendScript Toolkit (ESTK) or the CDP console at `localhost:8860`.

- [ ] `getDocumentName()` returns the active document's filename
- [ ] `getActiveDocumentsNames()` returns an array of all open document names
- [ ] `setVariable("ai-settings", {...})` stores data as XMP metadata (verify with `getVariable`)
- [ ] `getVariable("ai-settings")` retrieves previously stored data
- [ ] `runAi2Svelte(settings)` processes a well-formed settings object without error
- [ ] `runPreview(settings, path)` writes a `previewComponent.js` to the given path
- [ ] `fetchSelectedItems()` returns the CSS class of the currently selected layer
- [ ] `exportAsTemplate()` triggers the Save as Template dialog
- [ ] `makeFolder(path)` creates a directory at the given path
- [ ] `makeFile(path, content)` writes file content and returns the written path

---

## Execution Order

1. **Task 1** — Infrastructure first; unblocks all automated tests
2. **Task 2** — Quickest wins; pure function tests, no DOM or mocks needed
3. **Task 3** — Component tests; start with leaf components (Button, Pill) before containers
4. **Task 4** — evalTS integration tests; depends on the mock from Task 1.3
5. **Task 5 + 6** — Manual; run before any release regardless of automated coverage

---

## Coverage Goals

| Area | Target | Method |
|---|---|---|
| Pure utility functions | 100% | Vitest unit tests |
| Svelte component interactions | Key user actions per component | Testing Library |
| evalTS call sites | All 18 call sites have a test | Vitest + mock |
| Full user paths | 17 manual scenarios | Checklist against Illustrator |
| ExtendScript functions | 10 core functions | ESTK / CDP console |
