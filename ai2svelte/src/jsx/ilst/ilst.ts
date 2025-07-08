import { main } from './ai2svelteNightly';
import { updateSettings, fetchSettings } from "./updateSettings";
import { fetchSelectors } from "./fetchSelectors";
import { addSnippet } from "./addSnippet";

export const updateAiSettings = (settingsObj: string, str: string) => {
  if(app) {
    updateSettings(settingsObj, str);
  }
};

export const fetchAiSettings = (settingsObj: string) => {
  if(app) {
    return fetchSettings(settingsObj);
  }
};

export const fetchDocSelectors = () => {
  if(app) {
    return fetchSelectors();
  }
}

export const addSnippetLayer = () => {
  if(app) {
    return addSnippet();
  }
}