import { EditorView } from "@codemirror/view";
import type { Placement } from "@floating-ui/dom";
import { get } from "svelte/store";
import type { Options } from "svooltip";
import { fs, path } from "../../lib/cep/node";
import { csi, evalTS } from "../../lib/utils/bolt";
import { currentBackdrop } from "../stores";
import config from "../../../../cep.config";
import JSON5 from "json5";
import { userData } from "../state.svelte";
import {
  settingsObject,
  savedSettings,
  styles,
  savedStyles,
  lastSaved,
} from "../stores";
import defaultProfile from "../Tabs/data/default-profile.json";
import postcss from "postcss";
// @ts-ignore: postcss-safe-parser has no TypeScript declarations
import safeParser from "postcss-safe-parser";
import { parseCSS } from "./cssUtils";
import type { SettingsObject } from "../Tabs/types";

let userDataPath = window.cep ? csi.getSystemPath("userData") : "";

export function constrain(n: number, low: number, high: number) {
  return Math.max(Math.min(n, high), low);
}

// Returns a debounced version of fn that delays execution by `delay` ms.
// Each new call resets the timer, so rapid calls only fire once.
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export const tooltipSettings: Options = {
  placement: "top-start" as Placement,
  delay: [300, 0],
  offset: 0,
  target: "#layers",
};

/**
 * Returns the local path to the current backdrop image asset.
 * Falls back to undefined on failure.
 */
export async function fetchNewImageURL(): Promise<string | undefined> {
  const currBackdrop = get(currentBackdrop);
  try {
    if (process.env.NODE_ENV === "production") {
      return `../js/assets/images/backdrops/backdrop_${currBackdrop}.jpg`;
    } else {
      return `../../assets/images/backdrops/backdrop_${currBackdrop}.jpg`;
    }
  } catch (error) {
    console.error("[ai2svelte] fetchNewImageURL error:", error);
    return undefined;
  }
}

export function saveSettings(
  aiSettings: SettingsObject,
  styleSettings: { styleText?: string },
  version: string,
) {
  if (window.cep) {
    evalTS("setVariable", "ai-settings", aiSettings);
    evalTS("setVariable", "css-settings", styleSettings);
    evalTS("setVariable", "version", { version });
    evalTS("setVariable", "lastSaved", { time: Date.now() });
  }
}

export const myTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "transparent !important",
      border: "unset !important",
    },
    "&.cm-focused": {
      //   outline: "unset !important",
    },
    ".cm-scroller": {
      fontFamily: "inherit",
      overflow: "auto",
    },
    // "&.cm-focused .cm-cursor": {
    //   borderLeftColor: "var(--color-accent-primary) !important",
    //   borderWidth: "2px !important",
    // },
    ".cm-cursor": {
      display: "block",
      borderLeftColor: "var(--color-accent-primary) !important",
      borderWidth: "2px !important",
    },
    ".cm-cursorLayer": {
      animation: "unset !important",
    },
    ".cm-gutters": {
      backgroundColor: "#ffffff00 !important",
      color: "var(--color-text) !important",
    },
    ".cm-content, .cm-gutter": { minHeight: "200px", height: "100%" },
    ".cm-line": {
      fontSize: "clamp(0.89rem, -0.08vw + 0.91rem, 0.84rem) !important",
      lineHeight: "150% !important",
    },
    ".cm-gutterElement": {
      fontSize: "clamp(0.89rem, -0.08vw + 0.91rem, 0.84rem) !important",
      lineHeight: "150% !important",
      opacity: "0.25 !important",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent !important",
      color: "var(--color-text) !important",
      opacity: "1 !important",
    },
    ".cm-activeLine": {
      backgroundColor: "transparent !important",
      boxShadow: "0 -0.5px 0 0 #80808055, 0 0.5px 0 0 #80808055",
    },
    ".cm-tooltip": {
      color: "var(--color-text) !important",
    },
  },
  { dark: true },
);

export function readFile(fileName: string): unknown {
  const filePath = path.join(userDataPath, config.id, fileName);
  if (fs.existsSync(filePath)) {
    try {
      return JSON5.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
      console.error("[ai2svelte] Error reading file:", error);
      return null;
    }
  }
  return null;
}

export function writeFile(fileName: string, data: unknown): boolean {
  try {
    const filePath = path.join(userDataPath, config.id, fileName);
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("[ai2svelte] Error writing file:", error);
    return false;
  }
}

/**
 * Fetches plugin settings from the Illustrator document,
 * updates the corresponding Svelte stores, and loads user preferences.
 */
export async function fetchSettings(): Promise<void> {
  const userSettings = readFile("user-settings.json") as Record<string, string> | null;
  if (userSettings && Object.keys(userSettings).length !== 0) {
    userData.theme = userSettings.theme;
    userData.accentColor = userSettings.accentColor;
    userData.fontsConfig = (userSettings.fontsConfig as unknown as { [key: string]: string }) || {};
  } else {
    writeFile("user-settings.json", userData);
  }

  const fetchedSettings = await evalTS("getVariable", "ai-settings") as SettingsObject;

  if (Object.keys(fetchedSettings).length === 0) {
    const usersProfiles = readFile("user-profiles.json") as Record<string, SettingsObject> | null;

    if (usersProfiles && Object.keys(usersProfiles).includes("default")) {
      settingsObject.set(usersProfiles.default);
    } else {
      settingsObject.set(defaultProfile.default as SettingsObject);
    }
    savedSettings.set({});
    styles.set(await postcss().process("", { parser: safeParser }));
    savedStyles.set(await postcss().process("", { parser: safeParser }));
    lastSaved.set("Never");
  } else {
    savedSettings.set({ ...fetchedSettings });
    settingsObject.set({ ...fetchedSettings });
    const fetchedStyles = await evalTS("getVariable", "css-settings") as { styleText?: string };
    const stylesAST = await parseCSS(fetchedStyles.styleText || "");
    savedStyles.set(
      await postcss().process(stylesAST.root.clone(), { from: undefined }),
    );
    styles.set(
      await postcss().process(stylesAST.root.clone(), { from: undefined }),
    );
    lastSaved.set(await evalTS("getVariable", "lastSaved") as { time: Date });
  }
}

/**
 * Fetches only the saved (last-committed) settings from the Illustrator document.
 * Does not update the active settingsObject/styles stores.
 */
export async function fetchSavedSettings(): Promise<void> {
  const userSettings = readFile("user-settings.json") as Record<string, string> | null;
  if (userSettings && Object.keys(userSettings).length !== 0) {
    userData.theme = userSettings.theme;
    userData.accentColor = userSettings.accentColor;
    userData.fontsConfig = (userSettings.fontsConfig as unknown as { [key: string]: string }) || {};
  } else {
    writeFile("user-settings.json", userData);
  }

  const fetchedSettings = await evalTS("getVariable", "ai-settings") as SettingsObject;

  if (Object.keys(fetchedSettings).length === 0) {
    savedSettings.set({});
    savedStyles.set(await postcss().process("", { parser: safeParser }));
    lastSaved.set("Never");
  } else {
    savedSettings.set({ ...fetchedSettings });
    const fetchedStyles = await evalTS("getVariable", "css-settings") as { styleText?: string };
    const stylesAST = await parseCSS(fetchedStyles.styleText || "");
    savedStyles.set(
      await postcss().process(stylesAST.root.clone(), { from: undefined }),
    );
    lastSaved.set(await evalTS("getVariable", "lastSaved") as { time: Date });
  }
}
