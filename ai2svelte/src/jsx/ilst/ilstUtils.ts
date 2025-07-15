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