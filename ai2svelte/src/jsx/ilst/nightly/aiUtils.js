// ======================================
// Illustrator specific utility functions
// ======================================

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

function parseKeyValueString(str, o) {
  var dqRxp = /^"(?:[^"\\]|\\.)*"$/;
  var parts = str.split(':');
  var k, v;
  if (parts.length > 1) {
    k = trim(parts.shift());
    v = trim(parts.join(':'));
    if (dqRxp.test(v)) {
      v = JSON.parse(v); // use JSON library to parse quoted strings
    }
    o[k] = v;
  }
}

function readFile(fpath, enc) {
  var content = null;
  var file = new File(fpath);
  if (file.exists) {
    if (enc) {
      file.encoding = enc;
    }
    file.open('r');
    if (file.error) {
      // (on macos) restricted permissions will cause an error here
      warn('Unable to open ' + file.fsName + ': [' + file.error + ']');
      return null;
    }
    content = file.read();
    file.close();
    // (on macos) 'file.length' triggers a file operation that returns -1 if unable to access file
    if (!content && (file.length > 0 || file.length == -1)) {
      warn('Unable to read from ' + file.fsName + ' (reported size: ' + file.length + ' bytes)');
    }
  } else {
    warn(fpath + ' could not be found.');
  }
  return content;
}

function readTextFile(fpath) {
  // This function used to use File#eof and File#readln(), but
  // that failed to read the last line when missing a final newline.
  return readFile(fpath, 'UTF-8') || '';
}

function saveTextFile(dest, contents) {
  var fd = new File(dest);
  fd.open('w', 'TEXT', 'TEXT');
  fd.lineFeed = 'Unix';
  fd.encoding = 'UTF-8';
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
  readFile,
  readTextFile,
  saveTextFile
};