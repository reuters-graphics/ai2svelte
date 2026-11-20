const sessions: Array<{ document: Document; token: number }> = [];
let nextToken = 1;

export function isDocumentOpen(doc: Document): boolean {
  try {
    for (let i = 0; i < app.documents.length; i++) {
      if (app.documents[i] === doc) return true;
    }
  } catch (error) {
    // Illustrator invalidates native references when their document closes.
    return false;
  }
  return false;
}

export function documentIdentity(doc?: Document): string {
  try {
    if (doc === undefined) doc = app.activeDocument;
    const path = String(doc.fullName.fsName);
    if (!path) return "";
    for (let i = sessions.length - 1; i >= 0; i--) {
      if (!isDocumentOpen(sessions[i].document)) sessions.splice(i, 1);
    }
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].document === doc) {
        return path + "#session-" + sessions[i].token;
      }
    }
    const token = nextToken++;
    sessions.push({ document: doc, token });
    return path + "#session-" + token;
  } catch (error) {
    return "";
  }
}
