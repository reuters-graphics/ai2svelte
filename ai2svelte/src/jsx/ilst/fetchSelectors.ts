export function fetchSelectors() {
  var activeDoc = app.activeDocument;
  var docTextFrames = activeDoc.textFrames;

  for(let i = 0; i < docTextFrames.length; i++) {
  }

  alert(docTextFrames.length);
}