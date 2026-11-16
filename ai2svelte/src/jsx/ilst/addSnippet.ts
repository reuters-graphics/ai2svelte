export function addSnippet(layerName: string = "snippet") {
  try {
    if (app.documents.length === 0) {
      alert("Please open a document first.");
      return;
    }

    const doc = app.activeDocument;

    // Get current viewport bounds
    const viewBounds = doc.activeView.bounds;
    const viewLeft = viewBounds[0];
    const viewTop = viewBounds[1];
    const viewRight = viewBounds[2];
    const viewBottom = viewBounds[3];

    // Calculate viewport center
    const viewCenterX = viewLeft + (viewRight - viewLeft) / 2;
    const viewCenterY = viewTop + (viewBottom - viewTop) / 2;

    // Rectangle dimensions
    const rectWidth = 200;
    const rectHeight = 200;

    // Calculate rectangle position (centered on viewport)
    const rectX = viewCenterX - rectWidth / 2;
    const rectY = viewCenterY - rectHeight / 2;

    // Create new layer
    alert("here");
    const newLayer = doc.layers.add();
    newLayer.name = layerName;
    doc.activeLayer = newLayer;

    // Create rectangular selection
    const rectBounds = [rectX, rectY, rectX + rectWidth, rectY + rectHeight];
    alert(rectBounds.join("////"));
    const rect = doc.pathItems.rectangle(
      rectBounds[1],
      rectBounds[0],
      rectWidth,
      rectHeight,
    );

    const accentColor = new RGBColor();
    accentColor.red = 220;
    accentColor.green = 67;
    accentColor.blue = 0;

    rect.fillColor = accentColor;
  } catch (error) {
    alert("Error: " + (error as Error).description);
  }
}
