export function fetchSelectors() {
  const activeDoc = app.activeDocument;
  const docTextFrames = activeDoc.textFrames;

  alert(String(docTextFrames.length));
}
