import type { Writable } from "svelte/store";
import { derived, writable } from "svelte/store";
import type { Style } from "./Tabs/types";
import { generateAllMixins, styleObjectToString } from "./utils/cssUtils";

export const settingsObject = writable<Record<string, any>>({});

export const savedSettings = writable<Record<string, any>>({});

const testStyle: Style = {
  "#text1": ["color: yellow", "stroke: white"],
};

export const savedStyles: Writable<Style> = writable({});

export const styles: Writable<Style> = writable({});

export const stylesString = derived(styles, ($styles) => {
  return generateAllMixins($styles) + "\n" + $styles.root.toString();
});

export const updateInProgress: Writable<boolean> = writable(false);

export const ai2svelteInProgress: Writable<boolean> = writable(false);

export const userTheme: Writable<string> = writable("dark");

export const currentBackdrop: Writable<number> = writable(0);

export const alertObject: Writable<{ flag: boolean; message: string }> =
  writable({
    flag: false,
    message: "",
  });

export const userAnimations = writable({});
export const userShadows = writable({});
export const userSpecimens = writable({});
