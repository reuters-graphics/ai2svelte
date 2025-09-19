import { updateSettings, fetchSettings } from "./updateSettings";
import { fetchSelectors } from "./fetchSelectors";
import { addSnippet } from "./addSnippet";
import { storeHiddenData, getHiddenData } from "./dataOperations";
import { main } from "./ai2svelte/ai2svelte";
import {
  getDocPath,
  createFolder,
  createFile,
  getSelectedItems,
} from "./ilstUtils";

export const updateAiSettings = (settingsObj: string, str: string) => {
  if (app) {
    updateSettings(settingsObj, str);
  }
};

export const fetchAiSettings = (settingsObj: string) => {
  if (app) {
    return fetchSettings(settingsObj);
  }
};

export const fetchDocSelectors = () => {
  if (app) {
    return fetchSelectors();
  }
};

export const addSnippetLayer = () => {
  if (app) {
    return addSnippet();
  }
};

export const setVariable = (key, value) => {
  if (app) {
    return storeHiddenData(key, value);
  }
};

export const getVariable = (key) => {
  if (app) {
    return getHiddenData(key);
  }
};

export const runNightly = (settings) => {
  if (app) {
    return main(settings);
  }
};

export const runPreview = (settings, path) => {
  if (app) {
    createFolder(path);

    settings.settings.isPreview = true;
    settings.settings.html_output_path = path;
    settings.settings.html_output_extension = ".svelte";
    settings.settings.image_output_path = path;
    settings.settings.image_source_path = "";
    settings.settings.include_resizer_css = false;
    settings.settings.project_name = "preview";
    settings.settings.show_completion_dialog_box = false;

    main(settings);
  }
};

export const getFilePath = () => {
  if (app) {
    return getDocPath();
  }
};

export const makeFolder = (path) => {
  if (app) {
    return createFolder(path);
  }
};

export const makeFile = (path, content) => {
  if (app) {
    createFile(path, content);
    return path;
  }
};

export const fetchSelectedItems = () => {
  if (app) {
    return getSelectedItems();
  }
};

export const exportAsTemplate = () => {
  if (app) {
    return app.executeMenuCommand("saveastemplate");
  }
};
