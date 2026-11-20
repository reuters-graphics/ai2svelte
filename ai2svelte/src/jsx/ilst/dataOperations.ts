import { parseStoredJson } from "../../shared/storedJson";

if (ExternalObject.AdobeXMPScript == undefined) {
  ExternalObject.AdobeXMPScript = new ExternalObject("lib:AdobeXMPScript");
}

// Close an XMP file without letting a failed close mask the original error.
function closeQuietly(f: XMPFileInstance | null) {
  if (!f) return;
  try {
    f.closeFile();
  } catch (e) {
    // already closed or never opened
  }
}

// Corrected XMP implementation
export function storeHiddenData(
  key: string,
  value: unknown,
  doc = app.activeDocument,
) {
  let xmpFile: XMPFileInstance | null = null;
  let readBack: XMPFileInstance | null = null;
  try {
    // Load AdobeXMPScript if not already loaded
    if (ExternalObject.AdobeXMPScript === undefined) {
      ExternalObject.AdobeXMPScript = new ExternalObject("lib:AdobeXMPScript");
    }

    const filePath = doc.fullName.fsName; // Full path to the .ai file

    // Open the file for update
    xmpFile = new XMPFile(
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
    xmpFile = null;

    // Illustrator keeps the XMP it read at open time and writes it back on
    // the next save, wiping what we just wrote to disk. Mirror it in memory.
    readBack = new XMPFile(
      filePath,
      XMPConst!.UNKNOWN,
      XMPConst!.OPEN_FOR_READ,
    );
    doc.XMPString = readBack.getXMP().serialize();

    return true;
  } catch (e) {
    $.writeln("Error storing data: " + (e as Error).description);
    return false;
  } finally {
    closeQuietly(xmpFile);
    closeQuietly(readBack);
  }
}

export function getHiddenData(
  key: string,
  strict = false,
  doc = app.activeDocument,
) {
  let raw: string | null = null;
  let xmpFile: XMPFileInstance | null = null;
  try {
    // Load AdobeXMPScript if not already loaded
    if (ExternalObject.AdobeXMPScript === undefined) {
      ExternalObject.AdobeXMPScript = new ExternalObject("lib:AdobeXMPScript");
    }

    const filePath = doc.fullName.fsName; // Full path to the .ai file

    // Open the file for reading
    xmpFile = new XMPFile(filePath, XMPConst!.UNKNOWN, XMPConst!.OPEN_FOR_READ);
    const xmpMeta = xmpFile.getXMP();

    const namespace = "reuters-graphics";
    const prefix = "ai2svelte-companion";

    // Register namespace if needed
    if (!XMPMeta!.getNamespacePrefix(namespace)) {
      XMPMeta!.registerNamespace(namespace, prefix);
    }

    // Check and retrieve the property
    if (xmpMeta && xmpMeta.doesPropertyExist(namespace, key)) {
      raw = xmpMeta.getProperty(namespace, key).value;
    }
  } catch (e) {
    $.writeln("Error retrieving data: " + (e as Error).description);
    if (strict) throw e;
    return {};
  } finally {
    closeQuietly(xmpFile);
  }

  return parseStoredJson(raw);
}
