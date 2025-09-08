import { EditorView } from "@codemirror/view";
import type { Placement } from "@floating-ui/dom";
import { get } from "svelte/store";
import type { Options } from "svooltip";
import { fs, path } from "../../lib/cep/node";
import { csi, evalTS } from "../../lib/utils/bolt";
import { currentBackdrop } from "../stores";
import config from "../../../../cep.config";


let userDataPath = window.cep ? csi.getSystemPath("userData") : "";
let settingsFile;

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
    const imgURL = `../../../assets/images/backdrops/backdrop_${currBackdrop}.jpg`;
    return imgURL;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

export function saveSettings(aiSettings, styleSettings) {
  if (window.cep) {
    evalTS("setVariable", "ai-settings", aiSettings);
    evalTS("setVariable", "css-settings", styleSettings);
  }
}

export const myTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "transparent !important",
      border: "unset !important",
    },
    "&.cm-focused": {
      outline: "unset !important",
    },
    ".cm-scroller": {
      fontFamily: "inherit",
      overflow: "auto",
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "var(--color-accent-primary) !important",
      borderWidth: "2px !important",
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
  },
  { dark: true }
);

export function readFile(fileName) {
  const filePath = path.join(userDataPath, config.id, fileName);
  if (fs.existsSync(filePath)) {
    var data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return data;
  }
  return {};
}

export function writeFile(fileName, data) {
  const filePath = path.join(userDataPath, config.id, fileName);
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

  }
  fs.writeFileSync(filePath, JSON.stringify(data));
}
