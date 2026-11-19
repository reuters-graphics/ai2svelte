import { updateSettings, fetchSettings } from "./updateSettings";
import {
  fetchSelectors,
  replaceTextFrames,
  revealStyledText,
} from "./fetchSelectors";
import { addSnippet } from "./addSnippet";
import { storeHiddenData, getHiddenData } from "./dataOperations";
import { main, exportProgress, finishExport } from "./ai2svelte/ai2svelte";
import {
  getDocPath,
  createFolder,
  createFile,
  getSelectedItems,
} from "./ilstUtils";
// Preview disabled until the UXP migration; see CLAUDE.md "Dormant: Preview".
// import { wrapper } from "./previewWrapper";
// (runPreview also needs deleteFolderRecursive from ./ilstUtils)

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

export const fetchDocSelectors = (showProgress = false) => {
  if (app) {
    return fetchSelectors(showProgress);
  }
};

export const replaceDocText = (
  originalText: string,
  replacementText: string,
) => {
  if (app) {
    return replaceTextFrames(originalText, replacementText);
  }
};

export const revealDocText = (originalText: string, frameIndex: number) => {
  if (app) {
    return revealStyledText(originalText, frameIndex);
  }
};

export const addSnippetLayer = () => {
  if (app) {
    return addSnippet();
  }
};

export const setVariable = (key: string, value: unknown) => {
  if (app) {
    return storeHiddenData(key, value);
  }
};

export const getVariable = (key: string) => {
  if (app) {
    return getHiddenData(key);
  }
};

export const runAi2Svelte = (settings: Record<string, unknown>) => {
  if (app) {
    return main(settings);
  }
};

// Image post-processing progress for a runAi2Svelte({ deferCompletion: true })
// export, then its progress bar close and completion alert.
export const updateExportProgress = (
  done: number,
  total: number,
  title: string,
) => {
  if (app) exportProgress(done, total, title);
};

export const finishAi2Svelte = (summary: {
  converted?: number;
  dropped?: number;
  failed?: number;
  keptAsPng?: number;
}) => {
  if (app) finishExport(summary);
};

// Runs before each export (panel debug log). Saves unsaved edits first --
// ai2svelte already saves after a successful export, this just moves it
// earlier so a failed export still leaves an exact copy -- then copies the
// file to pathPrefix + doc name. Same save options as main()'s save.
export const saveAndSnapshotDocument = (pathPrefix: string) => {
  if (app) {
    const doc = app.activeDocument;
    const hadUnsavedEdits = !doc.saved;
    // only native .ai: saveAs on a .pdf/.eps would overwrite it with an AI file
    if (
      hadUnsavedEdits &&
      String(doc.path) &&
      String(doc.name).toLowerCase().slice(-3) === ".ai"
    ) {
      const saveOptions = new IllustratorSaveOptions();
      // @ts-expect-error -- types-for-adobe wrongly declares pdfCompatible static; it is an instance property
      saveOptions.pdfCompatible = false;
      doc.saveAs(new File(doc.path + "/" + doc.name), saveOptions);
    }
    const dest = pathPrefix + doc.name;
    const copied = doc.fullName.copy(dest);
    // names only, for the debug log's export summary
    const artboards: string[] = [];
    for (let i = 0; i < doc.artboards.length; i++)
      artboards.push(doc.artboards[i].name);
    const layers: string[] = [];
    for (let i = 0; i < doc.layers.length; i++) layers.push(doc.layers[i].name);
    return {
      path: copied ? dest : "",
      saved: doc.saved, // false only if the save above didn't happen
      hadUnsavedEdits: hadUnsavedEdits,
      name: doc.name,
      source: doc.fullName.fsName,
      artboards: artboards,
      layers: layers,
    };
  }
};

// export const runPreview = (settings: any, path: string) => {
//   if (app) {
//     // rename existing preview folder to preview_old and delete it
//     // rename to avoid clashes with the creation of new preview folder
//     deleteFolderRecursive(path);
//
//     // create new preview folder
//     createFolder(path);
//     makeFile(path + "previewWrapper.js", wrapper);
//
//     settings.settings.isPreview = "true";
//     settings.settings.html_output_path = path;
//     settings.settings.image_output_path = path;
//     settings.settings.image_source_path = "";
//     // container queries are not supported in Chrmoe 74, so disable for preview
//     settings.settings.include_resizer_css = false;
//     settings.settings.project_name = "Preview";
//     settings.settings.show_completion_dialog_box = false;
//
//     main(settings);
//     return 1;
//   } else {
//     return 0;
//   }
// };

export const getFilePath = () => {
  if (app) {
    return getDocPath();
  }
};

export const makeFolder = (path: string) => {
  if (app) {
    return createFolder(path);
  }
};

export const makeFile = (path: string, content: string) => {
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
