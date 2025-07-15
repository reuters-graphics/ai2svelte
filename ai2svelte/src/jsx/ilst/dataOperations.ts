if ( ExternalObject.AdobeXMPScript == undefined ) {
    ExternalObject.AdobeXMPScript = new ExternalObject( "lib:AdobeXMPScript");
}

// Corrected XMP implementation
export function storeHiddenData(key, value) {
    try {
        var doc = app.activeDocument;

        var xmp = doc.XMPString;
        var xmpMeta = new XMPMeta(xmp);
        
        // Define namespace and prefix
        var namespace = "reuters-graphics";
        var prefix = "ai2svelte-companion";
        
        // Register the namespace BEFORE using it
        XMPMeta.registerNamespace(namespace, prefix);
        
        // Set the property
        xmpMeta.setProperty(namespace, key, JSON.stringify(value));
        
        // Save back to document
        doc.XMPString = xmpMeta.serialize();

        // Minimal artboard change
        var artboard = doc.artboards[0];
        var originalRect = artboard.artboardRect;
        
        // Make tiny change and revert
        artboard.artboardRect = [
            originalRect[0], 
            originalRect[1], 
            originalRect[2] + 0.001, 
            originalRect[3]
        ];
        artboard.artboardRect = originalRect;
        
        doc.save();
        
        return true;
    } catch (e) {
        $.writeln("Error storing data: " + e.message);
        return false;
    }
}

export function getHiddenData(key) {
    try {
        var doc = app.activeDocument;

        var xmp = doc.XMPString;
        var xmpMeta = new XMPMeta(xmp);
        
        var namespace = "reuters-graphics";
        var prefix = "ai2svelte-companion";
        
        // Register namespace again for reading
        XMPMeta.registerNamespace(namespace, prefix);
        
        if (xmpMeta.doesPropertyExist(namespace, key)) {
            var value = xmpMeta.getProperty(namespace, key);
            return JSON.parse(value.value);
        }
        
        return null;
    } catch (e) {
        $.writeln("Error retrieving data: " + e.message);
        return null;
    }
}