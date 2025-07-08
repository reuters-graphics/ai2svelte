if ( ExternalObject.AdobeXMPScript == undefined ) {
    ExternalObject.AdobeXMPScript = new ExternalObject( "lib:AdobeXMPScript");
}

// Corrected XMP implementation
export function storeHiddenData(key, value) {
    try {
        var xmp = app.activeDocument.XMPString;
        var xmpMeta = new XMPMeta(xmp);
        
        // Define namespace and prefix
        var namespace = "http://yourcompany.com/yourplugin/1.0/";
        var prefix = "yourplugin";
        
        // Register the namespace BEFORE using it
        XMPMeta.registerNamespace(namespace, prefix);
        
        // Set the property
        xmpMeta.setProperty(namespace, key, JSON.stringify(value));
        
        // Save back to document
        app.activeDocument.XMPString = xmpMeta.serialize();
        
        return true;
    } catch (e) {
        $.writeln("Error storing data: " + e.message);
        return false;
    }
}

export function getHiddenData(key) {
    try {
        var xmp = app.activeDocument.XMPString;
        var xmpMeta = new XMPMeta(xmp);
        
        var namespace = "http://yourcompany.com/yourplugin/1.0/";
        var prefix = "yourplugin";
        
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