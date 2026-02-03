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
// @ts-ignore
import safeParser from "postcss-safe-parser";
import { parseCSS } from "./cssUtils";

let userDataPath = window.cep ? csi.getSystemPath("userData") : "";

export function constrain(n: number, low: number, high: number) {
  return Math.max(Math.min(n, high), low);
}

export const tooltipSettings: Options = {
  placement: "top-start" as Placement,
  delay: [300, 0],
  offset: 0,
  target: "#layers",
};

/**
 *
 * Makes a network request to "https://picsum.photos/300/200" and returns the final image URL.
 * If the request fails, logs the error and returns `undefined`.
 *
 * @returns {Promise<string | undefined>} A promise that resolves to the image URL, or `undefined` if an error occurs.
 */
export async function fetchNewImageURL() {
  let currBackdrop = get(currentBackdrop);
  try {
    let imgURL = "";
    if (process.env.NODE_ENV === "production") {
      imgURL = `../js/assets/images/backdrops/backdrop_${currBackdrop}.jpg`;
    } else {
      imgURL = `../../assets/images/backdrops/backdrop_${currBackdrop}.jpg`;
    }
    return imgURL;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

export function saveSettings(aiSettings, styleSettings, version) {
  if (window.cep) {
    console.log("saving data");
    evalTS("setVariable", "ai-settings", aiSettings);
    evalTS("setVariable", "css-settings", styleSettings);
    evalTS("setVariable", "version", { version: version });
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

export function readFile(fileName) {
  const filePath = path.join(userDataPath, config.id, fileName);
  if (fs.existsSync(filePath)) {
    try {
      // valid json data
      var data = JSON5.parse(fs.readFileSync(filePath, "utf8"));
      return data;
    } catch (error) {
      console.log("Error reading flags:", error);
      return null;
    }
  }
  return null;
}

export function writeFile(fileName, data) {
  try {
    const filePath = path.join(userDataPath, config.id, fileName);
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Error writing file:", error);
    return false;
  }
}

/**
 * Fetches plugin settings from Illustrator document,
 * updates the corresponding Svelte stores, and manages the splash screen state.
 *
 * @async
 * @returns {Promise<void>} Resolves when settings and styles have been fetched and updated.
 */
export async function fetchSettings(): Promise<void> {
  // fetch user settings
  // and update the store
  const userSettings = readFile("user-settings.json");
  if (userSettings && Object.keys(userSettings).length != 0) {
    console.log("found user settings");
    userData.theme = userSettings.theme;
    userData.accentColor = userSettings.accentColor;
    userData.fontsConfig = userSettings.fontsConfig || {};
  } else {
    console.log("no user settings found, creating settings file");
    writeFile("user-settings.json", userData);
  }

  console.log("fetching settings...");
  const fetchedSettings = await evalTS("getVariable", "ai-settings");

  if (Object.keys(fetchedSettings).length == 0) {
    // no settings found, first time use
    // use user's default settings
    let usersProfiles = await readFile("user-profiles.json");

    if (usersProfiles && Object.keys(usersProfiles).includes("default")) {
      settingsObject.set(usersProfiles.default);
    } else {
      settingsObject.set(defaultProfile.default);
    }
    savedSettings.set({});
    styles.set(await postcss().process("", { parser: safeParser }));
    savedStyles.set(await postcss().process("", { parser: safeParser }));
    lastSaved.set("Never");
  } else {
    // settings found, use them
    savedSettings.set({ ...fetchedSettings });
    settingsObject.set({ ...fetchedSettings });
    const fetchedStyles = await evalTS("getVariable", "css-settings");
    const stylesAST = await parseCSS(fetchedStyles.styleText);
    savedStyles.set(
      await postcss().process(stylesAST.root.clone(), {
        from: undefined,
      }),
    );
    styles.set(
      await postcss().process(stylesAST.root.clone(), {
        from: undefined,
      }),
    );

    lastSaved.set(await evalTS("getVariable", "lastSaved"));
  }
}

export async function fetchSavedSettings(): Promise<void> {
  // fetch user settings
  // and update the store
  const userSettings = readFile("user-settings.json");
  if (userSettings && Object.keys(userSettings).length != 0) {
    console.log("found user settings");
    userData.theme = userSettings.theme;
    userData.accentColor = userSettings.accentColor;
    userData.fontsConfig = userSettings.fontsConfig || {};
  } else {
    console.log("no user settings found, creating settings file");
    writeFile("user-settings.json", userData);
  }

  console.log("fetching settings...");
  const fetchedSettings = await evalTS("getVariable", "ai-settings");

  if (Object.keys(fetchedSettings).length == 0) {
    savedSettings.set({});
    savedStyles.set(await postcss().process("", { parser: safeParser }));
    lastSaved.set("Never");
  } else {
    // settings found, use them
    savedSettings.set({ ...fetchedSettings });
    const fetchedStyles = await evalTS("getVariable", "css-settings");
    const stylesAST = await parseCSS(fetchedStyles.styleText);
    savedStyles.set(
      await postcss().process(stylesAST.root.clone(), {
        from: undefined,
      }),
    );

    lastSaved.set(await evalTS("getVariable", "lastSaved"));
  }
}
