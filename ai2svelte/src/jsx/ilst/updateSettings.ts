export function updateSettings(settingsObject: string, newSettings: string) {
  var activeDoc = app.activeDocument;
  try {
    var settingsTextFrame = activeDoc.textFrames.getByName(settingsObject);
    if (settingsTextFrame) {
      settingsTextFrame.contents = newSettings;
    }
  } catch (error) {
    return "textFrame not found";
  }
}

export function fetchSettings(settingsObject: string) {
  var activeDoc = app.activeDocument;
  var settingsTextFrame = activeDoc.textFrames.getByName(settingsObject);
  if (settingsTextFrame.paragraphs.length) {
    var t = "";
    for (var i = 0; i < settingsTextFrame.paragraphs.length; i++) {
      try {
        t += settingsTextFrame.paragraphs[i].contents;
      } catch (e) {
        // must be empty line
      }
      t += "\n";
    }
    return t;
  } else {
    return "textFrame not found";
  }
}
