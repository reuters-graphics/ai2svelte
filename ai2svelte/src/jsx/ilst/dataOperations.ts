if (ExternalObject.AdobeXMPScript == undefined) {
  ExternalObject.AdobeXMPScript = new ExternalObject("lib:AdobeXMPScript");
}

// Corrected XMP implementation
export function storeHiddenData(key, value) {
  try {
    // Load AdobeXMPScript if not already loaded
    if (ExternalObject.AdobeXMPScript === undefined) {
      ExternalObject.AdobeXMPScript = new ExternalObject("lib:AdobeXMPScript");
    }

    var doc = app.activeDocument;
    var filePath = doc.fullName.fsName; // Full path to the .ai file

    // Open the file for update
    var xmpFile = new XMPFile(
      filePath,
      XMPConst.UNKNOWN,
      XMPConst.OPEN_FOR_UPDATE
    );
    var xmpMeta = xmpFile.getXMP(); // Get current metadata

    // Define namespace and prefix
    var namespace = "reuters-graphics";
    var prefix = "ai2svelte-companion";

    // Register namespace if needed
    if (!XMPMeta.getNamespacePrefix(namespace)) {
      XMPMeta.registerNamespace(namespace, prefix);
    }

    // Set the property
    xmpMeta.setProperty(namespace, key, JSON.stringify(value));

    // Write metadata back to file
    xmpFile.putXMP(xmpMeta);
    xmpFile.closeFile(XMPConst.CLOSE_UPDATE_SAFELY);

    return true;
  } catch (e) {
    $.writeln("Error storing data: " + e.message);
    return false;
  }
}

export function getHiddenData(key) {
  try {
    // Load AdobeXMPScript if not already loaded
    if (ExternalObject.AdobeXMPScript === undefined) {
      ExternalObject.AdobeXMPScript = new ExternalObject("lib:AdobeXMPScript");
    }

    var doc = app.activeDocument;
    var filePath = doc.fullName.fsName; // Full path to the .ai file

    // Open the file for reading
    var xmpFile = new XMPFile(
      filePath,
      XMPConst.UNKNOWN,
      XMPConst.OPEN_FOR_READ
    );
    var xmpMeta = xmpFile.getXMP();

    var namespace = "reuters-graphics";
    var prefix = "ai2svelte-companion";

    // Register namespace if needed
    if (!XMPMeta.getNamespacePrefix(namespace)) {
      XMPMeta.registerNamespace(namespace, prefix);
    }

    // Check and retrieve the property
    if (xmpMeta && xmpMeta.doesPropertyExist(namespace, key)) {
      var value = xmpMeta.getProperty(namespace, key);
      xmpFile.closeFile(); // Close after reading
      return JSON.parse(value.value);
    }

    xmpFile.closeFile(); // Close even if not found
    return {};
  } catch (e) {
    $.writeln("Error retrieving data: " + e.message);
    return {};
  }
}
