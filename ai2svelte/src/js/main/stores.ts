import type { Writable } from "svelte/store";
import { derived, get, writable } from "svelte/store";
import type { Style, ShadowItem, AnimationItem, SettingsObject, PreviewObject } from "./Tabs/types";
import { generateAllMixins } from "./utils/cssUtils";
import type { Result, Root } from "postcss";

// --- Svelte stores (legacy reactive primitives) ---
// These stores use Svelte 4's writable/derived API and are consumed throughout
// the app with the $-prefix shorthand (e.g. $settingsObject).
//
// New state should prefer Svelte 5 runes ($state / $derived) in .svelte.ts files.
// Do NOT add new stores here for UI-preference data — use state.svelte.ts for that.
// See state.svelte.ts for: accentColor, theme, fontsConfig.
//
// Ownership map:
//   settingsObject / savedSettings  — AI plugin config (from Illustrator XMP)
//   styles / savedStyles            — PostCSS AST of the user's CSS
//   stylesString                    — derived CSS string for passing to ExtendScript
//   cache / cacheObj                — per-document snapshot for fast tab switching
//   userAnimations/Shadows/etc.     — user-editable JSON lists loaded from disk

export const settingsObject = writable<SettingsObject>({});

export const savedSettings = writable<SettingsObject>({});

export const savedStyles: Writable<Result<Root>> = writable();

export const styles: Writable<Result<Root>> = writable();

export const stylesString = derived(styles, ($styles) => {
  return generateAllMixins($styles) + "\n" + ($styles?.root?.toString() || "");
});

export const updateInProgress: Writable<boolean> = writable(false);

export const ai2svelteInProgress: Writable<boolean> = writable(false);

export const userTheme: Writable<string> = writable("dark");

export const currentBackdrop: Writable<number> = writable(2);

export const alertObject: Writable<{ flag: boolean; message: string }> =
  writable({
    flag: false,
    message: "",
  });

export const userAnimations: Writable<AnimationItem[]> = writable([]);
export const userShadows: Writable<ShadowItem[]> = writable([]);
export const userSpecimens: Writable<string[]> = writable([]);
export const userShadowsBaked: Writable<ShadowItem[]> = writable([]);

export const unsavedChanges: Writable<{ flag: boolean; message: string }> =
  writable({ flag: true, message: "" });

export const forcePreview: Writable<boolean> = writable(false);

export const triggerConfetti: Writable<boolean> = writable(false);

export const lastSaved: Writable<{ time: Date } | "Never"> = writable("Never");

// Snapshot of the last object sent to the Preview tab.
// Used to skip re-renders when settings/styles have not changed.
export const lastPreviewObject: Writable<PreviewObject> = writable({
  settings: {},
  stylesString: "",
});

export const docName: Writable<string> = writable("");

// Commits an async-parsed styles result to the `styles` store, but only if the
// active document hasn't changed while the parse was in flight. Without this,
// a shadow/animation/CSS edit started on document A can land on document B's
// styles if the user switches documents before the parse promise resolves.
export async function commitStyles(pending: Promise<Result<Root>>) {
  const docAtStart = get(docName);
  const result = await pending;
  if (get(docName) === docAtStart) {
    styles.set(result);
  }
}

// Per-document cache keyed by document name.
// Allows restoring the correct settings/styles when the user switches AI documents.
export const cacheObj: Record<
  string,
  { settingsObject: SettingsObject; styles: Result<Root> }
> = {};

export const cache = derived([settingsObject, styles], () => {
  const docStore = get(docName);
  if (docStore === "") return cacheObj;
  cacheObj[docStore] = {
    settingsObject: get(settingsObject),
    styles: get(styles),
  };
  return cacheObj;
});
