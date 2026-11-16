import { getHiddenData } from "./dataOperations";

// Filesystem path of the active document -- the same form the debug log's
// snapshots record as `source`.
export function getDocPath() {
  return app.activeDocument.fullName.fsName;
}

export function createFolder(folderPath: string) {
  const folder = new Folder(folderPath);
  if (!folder.exists) {
    folder.create();
  }
  return folder;
}

// Recursively deletes a folder and all its contents
export function deleteFolderRecursive(folderPath: string) {
  const folder = new Folder(folderPath);
  folder.rename(folder.name + "_old");
  const items = folder.getFiles();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item instanceof Folder) {
      deleteFolderRecursive(item.fsName);
    } else {
      item.remove();
    }
  }
  folder.remove();
}

export function createFile(filePath: string, fileContent: string) {
  const file = new File(filePath);
  file.open("w");
  file.write(fileContent);
  file.close();
}

// true when every selected item is named `name`, e.g. one "pulse" per artboard
function selectionSharesName(
  selection: { length: number; [i: number]: { name: string } },
  name: string,
) {
  if (!name) return false;
  for (let i = 0; i < selection.length; i++) {
    if (selection[i].name != name) return false;
  }
  return true;
}

function allItemsSelected(layer: Layer) {
  let flag = true;

  for (let i = 0; i < layer.pageItems.length; i++) {
    if (!layer.pageItems[i].selected) {
      flag = false;
      break;
    }
  }

  return flag;
}

export function getSelectedItems() {
  const doc = app.activeDocument;
  let identifier = "";

  if (doc.selection.length > 1) {
    // ignore multiple selections
  }

  // text-editing selections (TextRange) have no layer; reading it throws
  // "No such element", so treat them like empty selections
  let objectLayer;
  try {
    objectLayer = doc.selection[0] && doc.selection[0].layer;
  } catch (e) {
    objectLayer = undefined;
  }

  if (!objectLayer) {
    // ignore empty selections
  } else {
    const objectLayerName = objectLayer.name;
    const tag = (/:(.*)/.exec(objectLayerName) || [])[1] || "";
    const object = doc.selection[0];
    const objectName = doc.selection[0].name;

    if (objectLayerName) {
      const settings = getHiddenData("ai-settings") as {
        settings?: { namespace?: string };
      } | null;
      let namespace = "g-";
      // retrieve custom namespace if used
      if (settings?.settings?.namespace) {
        namespace = settings.settings.namespace;
      }

      // alert(tag + ":" + objectLayerName + ":" + objectLayer.pageItems.length + ":" + allItemsSelected(objectLayer) + ":" + objectName);

      if (tag == "snippet") {
        // g-snippet-snippetName
        const snippetName =
          (/(.*):snippet/.exec(objectLayerName) || [])[1] || "";
        identifier = `#${namespace}snippet-${snippetName}`;
      } else if (tag == "png" || tag == "png24" || tag == "webp") {
        // g-png-layer-imageName
        // trimmed, spaces as "-": same as getTaggedImageName in ai2svelte.js
        const imageName = (
          (/(.*):(?:png|webp)/.exec(objectLayerName) || [])[1] || ""
        )
          .replace(/^\s+|\s+$/g, "")
          .replace(/ +/g, "-");
        identifier = `#${namespace}${tag}-layer-${imageName}`;
      } else if (tag == "div" && (objectName || objectLayerName)) {
        // g-snippet-snippetName
        const imageName = (/(.*):div/.exec(objectLayerName) || [])[1] || "";
        // the layer wrapper has no id, only classes: <div class="g-div-layer g-name">
        if (
          allItemsSelected(objectLayer) &&
          !selectionSharesName(doc.selection, objectName)
        ) {
          identifier = `.${namespace}div-layer.${namespace}${imageName}`;
        } else if (objectName) {
          identifier = `#${namespace}div-${imageName}-${objectName}`;
        }
      } else if (tag == "symbol" && (objectName || objectLayerName)) {
        // g-snippet-snippetName
        const imageName = (/(.*):symbol/.exec(objectLayerName) || [])[1] || "";
        // the layer wrapper has no id, only classes: <div class="g-symbol-layer g-name">
        if (
          allItemsSelected(objectLayer) &&
          !selectionSharesName(doc.selection, objectName)
        ) {
          identifier = `.${namespace}symbol-layer.${namespace}${imageName}`;
        } else if (objectName) {
          identifier = `#${namespace}symbol-${imageName}-${objectName}`;
        }
      } else if (tag == "svg" && (objectName || objectLayerName)) {
        // g-svg-layerName
        const imageName = (/(.*):svg/.exec(objectLayerName) || [])[1] || "";
        if (allItemsSelected(objectLayer)) {
          identifier = `#${namespace}svg-${imageName}`;
        } else if (objectName) {
          identifier = `#${namespace}svg-${imageName} #${objectName}`;
        }
      } else if (
        (tag == "text" || tag == "htext") &&
        (objectName || objectLayerName)
      ) {
        // g-svg-layerName
        const layerName =
          (/(.*):(text|htext)/.exec(objectLayerName) || [])[1] || "";
        if (allItemsSelected(objectLayer)) {
          identifier = `.${namespace}${layerName}`;
        } else if (objectName) {
          identifier = `.${namespace}${layerName}#${namespace}${objectName}`;
        }
      } else {
        // if layer is not tagged
        // fetch identifier only for the TextFrame type items
        // or the layer itself
        // outside tagged layers, only textframe items are saved as HTML elements
        if (allItemsSelected(objectLayer)) {
          identifier = `.${namespace}${objectLayerName}`;
        } else if (objectName && object.typename == "TextFrame") {
          identifier = `#${namespace}${objectName}`;
        }
      }
    }
  }

  return identifier;
}
