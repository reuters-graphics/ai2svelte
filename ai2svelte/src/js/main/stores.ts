import { derived, writable } from "svelte/store";
import type { Writable } from "svelte/store";
import type { Style } from "./Tabs/types";
import { styleObjectToString, generateAllMixins } from "./utils/cssUtils";

export const settingsObject = writable<Record<string, any>>({});

const testStyle: Style = {
    '#text1': ['color: yellow', 'stroke: white']
};

export const styles: Writable<Style> = writable(testStyle);

export const stylesString = derived(styles,
    ($styles) => {
        return generateAllMixins($styles) + "\n" + styleObjectToString($styles);
    }
);

export const updateInProgress: Writable<boolean> = writable(false);

export const isCEP: Writable<boolean> = writable(false);

export const userTheme: Writable<string> = writable('dark');

export const currentBackdrop: Writable<number> = writable(0);