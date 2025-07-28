import { writable } from "svelte/store";
import type { Writable } from "svelte/store";
import type { Style } from "./Tabs/types";

export const settingsObject = writable<Record<string, any>>({});

const testStyle: Style = {
    '#text1': ['color: yellow', 'stroke: white']
};

export const styles: Writable<Style> = writable(testStyle);

export const stylesString: Writable<string> = writable('');

export const updateInProgress: Writable<boolean> = writable(false);

export const isCEP: Writable<boolean> = writable(false);

export const userTheme: Writable<string> = writable('dark');