import { writable } from "svelte/store";
import type { Writable } from "svelte/store";

export interface Style {
    styles: string[],
    shadowName: string | null
}

export const settingsObject = writable<Record<string, any>>({});

export const snippets = writable({});

const testStyle = {
    '#text1': {
        styles: ['color: yellow', 'stroke: white'],
        shadowName: null
    }};

export const styles: Writable<Record<string, Style>> = writable({});

export const updateInProgress: Writable<boolean> = writable(false);

export const isCEP: Writable<boolean> = writable(false);