import { updateSettings, fetchSettings } from "./updateSettings";
import { fetchSelectors } from "./fetchSelectors";
import { addSnippet } from "./addSnippet";
import { storeHiddenData, getHiddenData } from './dataOperations';
import { main } from './nightly/nightly';
import { getDocPath, createFolder, createFile } from "./ilstUtils";

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

export const setVariable = (key, value) => {
  if(app) {
    return storeHiddenData(key, value);
  }
}

export const getVariable = (key) => {
  if(app) {
    return getHiddenData(key);
  }
}

export const runNightly = (settings) => {
  if (app) {
    main(settings);
  }
}

export const getFilePath = () => {
  if(app) {
    return getDocPath();
  }
}

export const makeFolder = (path) => {
  if(app) {
    return createFolder(path);
  }
}

export const makeFile = (path, content) => {
  if(app) {
    createFile(path, content);
    return path;
  }
}