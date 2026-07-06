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
  deleteFolderRecursive,
} from "./ilstUtils";
import { wrapper } from "./previewWrapper";

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

export const runAi2Svelte = (settings) => {
  if (app) {
    return main(settings);
  }
};

export const runPreview = (settings, path) => {
  if (app) {
    // rename existing preview folder to preview_old and delete it
    // rename to avoid clashes with the creation of new preview folder
    deleteFolderRecursive(path);

    // create new preview folder
    createFolder(path);
    makeFile(path + "previewWrapper.js", wrapper);

    settings.settings.isPreview = "true";
    settings.settings.html_output_path = path;
    settings.settings.image_output_path = path;
    settings.settings.image_source_path = "";
    // container queries are not supported in Chrmoe 74, so disable for preview
    settings.settings.include_resizer_css = false;
    settings.settings.project_name = "Preview";
    settings.settings.show_completion_dialog_box = false;

    main(settings);
    return 1;
  } else {
    return 0;
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

export const getDocumentName = () => {
  if (app) {
    return app.activeDocument.name;
  } else {
    return "";
  }
};

export const getActiveDocumentsNames = () => {
  if (app) {
    const appDocs = app.documents;
    const docNames = [];
    for (let i = 0; i < appDocs.length; i++) {
      docNames.push(appDocs[i].name);
    }
    return docNames;
  } else {
    return "";
  }
};
