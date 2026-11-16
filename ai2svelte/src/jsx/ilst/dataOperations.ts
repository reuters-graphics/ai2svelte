if (ExternalObject.AdobeXMPScript == undefined) {
  ExternalObject.AdobeXMPScript = new ExternalObject("lib:AdobeXMPScript");
}

// Corrected XMP implementation
export function storeHiddenData(key: string, value: unknown) {
  try {
    // Load AdobeXMPScript if not already loaded
    if (ExternalObject.AdobeXMPScript === undefined) {
      ExternalObject.AdobeXMPScript = new ExternalObject("lib:AdobeXMPScript");
    }

    const doc = app.activeDocument;
    const filePath = doc.fullName.fsName; // Full path to the .ai file

    // Open the file for update
    const xmpFile = new XMPFile(
      filePath,
      XMPConst!.UNKNOWN,
      XMPConst!.OPEN_FOR_UPDATE,
    );
    const xmpMeta = xmpFile.getXMP(); // Get current metadata

    // Define namespace and prefix
    const namespace = "reuters-graphics";
    const prefix = "ai2svelte-companion";

    // Register namespace if needed
    if (!XMPMeta!.getNamespacePrefix(namespace)) {
      XMPMeta!.registerNamespace(namespace, prefix);
    }

    // Set the property
    xmpMeta.setProperty(namespace, key, JSON.stringify(value));

    // Write metadata back to file
    xmpFile.putXMP(xmpMeta);
    xmpFile.closeFile(XMPConst!.CLOSE_UPDATE_SAFELY);

    // Illustrator keeps the XMP it read at open time and writes it back on
    // the next save, wiping what we just wrote to disk. Mirror it in memory.
    const readBack = new XMPFile(
      filePath,
      XMPConst!.UNKNOWN,
      XMPConst!.OPEN_FOR_READ,
    );
    doc.XMPString = readBack.getXMP().serialize();
    readBack.closeFile();

    return true;
  } catch (e) {
    $.writeln("Error storing data: " + (e as Error).description);
    return false;
  }
}

export function getHiddenData(key: string) {
  try {
    // Load AdobeXMPScript if not already loaded
    if (ExternalObject.AdobeXMPScript === undefined) {
      ExternalObject.AdobeXMPScript = new ExternalObject("lib:AdobeXMPScript");
    }

    const doc = app.activeDocument;
    const filePath = doc.fullName.fsName; // Full path to the .ai file

    // Open the file for reading
    const xmpFile = new XMPFile(
      filePath,
      XMPConst!.UNKNOWN,
      XMPConst!.OPEN_FOR_READ,
    );
    const xmpMeta = xmpFile.getXMP();

    const namespace = "reuters-graphics";
    const prefix = "ai2svelte-companion";

    // Register namespace if needed
    if (!XMPMeta!.getNamespacePrefix(namespace)) {
      XMPMeta!.registerNamespace(namespace, prefix);
    }

    // Check and retrieve the property
    if (xmpMeta && xmpMeta.doesPropertyExist(namespace, key)) {
      const value = xmpMeta.getProperty(namespace, key);
      xmpFile.closeFile(); // Close after reading
      return JSON.parse(value.value);
    }

    xmpFile.closeFile(); // Close even if not found
    return {};
  } catch (e) {
    $.writeln("Error retrieving data: " + (e as Error).description);
    return {};
  }
}
