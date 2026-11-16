export function updateSettings(settingsObject: string, newSettings: string) {
  const activeDoc = app.activeDocument;
  try {
    const settingsTextFrame = activeDoc.textFrames.getByName(settingsObject);
    if (settingsTextFrame) {
      settingsTextFrame.contents = newSettings;
    }
  } catch (error) {
    return "textFrame not found";
  }
}

export function fetchSettings(settingsObject: string) {
  const activeDoc = app.activeDocument;
  const settingsTextFrame = activeDoc.textFrames.getByName(settingsObject);
  if (settingsTextFrame.paragraphs.length) {
    let t = "";
    for (let i = 0; i < settingsTextFrame.paragraphs.length; i++) {
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
