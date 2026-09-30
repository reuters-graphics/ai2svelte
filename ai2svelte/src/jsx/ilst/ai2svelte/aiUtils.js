// ======================================
// Illustrator specific utility functions
// ======================================

// Remove whitespace from beginning and end of a string
function trim(s) {
  return s.replace(/^[\s\uFEFF\xA0\x03]+|[\s\uFEFF\xA0\x03]+$/g, "");
}

// a, b: coordinate arrays, as from <PathItem>.geometricBounds
function testBoundsIntersection(a, b) {
  return a[2] >= b[0] && b[2] >= a[0] && a[3] <= b[1] && b[3] <= a[1];
}

function shiftBounds(bnds, dx, dy) {
  return [bnds[0] + dx, bnds[1] + dy, bnds[2] + dx, bnds[3] + dy];
}

function clearMatrixShift(m) {
  return app.concatenateTranslationMatrix(m, -m.mValueTX, -m.mValueTY);
}

function folderExists(path) {
  return new Folder(path).exists;
}

function fileExists(path) {
  return new File(path).exists;
}

function deleteFile(path) {
  var file = new File(path);
  if (file.exists) {
    file.remove();
  }
}

// Note: ExtendScript's regex engine mishandles alternation inside a repeated
// group, e.g. /(?:a|b)+/ matches one character at a time, so quotes are
// handled with plain string checks here instead of regexes.
function parseKeyValueString(str, o) {
  var parts = str.split(":");
  var k, v;
  if (parts.length > 1) {
    k = trim(parts.shift());
    v = trim(parts.join(":"));
    if (v.length > 1 && v.charAt(0) == '"' && v.charAt(v.length - 1) == '"') {
      try {
        v = JSON.parse(v); // use JSON library to parse quoted strings
      } catch (e) {
        v = v.slice(1, -1); // e.g. invalid escape: keep the text, drop the quotes
      }
    }
    o[k] = v;
  }
}

// Extract key: value pairs from the contents of a note attribute.
// Pairs are separated by newlines, ";" or ","; separators inside
// double quotes are kept, e.g. tags: "a, b"
function parseDataAttributes(note) {
  var o = {};
  var parts = [];
  var part = "";
  var quoteStart = -1; // index in note of the open quote, if inside one
  var c;
  note = note || "";
  for (var i = 0; i < note.length; i++) {
    c = note.charAt(i);
    if (quoteStart > -1 && c == "\\") {
      part += c + note.charAt(++i); // keep escaped char, e.g. \"
    } else if (c == '"') {
      quoteStart = quoteStart > -1 ? -1 : i;
      part += c;
    } else if (quoteStart == -1 && /[\r\n;,]/.test(c)) {
      parts.push(part);
      part = "";
    } else {
      part += c;
    }
  }
  if (quoteStart > -1) {
    // unclosed quote: split the rest as if it were plain text
    parts = parts.concat(part.split(/[\r\n;,]/));
  } else {
    parts.push(part);
  }
  for (var j = 0; j < parts.length; j++) {
    parseKeyValueString(parts[j], o);
  }
  return o;
}

function readFile(fpath, enc) {
  var content = null;
  var file = new File(fpath);
  if (file.exists) {
    if (enc) {
      file.encoding = enc;
    }
    file.open("r");
    if (file.error) {
      // (on macos) restricted permissions will cause an error here
      warn("Unable to open " + file.fsName + ": [" + file.error + "]");
      return null;
    }
    content = file.read();
    file.close();
    // (on macos) 'file.length' triggers a file operation that returns -1 if unable to access file
    if (!content && (file.length > 0 || file.length == -1)) {
      warn(
        "Unable to read from " +
          file.fsName +
          " (reported size: " +
          file.length +
          " bytes)",
      );
    }
  } else {
    warn(fpath + " could not be found.");
  }
  return content;
}

function readTextFile(fpath) {
  // This function used to use File#eof and File#readln(), but
  // that failed to read the last line when missing a final newline.
  return readFile(fpath, "UTF-8") || "";
}

function saveTextFile(dest, contents) {
  var fd = new File(dest);
  fd.open("w", "TEXT", "TEXT");
  fd.lineFeed = "Unix";
  fd.encoding = "UTF-8";
  fd.writeln(contents);
  fd.close();
}

export {
  testBoundsIntersection,
  shiftBounds,
  clearMatrixShift,
  folderExists,
  fileExists,
  deleteFile,
  parseKeyValueString,
  parseDataAttributes,
  readFile,
  readTextFile,
  saveTextFile,
};
