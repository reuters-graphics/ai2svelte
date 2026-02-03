import type { Writable } from "svelte/store";
import { derived, get, writable } from "svelte/store";
import type { Style, ShadowItem, AnimationItem } from "./Tabs/types";
import { generateAllMixins } from "./utils/cssUtils";
import type { Result, Root } from "postcss";

export const settingsObject = writable<Record<string, any>>({});

export const savedSettings = writable<Record<string, any>>({});

const testStyle: Style = {
  "#text1": ["color: yellow", "stroke: white"],
};

export const savedStyles: Writable<Result<Root>> = writable();

export const styles: Writable<Result<Root>> = writable();

export const stylesString = derived(styles, ($styles) => {
  return generateAllMixins($styles) + "\n" + $styles.root.toString();
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

export const lastPreviewObject: Writable<Record<string, any>> = writable({});

export const docName: Writable<string> = writable("");

export const cacheObj: Record<
  string,
  { settingsObject: unknown; styles: unknown }
> = {};

export const cache = derived([settingsObject, styles], () => {
  const docStore = get(docName);
  if (docStore === "") return {};
  cacheObj[docStore] = {
    settingsObject: get(settingsObject),
    styles: get(styles),
  };
  return cacheObj;
});
