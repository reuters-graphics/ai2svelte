import { writable } from "svelte/store";
import type { Writable } from "svelte/store";

export interface Style {
    [key: string]: string[];
}

export const settingsObject = writable<Record<string, any>>({});

export const snippets = writable({});

const testStyle: Style = {
    '#text1': ['color: yellow', 'stroke: white']
};

export const styles: Writable<Style> = writable(testStyle);

export const stylesString: Writable<string> = writable('');

export const updateInProgress: Writable<boolean> = writable(true);

export const isCEP: Writable<boolean> = writable(false);

export const userTheme: Writable<string> = writable('dark');