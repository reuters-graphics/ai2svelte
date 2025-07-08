export function addSnippet(layerName: string = "snippet") {
    try {
        if (app.documents.length === 0) {
            alert("Please open a document first.");
            return;
        }
        
        var doc = app.activeDocument;
        
        // Get current viewport bounds
        var viewBounds = doc.activeView.bounds;
        var viewLeft = viewBounds[0];
        var viewTop = viewBounds[1];
        var viewRight = viewBounds[2];
        var viewBottom = viewBounds[3];

        // Calculate viewport center
        var viewCenterX = viewLeft + (viewRight - viewLeft) / 2;
        var viewCenterY = viewTop + (viewBottom - viewTop) / 2;
        
        // Rectangle dimensions
        var rectWidth = 200;
        var rectHeight = 200;
        
        // Calculate rectangle position (centered on viewport)
        var rectX = viewCenterX - rectWidth / 2;
        var rectY = viewCenterY - rectHeight / 2;
        
        // Create new layer
        alert('here');
        var newLayer = doc.layers.add();
        newLayer.name = layerName;
        doc.activeLayer = newLayer;
        
        // Create rectangular selection
        var rectBounds = [rectX, rectY, rectX + rectWidth, rectY + rectHeight];
        alert(rectBounds.join('////'));
        var rect = doc.pathItems.rectangle(
            rectBounds[1],
            rectBounds[0],
            rectWidth,
            rectHeight
        );

        var accentColor = new RGBColor();
        accentColor.red = 220;
        accentColor.green = 67;
        accentColor.blue = 0;

        rect.fillColor = accentColor;
        
    } catch (error) {
        alert("Error: " + error.message);
    }
}