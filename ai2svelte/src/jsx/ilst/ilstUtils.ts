import { getHiddenData } from "./dataOperations";

export function getDocPath() {
    let doc = app.activeDocument;
    let docPath = doc.path + '/';
    let docName = doc.name;
    let filePath = docPath + docName;
    return filePath;
}

export function createFolder(folderPath) {
    var folder = new Folder(folderPath);
    if (!folder.exists) {
        folder.create();
    }
    return folder;
}

export function createFile(filePath, fileContent) {
    var file = new File(filePath);
    file.open("w");
    file.write(fileContent);
    file.close();
}

function allItemsSelected(layer) {
    let flag = true;

    for(let i = 0; i < layer.pageItems.length; i++) {
        if(!layer.pageItems[i].selected) {
            flag = false;
            break;
        }
    }

    return flag;
}

export function getSelectedItems() {
    let doc = app.activeDocument;
    var identifier = '';

    if(doc.selection.length > 1) {
        // ignore multiple selections
    }

    if(doc.selection[0] == undefined) {
        // ignore empty selections
    } else {
        let objectLayer = doc.selection[0].layer;
        let objectLayerName = doc.selection[0].layer.name;
        let tag = (/:(.*)/.exec(objectLayerName) || [])[1] || "";
        let object = doc.selection[0];
        let objectName = doc.selection[0].name;
        
        if(objectLayerName) {
            var settings = getHiddenData("ai-settings");
            var namespace = "g-";
            // retrieve custom namespace if used
            if(settings?.settings?.namespace) {
                namespace = settings.settings.namespace;
            }

            // alert(tag + ":" + objectLayerName + ":" + objectLayer.pageItems.length + ":" + allItemsSelected(objectLayer) + ":" + objectName);

            if(tag == "snippet") {
                // g-snippet-snippetName
                let snippetName = (/(.*):snippet/.exec(objectLayerName) || [])[1] || "";
                identifier = `#${namespace}snippet-${snippetName}`;
            } else if(tag == "png") {
                // g-snippet-snippetName
                let imageName = (/(.*):png/.exec(objectLayerName) || [])[1] || "";
                identifier = `#${namespace}png-${imageName}`;
            } else if(tag == "div" && (objectName || objectLayerName)) {
                // g-snippet-snippetName
                let imageName = (/(.*):div/.exec(objectLayerName) || [])[1] || "";
                if(allItemsSelected(objectLayer)) {
                    identifier = `#${namespace}div-${imageName}`;
                } else if(objectName) {
                    identifier = `#${namespace}div-${imageName}-${objectName}`;
                }
            } else if(tag == "symbol" && (objectName || objectLayerName)) {
                // g-snippet-snippetName
                let imageName = (/(.*):symbol/.exec(objectLayerName) || [])[1] || "";
                if(allItemsSelected(objectLayer)) {
                    identifier = `#${namespace}symbol-${imageName}`;
                } else if(objectName) {
                    identifier = `#${namespace}symbol-${imageName}-${objectName}`;
                }
            } else if(tag == "svg" && objectName) {
                // g-snippet-snippetName
                let imageName = (/(.*):svg/.exec(objectLayerName) || [])[1] || "";
                if(allItemsSelected(objectLayer)) {
                    identifier = `#${namespace}svg-${imageName}`;
                } else {
                    identifier = `#${namespace}svg-${imageName} #${objectName}`;
                }
            } else {
                // if layer is not tagged
                // fetch identifier only for the TextFrame type items
                // or the layer itself
                // outside tagged layers, only textframe items are saved as HTML elements
                if(allItemsSelected(objectLayer)) {
                    identifier = `.${namespace}${objectLayerName}`
                } else  if(objectName && object.typename == "TextFrame") {
                    identifier = `#${objectName}`
                }
            }
        }
    }

    return identifier;
}