// ai2html is a script for Adobe Illustrator that converts your Illustrator document into html and css.
// Copyright (c) 2011-2018 The New York Times Company
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this library except in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// =====================================
// How to install ai2html
// =====================================

// - Move the ai2html.js file into the Illustrator folder where scripts are located.
// - For example, on Mac OS X running Adobe Illustrator CC 2014, the path would be: // Adobe Illustrator CC 2014/Presets/en_US/Scripts/ai2html.jsx

// =====================================
// How to use ai2html
// =====================================

// - Create your Illustrator artwork.
// - Size the artboard to the dimensions that you want the div to appear on the web page.
// - Make sure your Document Color Mode is set to RGB.
// - Use Arial or Georgia unless you have added your own fonts to the fonts array in the script.
// - Run the script by choosing: File > Scripts > ai2html
// - Go to the folder containing your Illustrator file. Inside will be a folder called ai2html-output.
// - Open the html files in your browser to preview your output.

// These are base settings used in the script
import { defaultSettings, placeholderSettings } from "./settings";

import {
  caps,
  align,
  blendModes,
  cssTextStyleProperties,
  cssPrecision,
} from "./cssStyles";

// import { cropSVG } from "./cropSVG";

import {
  testBoundsIntersection,
  shiftBounds,
  clearMatrixShift,
  folderExists,
  deleteFile,
  parseKeyValueString,
  readFile,
  saveTextFile,
} from "./aiUtils";

import {
  forEach,
  map,
  filter,
  indexOf,
  find,
  contains,
  some,
  extend,
  objectDiff,
  arraySubtract,
  toArray,
  firstBy,
  trim,
  stringToLines,
  zeroPad,
  truncateString,
  makeKeyword,
  encodeHtmlEntities,
  cleanHtmlText,
  straightenCurlyQuotesInsideAngleBrackets,
  straightenCurlyQuotes,
  findHtmlTag,
  addEnclosingTag,
  stripTag,
  roundTo,
  getDateTimeStamp,
  formatCssRule,
  getCssColor,
  testSimilarBounds,
  applyTemplate,
  pathJoin,
  pathSplit,
} from "./utils";

export function main(settingsArg) {
  // Enclosing scripts in a named function (and not an anonymous, self-executing
  // function) has been recommended as a way to minimise intermittent "MRAP" errors.
  // (This advice may be superstitious, need more evidence to decide.)
  // See (for example) https://forums.adobe.com/thread/1810764 and
  // http://wwwimages.adobe.com/content/dam/Adobe/en/devnet/pdf/illustrator/scripting/Readme.txt

  // How to update the version number:
  // - Increment middle digit for new functionality or breaking changes
  //      or increment final digit for simple bug fixes or other minor changes.
  // - Update the version number in package.json
  // - Add an entry to CHANGELOG.md
  // - Run 'npm publish' to create a new GitHub release
  const scriptVersion = "0.123.1";

  // ================================
  // Global variable declarations
  // ================================
  // This can be overridden by settings
  var nameSpace = "g-";

  // vars to hold warnings and informational messages at the end
  let feedback = [];
  let warnings = [];
  let errors = [];
  let oneTimeWarnings = [];
  let startTime = +new Date();

  let textFramesToUnhide = [];
  let objectsToRelock = [];
  let previewImageImports = [];

  let docSettings;
  let textBlockData;
  let doc, docPath, docSlug, docIsSaved;
  let progressBar;
  let JSON;
  let fontsConfig;
  let missingFontFamilies = [];

  initJSON();

  // Simple interface to help find performance bottlenecks. Usage:
  // T.start('<label>');
  // ...
  // T.stop('<label>'); // prints a message in the final popup window
  //
  var T = {
    times: {},
    start: function (key) {
      if (key in T.times) return;
      T.times[key] = +new Date();
    },
    stop: function (key) {
      var startTime = T.times[key];
      var elapsed = roundTo((+new Date() - startTime) / 1000, 1);
      delete T.times[key];
      message(key + " - " + elapsed + "s");
    },
  };

  // If running in Node.js, export functions for testing and exit
  if (runningInNode()) {
    exportFunctionsForTesting();
    return;
  }

  try {
    if (!isTestedIllustratorVersion(app.version)) {
      warn("ai2svelte has not been tested on this version of Illustrator.");
    }
    if (!app.documents.length) {
      error("No documents are open");
    }

    if (!String(app.activeDocument.fullName)) {
      error(
        "ai2svelte is unable to run because Illustrator is confused by this document's file path." +
          " Does the path contain any forward slashes or other unusual characters?"
      );
    }
    if (!String(app.activeDocument.path)) {
      error(
        "You need to save your Illustrator file before running this script"
      );
    }
    if (app.activeDocument.documentColorSpace != DocumentColorSpace.RGB) {
      error(
        'You should change the document color mode to "RGB" before running ai2svelte (File>Document Color Mode>RGB Color).'
      );
    }
    if (app.activeDocument.activeLayer.name == "Isolation Mode") {
      error(
        "ai2svelte is unable to run because the document is in Isolation Mode."
      );
    }
    if (
      app.activeDocument.activeLayer.name == "<Opacity Mask>" &&
      app.activeDocument.layers.length == 1
    ) {
      // TODO: find a better way to detect this condition (mask can be renamed)
      error(
        "ai2svelte is unable to run because you are editing an Opacity Mask."
      );
    }

    // initialize script settings
    doc = app.activeDocument;
    docPath = doc.path + "/";
    docIsSaved = doc.saved;

    textBlockData = initSettings(settingsArg);

    docSettings = initDocumentSettings(textBlockData.settings); // refer to settings.json for arg
    docSlug =
      docSettings.project_name || makeDocumentSlug(getRawDocumentName());
    nameSpace = docSettings.namespace || nameSpace;

    progressBar = new ProgressBar({
      name: "ai2svelte progress",
      steps: calcProgressBarSteps(),
    });
    validateArtboardNames(docSettings); // warn about duplicate artboard names

    // textBlockData.code can be an Object of various langs (html, css, js) to be added to the final output
    renderDocument(docSettings, textBlockData.code);
  } catch (e) {
    errors.push(formatError(e));
  }

  restoreDocumentState();
  if (progressBar) progressBar.close();

  // ==========================================
  // Save the AI document (if needed)
  // ==========================================

  if (docIsSaved) {
    // If document was originally in a saved state, reset the document's
    // saved flag (the document goes to unsaved state during the script,
    // because of unlocking / relocking of objects
    doc.saved = true;
  } else if (errors.length === 0 && !docSettings.isPreview) {
    var saveOptions = new IllustratorSaveOptions();
    saveOptions.pdfCompatible = false;
    doc.saveAs(new File(docPath + doc.name), saveOptions);
    // doc.save(); // why not do this? (why set pdfCompatible = false?)
    message("Your Illustrator file was saved.");
  }

  // =========================================================
  // Show alert box, optionally prompt to generate promo image
  // =========================================================
  if (errors.length > 0) {
    showCompletionAlert();
  } else if (isTrue(docSettings.show_completion_dialog_box)) {
    message(
      "Script ran in",
      ((+new Date() - startTime) / 1000).toFixed(1),
      "seconds"
    );
    showCompletionAlert();
  }

  doc.selection = null;
  return missingFontFamilies;

  // =================================
  // ai2svelte render function
  // =================================

  function renderDocument(settings, textBlockContent) {
    // Fix for issue #50
    // If a text range is selected when the script runs, it interferes
    // with script-driven selection. The fix is to clear this kind of selection.
    if (doc.selection && doc.selection.typename) {
      clearSelection();
    }

    // set fontsConfig object
    fontsConfig = textBlockContent.fontsConfig;

    unlockObjects(); // Unlock containers and clipping masks
    var masks = findMasks(); // identify all clipping masks and their contents
    var groups = groupArtboardsForOutput(settings);
    if (groups.length === 0) {
      error("No usable artboards were found");
    }

    forEach(groups, function (group) {
      // TODO: consider if we want to add custom text block code to
      // each output file. CSS and possibly JS could possibly be added to just one
      // file.s=
      renderArtboardGroup(group, masks, settings, textBlockContent);
    });

    //=====================================
    // Post-output operations
    //=====================================
    if (doc.selection && doc.selection.typename) {
      clearSelection();
      doc.selection = null;
    }
  }

  // render a group of artboards and save to a file
  function renderArtboardGroup(group, masks, settings, textBlockContent) {
    var output = { html: "", js: "", css: "" };

    forEach(group.artboards, function (activeArtboard) {
      var abIndex = findArtboardIndex(activeArtboard);
      var abSettings = getArtboardSettings(activeArtboard);
      var docArtboardName = getDocumentArtboardName(activeArtboard);
      var textFrames, textData, imageData;

      doc.artboards.setActiveArtboardIndex(abIndex);

      // ========================
      // Convert text objects
      // ========================

      if (abSettings.image_only || settings.render_text_as == "image") {
        // don't convert text objects to HTML
        textFrames = [];
        textData = { html: "", styles: [] };
      } else {
        progressBar.setTitle(docArtboardName + ": Generating text...");
        textFrames = getTextFramesByArtboard(activeArtboard, masks, settings);
        textData = convertTextFrames(textFrames, activeArtboard, settings);
      }

      progressBar.step();

      // ==========================
      // Generate artboard image(s)
      // ==========================

      // capture artboard image
      // processes svg, div, png tagged layers
      if (isTrue(settings.write_image_files)) {
        progressBar.setTitle(docArtboardName + ": Capturing image...");
        imageData = convertArtItems(
          activeArtboard,
          textFrames,
          masks,
          settings
        );
      } else {
        imageData = { html: "" };
      }

      progressBar.step();

      //=====================================
      // Finish generating artboard HTML and CSS
      //=====================================

      output.html +=
        "\t<!-- Artboard: " +
        getArtboardName(activeArtboard) +
        " -->\r" +
        generateArtboardDiv(activeArtboard, group, settings) +
        imageData.html +
        textData.html +
        "\t</div>\r";

      if (!settings.include_resizer_css) {
        output.html += "{/if}";
      }

      var abStyles = textData.styles;

      output.css += generateArtboardCss(
        activeArtboard,
        group,
        abStyles,
        settings
      );
    }); // end artboard loop

    //=====================================
    // Output html file
    //=====================================

    addTextBlockContent(output, textBlockContent);
    generateOutputHtml(output, group, settings);
  } // end render()

  // =====================================
  // ai2svelte specific utility functions
  // =====================================

  function checkForOutputFolder(folderPath, nickname) {
    var outputFolder = new Folder(folderPath);
    if (!outputFolder.exists) {
      var outputFolderCreated = outputFolder.create();
      if (outputFolderCreated) {
        message(
          "The " +
            nickname +
            " folder did not exist, so the folder was created."
        );
      } else {
        warn(
          "The " + nickname + " folder did not exist and could not be created."
        );
      }
    }
  }

  function calcProgressBarSteps() {
    var n = 0;
    forEachUsableArtboard(function () {
      n += 2;
    });
    return n;
  }

  function formatError(e) {
    var msg;
    if (e.name == "UserError") return e.message; // triggered by error() function
    msg = "RuntimeError";
    if (e.line) msg += " on line " + e.line;
    if (e.message) msg += ": " + e.message;
    return msg;
  }

  // display debugging message in completion alert box
  // (in debug mode)
  function message() {
    feedback.push(concatMessages(arguments));
  }

  function concatMessages(args) {
    var msg = "",
      arg;
    for (var i = 0; i < args.length; i++) {
      arg = args[i];
      if (msg.length > 0) msg += " ";
      if (typeof arg == "object") {
        try {
          // json2.json implementation throws error if object contains a cycle
          // and many Illustrator objects have cycles.
          msg += JSON.stringify(arg, function (k, v) {
            if (v === Infinity) return "Infinity";
            if (v === -Infinity) return "-Infinity";
            if (v != v) return "NaN";
            return v;
          });
        } catch (e) {
          msg += String(arg);
          msg += String(e);
        }
      } else {
        msg += arg;
      }
    }
    return msg;
  }

  function warn(msg) {
    warnings.push(msg);
  }

  function error(msg) {
    var e = new Error(msg);
    e.name = "UserError";
    throw e;
  }

  // id: optional identifier, for cases when the text for this type of warning may vary.
  function warnOnce(msg, id) {
    id = id || msg;
    if (!contains(oneTimeWarnings, id)) {
      warn(msg);
      oneTimeWarnings.push(id);
    }
  }

  // accept inconsistent true/yes setting value
  function isTrue(val) {
    return val == "true" || val == "yes" || val === true;
  }

  // accept inconsistent false/no setting value
  function isFalse(val) {
    return val == "false" || val == "no" || val === false;
  }

  function unlockObjects() {
    forEach(doc.layers, unlockContainer);
  }

  function unlockObject(obj) {
    obj.locked = false;
    objectsToRelock.push(obj);
  }

  // Unlock a layer or group if visible and locked, as well as any locked and visible
  // clipping masks
  // unlocks every single thing in the ai doc
  // o: GroupItem or Layer
  function unlockContainer(o) {
    const type = o.typename;
    let i, item, pathCount;
    if (o.hidden === true || o.visible === false) return;
    if (o.locked) {
      unlockObject(o);
    }

    // unlock locked clipping paths (so contents can be selected later)
    // optimization: Layers containing hundreds or thousands of paths are unlikely
    //    to contain a clipping mask and are slow to scan -- skip these
    pathCount = o.pathItems.length;
    if (
      (type == "Layer" && pathCount < 500) ||
      (type == "GroupItem" && o.clipped)
    ) {
      for (i = 0; i < pathCount; i++) {
        item = o.pathItems[i];
        if (!item.hidden && item.clipping && item.locked) {
          unlockObject(item);
          break;
        }
      }
    }

    // recursively unlock sub-layers and groups
    forEach(o.groupItems, unlockContainer);
    if (o.typename == "Layer") {
      forEach(o.layers, unlockContainer);
    }
  }

  // ==================================
  // ai2svelte program state and settings
  // ==================================

  function runningInNode() {
    return typeof module != "undefined" && !!module.exports;
  }

  // Add internal functions to module.exports for testing in Node.js
  function exportFunctionsForTesting() {
    [
      testBoundsIntersection,
      trim,
      stringToLines,
      contains,
      arraySubtract,
      firstBy,
      zeroPad,
      roundTo,
      pathJoin,
      pathSplit,
      folderExists,
      formatCss,
      getCssColor,
      applyTemplate,
      cleanHtmlText,
      encodeHtmlEntities,
      addEnclosingTag,
      stripTag,
      cleanCodeBlock,
      findHtmlTag,
      cleanHtmlTags,
      parseDataAttributes,
      parseObjectName,
      cleanObjectName,
      // initDocumentSettings,
      uniqAssetName,
      replaceSvgIds,
      compareVersions,
    ].forEach(function (f) {
      module.exports[f.name] = f;
    });
  }

  function isTestedIllustratorVersion(version) {
    var majorNum = parseInt(version);
    return majorNum >= 18 && majorNum <= 29; // Illustrator CC 2014 through 2025
  }

  function groupArtboardsForOutput(settings) {
    var groups = [];
    forEachUsableArtboard(function (ab) {
      var group, groupName;
      if (settings.output == "one-file") {
        // single-file output: artboards share a single group
        groupName = getRawDocumentName();
        group = groups[0];
      } else {
        // multiple-file output: artboards are grouped by name
        groupName = getDocumentArtboardName(ab);
        group = find(groups, function (o) {
          o.name == groupName;
        });
      }
      if (!group) {
        group = {
          groupName: groupName,
          artboards: [],
        };
        groups.push(group);
      }
      group.artboards.push(ab);
    });

    return groups;
  }

  // warn about duplicate artboard names
  function validateArtboardNames(settings) {
    var names = [];
    forEachUsableArtboard(function (ab) {
      var name = getArtboardName(ab);
      var isDupe = contains(names, name);
      if (isDupe) {
        // kludge: modify settings if same-name artboards are found
        // (used to prevent duplicate image names)
        settings.grouped_artboards = true;
        if (settings.output == "one-file") {
          warnOnce(
            'Artboards should have unique names. "' + name + '" is duplicated.'
          );
        } else {
          warnOnce('Found a group of artboards named "' + name + '".');
        }
      }
      names.push(name);
    });
  }

  function initSettings(settingsObj) {
    // if for any reasons, settingsArg is empty,
    // pass default settings
    if (!settingsObj.settings) {
      warn("No settings found, passed default settings.");
      var defSettings = {
        settings: placeholderSettings,
        code: settingsObj.code || {},
      };
      return defSettings;
    }

    // convert image_format arg to array
    if (settingsObj.settings["image_format"]) {
      settingsObj.settings["image_format"] = parseAsArray(
        settingsObj.settings["image_format"]
      );
      return settingsObj;
    }
  }

  // Derive ai2svelte program settings by merging default settings and overrides.
  function initDocumentSettings(textBlockSettings) {
    var settings = extend({}, defaultSettings); // copy default settings

    // merge settings from text block
    // TODO: consider parsing strings to booleans when relevant, (e.g. "false" -> false)
    if (textBlockSettings) {
      for (var key in textBlockSettings) {
        if (key in settings === false) {
          warn("Settings block contains an unused parameter: " + key);
        }
        settings[key] = textBlockSettings[key];
      }
    }

    validateDocumentSettings(settings);
    return settings;
  }

  // Trigger errors and warnings for some common problems
  function validateDocumentSettings(settings) {
    if (
      !(
        settings.responsiveness == "fixed" ||
        settings.responsiveness == "dynamic"
      )
    ) {
      warn(
        'Unsupported "responsiveness" setting: ' +
          (settings.responsiveness || "[]")
      );
    }
  }

  // assumes three-part version, e.g. 1.5.0
  function compareVersions(a, b) {
    a = map(a.split("."), parseFloat);
    b = map(b.split("."), parseFloat);
    var diff = a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || 0;
    return (diff < 0 && -1) || (diff > 0 && 1) || 0;
  }

  function initJSON() {
    // Minified json2.js from https://github.com/douglascrockford/JSON-js
    // This code is in the public domain.

    if (typeof JSON !== "object") {
      JSON = {};
    }
    (function () {
      "use strict";
      var rx_one = /^[\],:{}\s]*$/;
      var rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
      var rx_three =
        /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
      var rx_four = /(?:^|:|,)(?:\s*\[)+/g;
      var rx_escapable =
        /[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
      var rx_dangerous =
        /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
      function f(n) {
        return n < 10 ? "0" + n : n;
      }
      function this_value() {
        return this.valueOf();
      }
      if (typeof Date.prototype.toJSON !== "function") {
        Date.prototype.toJSON = function () {
          return isFinite(this.valueOf())
            ? this.getUTCFullYear() +
                "-" +
                f(this.getUTCMonth() + 1) +
                "-" +
                f(this.getUTCDate()) +
                "T" +
                f(this.getUTCHours()) +
                ":" +
                f(this.getUTCMinutes()) +
                ":" +
                f(this.getUTCSeconds()) +
                "Z"
            : null;
        };
        Boolean.prototype.toJSON = this_value;
        Number.prototype.toJSON = this_value;
        String.prototype.toJSON = this_value;
      }
      var gap;
      var indent;
      var meta;
      var rep;
      function quote(string) {
        rx_escapable.lastIndex = 0;
        return rx_escapable.test(string)
          ? '"' +
              string.replace(rx_escapable, function (a) {
                var c = meta[a];
                return typeof c === "string"
                  ? c
                  : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
              }) +
              '"'
          : '"' + string + '"';
      }
      function str(key, holder) {
        var i;
        var k;
        var v;
        var length;
        var mind = gap;
        var partial;
        var value = holder[key];
        if (
          value &&
          typeof value === "object" &&
          typeof value.toJSON === "function"
        ) {
          value = value.toJSON(key);
        }
        if (typeof rep === "function") {
          value = rep.call(holder, key, value);
        }
        switch (typeof value) {
          case "string":
            return quote(value);
          case "number":
            return isFinite(value) ? String(value) : "null";
          case "boolean":
          case "null":
            return String(value);
          case "object":
            if (!value) {
              return "null";
            }
            gap += indent;
            partial = [];
            if (Object.prototype.toString.apply(value) === "[object Array]") {
              length = value.length;
              for (i = 0; i < length; i += 1) {
                partial[i] = str(i, value) || "null";
              }
              v =
                partial.length === 0
                  ? "[]"
                  : gap
                    ? "[\n" +
                      gap +
                      partial.join(",\n" + gap) +
                      "\n" +
                      mind +
                      "]"
                    : "[" + partial.join(",") + "]";
              gap = mind;
              return v;
            }
            if (rep && typeof rep === "object") {
              length = rep.length;
              for (i = 0; i < length; i += 1) {
                if (typeof rep[i] === "string") {
                  k = rep[i];
                  v = str(k, value);
                  if (v) {
                    partial.push(quote(k) + (gap ? ": " : ":") + v);
                  }
                }
              }
            } else {
              for (k in value) {
                if (Object.prototype.hasOwnProperty.call(value, k)) {
                  v = str(k, value);
                  if (v) {
                    partial.push(quote(k) + (gap ? ": " : ":") + v);
                  }
                }
              }
            }
            v =
              partial.length === 0
                ? "{}"
                : gap
                  ? "{\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "}"
                  : "{" + partial.join(",") + "}";
            gap = mind;
            return v;
        }
      }
      if (typeof JSON.stringify !== "function") {
        meta = {
          "\b": "\\b",
          "\t": "\\t",
          "\n": "\\n",
          "\f": "\\f",
          "\r": "\\r",
          '"': '\\"',
          "\\": "\\\\",
        };
        JSON.stringify = function (value, replacer, space) {
          var i;
          gap = "";
          indent = "";
          if (typeof space === "number") {
            for (i = 0; i < space; i += 1) {
              indent += " ";
            }
          } else if (typeof space === "string") {
            indent = space;
          }
          rep = replacer;
          if (
            replacer &&
            typeof replacer !== "function" &&
            (typeof replacer !== "object" ||
              typeof replacer.length !== "number")
          ) {
            throw new Error("JSON.stringify");
          }
          return str("", { "": value });
        };
      }
      if (typeof JSON.parse !== "function") {
        JSON.parse = function (text, reviver) {
          var j;
          function walk(holder, key) {
            var k;
            var v;
            var value = holder[key];
            if (value && typeof value === "object") {
              for (k in value) {
                if (Object.prototype.hasOwnProperty.call(value, k)) {
                  v = walk(value, k);
                  if (v !== undefined) {
                    value[k] = v;
                  } else {
                    delete value[k];
                  }
                }
              }
            }
            return reviver.call(holder, key, value);
          }
          text = String(text);
          rx_dangerous.lastIndex = 0;
          if (rx_dangerous.test(text)) {
            text = text.replace(rx_dangerous, function (a) {
              return "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
            });
          }
          if (
            rx_one.test(
              text
                .replace(rx_two, "@")
                .replace(rx_three, "]")
                .replace(rx_four, "")
            )
          ) {
            j = eval("(" + text + ")");
            return typeof reviver === "function" ? walk({ "": j }, "") : j;
          }
          throw new SyntaxError("JSON.parse");
        };
      }
    })(); // jshint ignore:line
  }

  // Clean the contents of custom JS, CSS and HTML blocks
  // (e.g. undo Illustrator's automatic quote conversion, where applicable)
  function cleanCodeBlock(type, raw) {
    var clean = "";
    if (type.indexOf("html") >= 0) {
      clean = cleanHtmlText(straightenCurlyQuotesInsideAngleBrackets(raw));
    } else if (type == "js") {
      // TODO: consider preserving curly quotes inside quoted strings
      clean = straightenCurlyQuotes(raw);
      clean = addEnclosingTag("script", clean);
    } else if (type == "css") {
      clean = straightenCurlyQuotes(raw);
      clean = stripTag("style", clean);
    }
    return clean;
  }

  function parseAsArray(str) {
    str = trim(str).replace(/[\s,]+/g, ",");
    return str.length === 0 ? [] : str.split(",");
  }

  // Show alert or prompt; return true if promo image should be generated
  function showCompletionAlert() {
    var rule = "\n================\n";
    var alertText, alertHed;

    if (errors.length > 0) {
      alertHed = "The Script Was Unable to Finish";
    } else {
      alertHed = "Nice work!";
    }
    alertText = makeList(errors, "Error", "Errors");
    alertText += makeList(warnings, "Warning", "Warnings");
    alertText += makeList(feedback, "Information", "Information");
    alertText += "\n";

    alertText += rule + "ai2svelte v" + scriptVersion;
    alert(alertHed + alertText);
    function makeList(items, singular, plural) {
      var list = "";
      if (items.length > 0) {
        list += "\r" + (items.length == 1 ? singular : plural) + rule;
        for (var i = 0; i < items.length; i++) {
          list += "\u2022 " + items[i] + "\r";
        }
      }
      return list;
    }
  }

  function restoreDocumentState() {
    var i;
    for (i = 0; i < textFramesToUnhide.length; i++) {
      textFramesToUnhide[i].hidden = false;
    }
    for (i = objectsToRelock.length - 1; i >= 0; i--) {
      objectsToRelock[i].locked = true;
    }
  }

  function ProgressBar(opts) {
    opts = opts || {};
    var steps = opts.steps || 0;
    var step = 0;
    var win = new Window(
      "palette",
      opts.name || "Progress",
      [150, 150, 600, 260]
    );
    win.pnl = win.add("panel", [10, 10, 440, 100], "Progress");
    win.pnl.progBar = win.pnl.add("progressbar", [20, 35, 410, 60], 0, 100);
    win.pnl.progBarLabel = win.pnl.add("statictext", [20, 20, 320, 35], "0%");
    win.show();

    // function getProgress() {
    //   return win.pnl.progBar.value/win.pnl.progBar.maxvalue;
    // }

    function update() {
      win.update();
    }

    this.step = function () {
      step = Math.min(step + 1, steps);
      this.setProgress(step / steps);
    };

    this.setProgress = function (progress) {
      var max = win.pnl.progBar.maxvalue;
      // progress is always 0.0 to 1.0
      var pct = progress * max;
      win.pnl.progBar.value = pct;
      win.pnl.progBarLabel.text = Math.round(pct) + "%";
      update();
    };

    this.setTitle = function (title) {
      win.pnl.text = title;
      update();
    };

    this.close = function () {
      win.close();
    };
  }

  // ======================================
  // ai2svelte AI document reading functions
  // ======================================

  // Convert bounds coordinates (e.g. artboardRect, geometricBounds) to CSS-style coords
  function convertAiBounds(rect) {
    var x = rect[0],
      y = -rect[1],
      w = Math.round(rect[2] - x),
      h = -rect[3] - y;
    return {
      left: x,
      top: y,
      width: w,
      height: h,
    };
  }

  // Remove any annotations and colon separator from an object name
  function cleanObjectName(name) {
    return makeKeyword(name.replace(/^(.+):.*$/, "$1"));
  }

  // TODO: prevent duplicate names? or treat duplicate names an an error condition?
  // (artboard name is assumed to be unique in several places)
  function getArtboardName(ab) {
    return cleanObjectName(ab.name);
  }

  function getLayerName(lyr) {
    return cleanObjectName(lyr.name);
  }

  function getDocumentSlug() {
    return docSlug;
  }

  function makeDocumentSlug(rawName) {
    return makeKeyword(rawName.replace(/ +/g, "-"));
  }

  function getRawDocumentName() {
    return doc.name.replace(/(.+)\.[aieps]+$/, "$1");
  }

  function getGroupContainerId(groupName) {
    return nameSpace + groupName + "-box";
  }

  // Prevent duplicate artboard names by appending width
  // (Assumes dupes have different widths and have been named to form a group)
  function getArtboardUniqueName(ab, settings) {
    var suffix = "";
    if (settings.grouped_artboards) {
      suffix = "-" + Math.round(convertAiBounds(ab.artboardRect).width);
    }
    return getDocumentArtboardName(ab) + suffix;
  }

  function getDocumentArtboardName(ab) {
    return getDocumentSlug() + "-" + getArtboardName(ab);
  }

  // return the effective width of an artboard (the actual width, overridden by optional setting)
  function getArtboardWidth(ab) {
    var abSettings = getArtboardSettings(ab);
    return abSettings.width || convertAiBounds(ab.artboardRect).width;
  }

  // get range of container widths that an ab is visible as a [min,max] array
  // smallest artboard starts with 0, largest artboard ends with Infinity
  // values are inclusive and rounded
  // example: [0, 599]  [600, Infinity]
  //
  function getArtboardVisibilityRange(ab, group, settings) {
    var thisWidth = getArtboardWidth(ab);
    var minWidth, nextWidth;
    // find widths of smallest ab and next widest ab (if any)
    forEach(getSortedArtboardInfo(group.artboards, settings), function (info) {
      var w = info.effectiveWidth;
      if (w > thisWidth && (!nextWidth || w < nextWidth)) {
        nextWidth = w;
      }
      minWidth = Math.min(w, minWidth || Infinity);
    });
    return [
      thisWidth == minWidth ? 0 : thisWidth,
      !!nextWidth ? nextWidth - 1 : Infinity,
    ];
  }

  // Get range of widths that an ab can be sized
  function getArtboardWidthRange(ab, group, settings) {
    var responsiveness = getArtboardResponsiveness(ab, settings);
    var w = getArtboardWidth(ab);
    var visibleRange = getArtboardVisibilityRange(ab, group, settings);
    if (responsiveness == "fixed") {
      return [visibleRange[0] === 0 ? 0 : w, w];
    }
    return visibleRange;
  }

  // Parse data that is encoded in a name
  // This data is appended to the name of an object (layer or artboard).
  // Examples: Artboard1:600,fixed  Layer1:svg  Layer2:png
  function parseObjectName(name) {
    // capture portion of name after colon
    var settingsStr = (/:(.*)/.exec(name) || [])[1] || "";
    var settings = {};
    // parse old-style width declaration
    var widthStr = (/^ai2svelte-(\d+)/.exec(name) || [])[1];
    if (widthStr) {
      settings.width = parseFloat(widthStr);
    }
    // remove suffixes added by copying
    settingsStr = settingsStr.replace(/ copy.*/i, "");
    // parse comma-delimited variables
    forEach(settingsStr.split(","), function (part) {
      var eq = part.indexOf("=");
      var name, value;
      if (/^\d+$/.test(part)) {
        name = "width";
        value = part;
      } else if (eq > 0) {
        name = part.substr(0, eq);
        value = part.substr(eq + 1);
      } else if (part) {
        // assuming setting is a flag
        name = part;
        value = "true";
      }
      if (name && value) {
        if (/^\d+$/.test(value)) {
          value = parseFloat(value);
        } else if (isTrue(value)) {
          value = true;
        }
        settings[name] = value;
      }
    });
    return settings;
  }

  // Get artboard-specific settings by parsing the artboard name
  // (e.g.  Artboard_1:responsive)
  function getArtboardSettings(ab) {
    return parseObjectName(ab.name);
  }

  function getArtboardResponsiveness(ab, settings) {
    var opts = getArtboardSettings(ab);
    var r = settings.responsiveness; // Default to document's responsiveness setting
    if (opts.dynamic) r = "dynamic"; // ab name has ":dynamic" appended
    if (opts.fixed) r = "fixed"; // ab name has ":fixed" appended
    return r;
  }

  // return array of data records about each artboard, sorted from narrow to wide
  function getSortedArtboardInfo(artboards, settings) {
    var arr = [];
    forEach(artboards, function (ab) {
      arr.push({
        effectiveWidth: getArtboardWidth(ab),
        responsiveness: getArtboardResponsiveness(ab, settings),
      });
    });
    arr.sort(function (a, b) {
      return a.effectiveWidth - b.effectiveWidth;
    });
    return arr;
  }

  function forEachUsableArtboard(cb) {
    let ab;
    for (let i = 0; i < doc.artboards.length; i++) {
      ab = doc.artboards[i];
      if (!/^-/.test(ab.name)) {
        // exclude artboards with names starting w/ "-"
        cb(ab, i);
      }
    }
  }

  function findArtboardIndex(ab) {
    return indexOf(doc.artboards, ab);
  }

  function findLayers(layers, test) {
    var retn = [];
    forEach(layers, function (lyr) {
      var found = null;
      if (objectIsHidden(lyr)) {
        // skip
      } else if (!test || test(lyr)) {
        found = [lyr];
      } else if (lyr.layers.length > 0) {
        // examine sublayers (only if layer didn't test positive)
        found = findLayers(lyr.layers, test);
      }
      if (found) {
        retn = retn ? retn.concat(found) : found;
      }
    });
    // Reverse the order of found layers:
    // Layers seem to be fetched from top to bottom in the AI layer stack...
    // We want separately-rendered layers (like :svg or :symbol) to be
    // converted to HTML from bottom to top
    retn.reverse();
    return retn;
  }

  function unhideLayer(lyr) {
    while (lyr.typename == "Layer") {
      lyr.visible = true;
      lyr = lyr.parent;
    }
  }

  function layerIsChildOf(lyr, lyr2) {
    if (lyr == lyr2) return false;
    while (lyr.typename == "Layer") {
      if (lyr == lyr2) return true;
      lyr = lyr.parent;
    }
    return false;
  }

  function clearSelection() {
    // setting selection to null doesn't always work:
    // it doesn't deselect text range selection and also seems to interfere with
    // subsequent mask operations using executeMenuCommand().
    // doc.selection = null;
    // the following seems to work reliably.
    app.executeMenuCommand("deselectall");
  }

  function objectOverlapsAnArtboard(obj) {
    var hit = false;
    forEachUsableArtboard(function (ab) {
      hit = hit || objectOverlapsArtboard(obj, ab);
    });
    return hit;
  }

  function objectOverlapsArtboard(obj, ab) {
    return testBoundsIntersection(ab.artboardRect, obj.geometricBounds);
  }

  function objectIsHidden(obj) {
    var hidden = false;
    while (!hidden && obj && obj.typename != "Document") {
      if (obj.typename == "Layer") {
        hidden = !obj.visible;
      } else {
        hidden = obj.hidden;
      }
      // The following line used to throw an MRAP error if the document
      // contained a raster opacity mask... please file a GitHub issue if the
      // problem recurs.
      obj = obj.parent;
    }
    return hidden;
  }

  function objectIsLocked(obj) {
    while (obj && obj.typename != "Document") {
      if (obj.locked) {
        return true;
      }
      obj = obj.parent;
    }
    return false;
  }

  function unlockObject(obj) {
    // unlock parent first, to avoid "cannot be modified" error
    if (obj && obj.typename != "Document") {
      unlockObject(obj.parent);
      obj.locked = false;
    }
  }

  function getComputedOpacity(obj) {
    var opacity = 1;
    while (obj && obj.typename != "Document") {
      opacity *= obj.opacity / 100;
      obj = obj.parent;
    }
    return opacity * 100;
  }

  // Return array of layer objects, including both PageItems and sublayers, in z order
  function getSortedLayerItems(lyr) {
    var items = toArray(lyr.pageItems).concat(toArray(lyr.layers));
    if (lyr.layers.length > 0 && lyr.pageItems.length > 0) {
      // only need to sort if layer contains both layers and page objects
      items.sort(function (a, b) {
        return b.absoluteZOrderPosition - a.absoluteZOrderPosition;
      });
    }
    return items;
  }

  // a, b: Layer objects
  function findCommonLayer(a, b) {
    var p = null;
    if (a == b) {
      p = a;
    }
    if (!p && a.parent.typename == "Layer") {
      p = findCommonLayer(a.parent, b);
    }
    if (!p && b.parent.typename == "Layer") {
      p = findCommonLayer(a, b.parent);
    }
    return p;
  }

  function findCommonAncestorLayer(items) {
    let layers = [],
      ancestorLyr = null,
      item;
    for (let i = 0, n = items.length; i < n; i++) {
      item = items[i];
      if (item.parent.typename != "Layer" || contains(layers, item.parent)) {
        continue;
      }
      // remember layer, to avoid redundant searching (is this worthwhile?)
      layers.push(item.parent);
      if (!ancestorLyr) {
        ancestorLyr = item.parent;
      } else {
        ancestorLyr = findCommonLayer(ancestorLyr, item.parent);
        if (!ancestorLyr) {
          // Failed to find a common ancestor
          return null;
        }
      }
    }
    return ancestorLyr;
  }

  // Test if a mask can be ignored
  // (An optimization -- currently only finds group masks with no text frames)
  function maskIsRelevant(mask) {
    let parent = mask.parent;
    if (parent.typename == "GroupItem") {
      if (parent.textFrames.length === 0) {
        return false;
      }
    }
    return true;
  }

  // Get information about masks in the document
  // (Used when identifying visible text fields and also when exporting SVG)
  function findMasks() {
    let found = [],
      allMasks,
      relevantMasks;
    // JS API does not support finding masks -- need to call a menu command for this
    // Assumes clipping paths have been unlocked
    app.executeMenuCommand("Clipping Masks menu item");
    allMasks = toArray(doc.selection);
    clearSelection();
    relevantMasks = filter(allMasks, maskIsRelevant);
    // Lock all masks; then unlock each mask in turn and identify its contents.
    forEach(allMasks, function (mask) {
      mask.locked = true;
    });
    forEach(relevantMasks, function (mask) {
      var obj = { mask: mask };
      var selection, item;

      // Select items in this mask
      mask.locked = false;
      // In earlier AI versions, executeMenuCommand() was more reliable
      // than assigning to a selection... this problem has apparently been fixed
      // app.executeMenuCommand('Clipping Masks menu item');
      doc.selection = [mask];
      // Switch selection to all masked items using a menu command
      app.executeMenuCommand("editMask"); // Object > Clipping Mask > Edit Contents

      // stash both objects and textframes
      // (optimization -- addresses poor performance when many objects are masked)
      // //  obj.items = toArray(doc.selection || []); // Stash masked items
      storeSelectedItems(obj, doc.selection || []);

      if (mask.parent.typename == "GroupItem") {
        obj.group = mask.parent; // Group mask -- stash the group
      } else if (mask.parent.typename == "Layer") {
        // Find masking layer -- the common ancestor layer of all masked items is assumed
        // to be the masked layer
        // passing in doc.selection is _much_ faster than obj.items (why?)
        obj.layer = findCommonAncestorLayer(doc.selection || []);
      } else {
        message("Unknown mask type in findMasks()");
      }

      // Clear selection and re-lock mask
      // oddly, 'deselectall' sometimes fails here -- using alternate method
      // for clearing the selection
      // app.executeMenuCommand('deselectall');
      mask.locked = true;
      doc.selection = null;

      if (obj.items.length > 0 && (obj.group || obj.layer)) {
        found.push(obj);
      }
    });

    // restore masks to unlocked state
    forEach(allMasks, function (mask) {
      mask.locked = false;
    });
    return found;
  }

  function storeSelectedItems(obj, selection) {
    var items = (obj.items = []);
    var texts = (obj.textframes = []);
    var item;
    for (var i = 0, n = selection.length; i < n; i++) {
      item = selection[i];
      items[i] = item; // faster than push() in this JS engine
      if (item.typename == "TextFrame") {
        texts.push(item);
      }
    }
  }

  // ==============================
  // ai2svelte text functions
  // ==============================

  function textIsRotated(textFrame) {
    var m = textFrame.matrix;
    var angle;
    if (m.mValueA == 1 && m.mValueB === 0 && m.mValueC === 0 && m.mValueD == 1)
      return false;
    angle = (Math.atan2(m.mValueB, m.mValueA) * 180) / Math.PI;
    // Treat text rotated by < 1 degree as unrotated.
    // (It's common to accidentally rotate text and then try to unrotate manually).
    return Math.abs(angle) > 1;
  }

  function hideTextFrame(textFrame) {
    textFramesToUnhide.push(textFrame);
    textFrame.hidden = true;
  }

  // color: a color object, e.g. RGBColor
  // opacity (optional): opacity [0-100]
  function convertAiColor(color, opacity) {
    // If all three RBG channels (0-255) are below this value, convert text fill to pure black.
    var rgbBlackThreshold = 36;
    var o = {};
    var r, g, b;
    if (color.typename == "SpotColor") {
      color = color.spot.color; // expecting AI to return an RGBColor because doc is in RGB mode.
    }
    if (color.typename == "RGBColor") {
      r = color.red;
      g = color.green;
      b = color.blue;
      if (
        r < rgbBlackThreshold &&
        g < rgbBlackThreshold &&
        b < rgbBlackThreshold
      ) {
        r = g = b = 0;
      }
    } else if (color.typename == "GrayColor") {
      r = g = b = Math.round(((100 - color.gray) / 100) * 255);
    } else if (color.typename == "NoColor") {
      g = 255;
      r = b = 0;
      // warnings are processed later, after ranges of same-style chars are identified
      // TODO: add text-fill-specific warnings elsewhere
      o.warning =
        'The text "%s" has no fill. Please fill it with an RGB color. It has been filled with green.';
    } else {
      r = g = b = 0;
      o.warning =
        'The text "%s" has ' +
        color.typename +
        " fill. Please fill it with an RGB color.";
    }
    o.color = getCssColor(r, g, b, opacity);
    return o;
  }

  // Parse an AI CharacterAttributes object
  function getCharStyle(c) {
    var o = convertAiColor(c.fillColor);
    var caps = String(c.capitalization);
    o.aifont = c.textFont.name;
    o.size = Math.round(c.size);
    o.capitalization = caps == "FontCapsOption.NORMALCAPS" ? "" : caps;
    o.tracking = c.tracking;
    o.superscript = c.baselinePosition == FontBaselineOption.SUPERSCRIPT;
    o.subscript = c.baselinePosition == FontBaselineOption.SUBSCRIPT;
    return o;
  }

  // p: an AI paragraph (appears to be a TextRange object with mixed-in ParagraphAttributes)
  // opacity: Computed opacity (0-100) of TextFrame containing this pg
  function getParagraphStyle(p) {
    return {
      leading: Math.round(p.leading),
      spaceBefore: Math.round(p.spaceBefore),
      spaceAfter: Math.round(p.spaceAfter),
      justification: String(p.justification), // coerce from object
    };
  }

  // s: object containing CSS text properties
  function getStyleKey(s) {
    var key = "";
    for (var i = 0, n = cssTextStyleProperties.length; i < n; i++) {
      key += "~" + (s[cssTextStyleProperties[i]] || "");
    }
    return key;
  }

  function getTextStyleClass(style, classes, name) {
    var key = getStyleKey(style);
    var cname = nameSpace + (name || "style");
    var o, i;
    for (i = 0; i < classes.length; i++) {
      o = classes[i];
      if (o.key == key) {
        return o.classname;
      }
    }
    o = {
      key: key,
      style: style,
      classname: cname + i,
    };
    classes.push(o);
    return o.classname;
  }

  // Divide a paragraph (TextRange object) into an array of
  // data objects describing text strings having the same style.
  function getParagraphRanges(p) {
    var segments = [];
    var currRange;
    var prev, curr, c;
    for (var i = 0, n = p.characters.length; i < n; i++) {
      c = p.characters[i];
      curr = getCharStyle(c);
      if (!prev || objectDiff(curr, prev)) {
        currRange = {
          text: "",
          aiStyle: curr,
        };
        segments.push(currRange);
      }
      if (curr.warning) {
        currRange.warning = curr.warning;
      }
      currRange.text += c.contents;
      prev = curr;
    }
    return segments;
  }

  // Convert a TextFrame to an array of data records for each of the paragraphs
  //   contained in the TextFrame.
  function importTextFrameParagraphs(textFrame) {
    // The scripting API doesn't give us access to opacity of TextRange objects
    //   (including individual characters). The best we can do is get the
    //   computed opacity of the current TextFrame
    var opacity = getComputedOpacity(textFrame);
    var blendMode = getBlendMode(textFrame);
    var charsLeft = textFrame.characters.length;
    var rotated = textIsRotated(textFrame);
    var data = [];
    var p, plen, d;
    for (
      var k = 0, n = textFrame.paragraphs.length;
      k < n && charsLeft > 0;
      k++
    ) {
      // trailing newline in a text block adds one to paragraphs.length, but
      // an error is thrown when such a pg is accessed. charsLeft test is a workaround.
      p = textFrame.paragraphs[k];
      plen = p.characters.length;
      if (plen === 0) {
        d = {
          text: "",
          aiStyle: {},
          ranges: [],
        };
      } else {
        d = {
          text: p.contents,
          aiStyle: getParagraphStyle(p),
          ranges: getParagraphRanges(p),
        };
        d.aiStyle.rotated = rotated;
        d.aiStyle.opacity = opacity;
        d.aiStyle.blendMode = blendMode;
        d.aiStyle.frameType =
          textFrame.kind == TextType.POINTTEXT ? "point" : "area";
      }
      data.push(d);
      charsLeft -= plen + 1; // char count + newline
    }
    return data;
  }

  function cleanHtmlTags(str) {
    var tagName = findHtmlTag(str);
    // only warn for certain tags
    if (
      tagName &&
      contains("i,span,b,strong,em".split(","), tagName.toLowerCase())
    ) {
      warnOnce(
        "Found a <" +
          tagName +
          "> tag. Try using Illustrator formatting instead."
      );
    }
    return tagName ? straightenCurlyQuotesInsideAngleBrackets(str) : str;
  }

  function generateParagraphHtml(pData, baseStyle, pStyles, cStyles) {
    var html, diff, range, rangeHtml;
    if (pData.text.length === 0) {
      // empty pg
      // TODO: Calculate the height of empty paragraphs and generate
      // CSS to preserve this height (not supported by Illustrator API)
      return "<p>&nbsp;</p>";
    }
    diff = objectDiff(pData.cssStyle, baseStyle);
    // Give the pg a class, if it has a different style than the base pg class
    if (diff) {
      html = '<p class="' + getTextStyleClass(diff, pStyles, "pstyle") + '">';
    } else {
      html = "<p>";
    }
    for (var j = 0; j < pData.ranges.length; j++) {
      range = pData.ranges[j];
      rangeHtml = cleanHtmlText(cleanHtmlTags(range.text));
      diff = objectDiff(range.cssStyle, pData.cssStyle);
      if (diff) {
        rangeHtml =
          '<span class="' +
          getTextStyleClass(diff, cStyles, "cstyle") +
          '">' +
          rangeHtml +
          "</span>";
      }
      html += rangeHtml;
    }
    html += "</p>";
    return html;
  }

  function generateTextFrameHtml(paragraphs, baseStyle, pStyles, cStyles) {
    var html = "";
    for (var i = 0; i < paragraphs.length; i++) {
      html +=
        "\r\t\t\t" +
        generateParagraphHtml(paragraphs[i], baseStyle, pStyles, cStyles);
    }
    return html;
  }

  // Convert a collection of TextFrames to HTML and CSS
  function convertTextFrames(textFrames, ab, settings) {
    var frameData = map(textFrames, function (frame) {
      return {
        paragraphs: importTextFrameParagraphs(frame),
      };
    });
    var pgStyles = [];
    var charStyles = [];
    var baseStyle = deriveTextStyleCss(frameData);
    var idPrefix = nameSpace + "ai" + findArtboardIndex(ab) + "-";
    var abBox = convertAiBounds(ab.artboardRect);
    var divs = map(frameData, function (obj, i) {
      var frame = textFrames[i];
      var divId = frame.name ? makeKeyword(frame.name) : idPrefix + (i + 1);
      var positionCss = getTextFrameCss(frame, abBox, obj.paragraphs, settings);
      return (
        '\t\t<div id="' +
        divId +
        '" ' +
        positionCss +
        ">" +
        generateTextFrameHtml(obj.paragraphs, baseStyle, pgStyles, charStyles) +
        "\r\t\t</div>\r"
      );
    });

    var allStyles = pgStyles.concat(charStyles);
    var cssBlocks = map(allStyles, function (obj) {
      return formatCssRule("." + obj.classname, obj.style);
    });
    if (divs.length > 0) {
      cssBlocks.unshift(formatCssRule("p", baseStyle));
    }

    return {
      styles: cssBlocks,
      html: divs.join(""),
    };
  }

  // Compute the base paragraph style by finding the most common style in frameData
  // Side effect: adds cssStyle object alongside each aiStyle object
  // frameData: Array of data objects parsed from a collection of TextFrames
  // Returns object containing css text style properties of base pg style
  function deriveTextStyleCss(frameData) {
    var pgStyles = [];
    var baseStyle = {};
    // override detected settings with these style properties
    var defaultCssStyle = {
      "text-align": "left",
      "text-transform": "none",
      "padding-bottom": 0,
      "padding-top": 0,
      "mix-blend-mode": "normal",
      "font-style": "normal",
      "font-weight": "regular",
      height: "auto",
      opacity: 1,
      position: "static", // 'relative' also used (to correct baseline misalignment)
    };
    var currCharStyles;

    forEach(frameData, function (frame) {
      forEach(frame.paragraphs, analyzeParagraphStyle);
    });

    // initialize the base <p> style to be equal to the most common pg style
    if (pgStyles.length > 0) {
      pgStyles.sort(compareCharCount);
      extend(baseStyle, pgStyles[0].cssStyle);
    }
    // override certain base style properties with default values
    extend(baseStyle, defaultCssStyle);
    return baseStyle;

    function compareCharCount(a, b) {
      return b.count - a.count;
    }
    function analyzeParagraphStyle(pdata) {
      currCharStyles = [];
      forEach(pdata.ranges, convertRangeStyle);
      if (currCharStyles.length > 0) {
        // add most common char style to the pg style, to avoid applying
        // <span> tags to all the text in the paragraph
        currCharStyles.sort(compareCharCount);
        extend(pdata.aiStyle, currCharStyles[0].aiStyle);
      }
      pdata.cssStyle = analyzeTextStyle(pdata.aiStyle, pdata.text, pgStyles);
      if (pdata.aiStyle.blendMode && !pdata.cssStyle["mix-blend-mode"]) {
        warnOnce(
          "Missing a rule for converting " +
            pdata.aiStyle.blendMode +
            " to CSS."
        );
      }
    }

    function convertRangeStyle(range) {
      range.cssStyle = analyzeTextStyle(
        range.aiStyle,
        range.text,
        currCharStyles
      );
      if (range.warning) {
        warn(range.warning.replace("%s", truncateString(range.text, 35)));
      }
      if (range.aiStyle.aifont && !range.cssStyle["font-family"]) {
        warnOnce(
          "Missing a rule for converting font: " +
            "\nfont-family: " +
            range.aiStyle.aifont.split("-")[0] +
            "\nfont: " +
            range.aiStyle.aifont +
            ". \nSample text: " +
            truncateString(range.text, 35),
          range.aiStyle.aifont
        );
      }
    }

    function analyzeTextStyle(aiStyle, text, stylesArr) {
      var cssStyle = convertAiTextStyle(aiStyle);
      var key = getStyleKey(cssStyle);
      var o;
      if (text.length === 0) {
        return {};
      }
      for (var i = 0; i < stylesArr.length; i++) {
        if (stylesArr[i].key == key) {
          o = stylesArr[i];
          break;
        }
      }
      if (!o) {
        o = {
          key: key,
          aiStyle: aiStyle,
          cssStyle: cssStyle,
          count: 0,
        };
        stylesArr.push(o);
      }
      o.count += text.length;
      // o.count++; // each occurence counts equally
      return cssStyle;
    }
  }

  // this function regex matches various aspects of a font: family, weight and style.
  function matchFont(aifont) {
    if (!aifont) {
      return null;
    }
    // testStr += aifont + ", ";

    var fontFamilies = {
      arial: "Arial, sans-serif",
      freight: "FreightTextPro,Georgia,serif",
      georgia: 'Georgia, "Times New Roman", Times, serif',
      source:
        '"Source Sans Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif',
      knowledge: '"Knowledge", "Source Sans Pro", Arial, sans-serif',
      menlo:
        'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    };

    // all i could find on my illustrator in the above fonts.
    var weights = {
      bold: "700",
      black: "900",
      light: "300",
      extralight: "200",
      "extra-light": "200",
      regular: "400",
      semibold: "600",
      "semi-bold": "600",
      medium: "500",
      "ultra-light": "100",
      ultralight: "100",
    };

    var findWeight = function () {
      var weight = aifont.match(
        /(semi-?bold|bold|black|extra-?light|light|regular|medium|ultra-?light)/gi
      );
      if (weight && weights[weight[0].toLowerCase()]) {
        return weights[weight[0].toLowerCase()];
      }
      return "400";
    };

    // is there anything apart from italic here?
    var findStyle = function () {
      // Source has semibold/bold/black"It" name for italics
      // so source semibold italic shows up as Source-SemiBoldIt. weird.
      var style = aifont.match(
        /(italic|(?:semi-?bold|bold|black|extra-?light|light|regular)it)/gi
      );
      if (style) {
        return "italic";
      }
      return "";
    };

    var findFamily = function () {
      if (fontsConfig && aifont) {
        let aiFontName = aifont.split("-")[0];
        if (fontsConfig[aiFontName]) {
          return fontsConfig[aiFontName];
        } else {
          if (!contains(missingFontFamilies, aiFontName)) {
            missingFontFamilies.push(aiFontName);
          }
          return "";
        }
      }
      return "";
    };

    // the ai2svelte script automatically handles empty keys here and shows them on the final alert. so we don't need to worry about fallback fonts. (unless we want specific fallback fonts)
    return {
      aifont: aifont,
      family: findFamily(),
      weight: findWeight(),
      style: findStyle(),
    };
  }

  // Lookup an AI font name in the font table
  function findFontInfo(aifont) {
    var info = null;

    info = matchFont(aifont);
    if (!info) {
      // font not found... parse the AI font name to give it a weight and style
      info = {};
      if (aifont.indexOf("Italic") > -1) {
        info.style = "italic";
      }
      if (aifont.indexOf("Bold") > -1) {
        info.weight = 700;
      } else {
        info.weight = 500;
      }
    }
    return info;
  }

  // ai: AI justification value
  function getJustificationCss(ai) {
    for (var k = 0; k < align.length; k++) {
      if (ai == align[k].ai) {
        return align[k].html;
      }
    }
    return "initial"; // CSS default
  }

  // ai: AI capitalization value
  function getCapitalizationCss(ai) {
    for (var k = 0; k < caps.length; k++) {
      if (ai == caps[k].ai) {
        return caps[k].html;
      }
    }
    return "";
  }

  function getBlendModeCss(ai) {
    for (var k = 0; k < blendModes.length; k++) {
      if (ai == blendModes[k].ai) {
        return blendModes[k].html;
      }
    }
    return "";
  }

  function getBlendMode(obj) {
    // Limitation: returns first found blending mode, ignores any others that
    //   might be applied a parent object
    while (obj && obj.typename != "Document") {
      if (obj.blendingMode && obj.blendingMode != BlendModes.NORMAL) {
        return obj.blendingMode;
      }
      obj = obj.parent;
    }
    return null;
  }

  // convert an object containing parsed AI text styles to an object containing CSS style properties
  function convertAiTextStyle(aiStyle) {
    var cssStyle = {};
    var fontSize = aiStyle.size;
    var fontInfo, tmp;
    if (aiStyle.aifont) {
      fontInfo = findFontInfo(aiStyle.aifont);
      if (fontInfo.family) {
        cssStyle["font-family"] = fontInfo.family;
      }
      if (fontInfo.weight) {
        cssStyle["font-weight"] = fontInfo.weight;
      }
      if (fontInfo.style) {
        cssStyle["font-style"] = fontInfo.style;
      }
    }
    if ("leading" in aiStyle) {
      cssStyle["line-height"] = aiStyle.leading + "px";
      // Fix for line height error affecting point text in Chrome/Safari at certain browser zooms.
      if (aiStyle.frameType == "point") {
        cssStyle.height = cssStyle["line-height"];
      }
    }
    // if (('opacity' in aiStyle) && aiStyle.opacity < 100) {
    if ("opacity" in aiStyle) {
      cssStyle.opacity = roundTo(aiStyle.opacity / 100, cssPrecision);
    }
    if (aiStyle.blendMode && (tmp = getBlendModeCss(aiStyle.blendMode))) {
      cssStyle["mix-blend-mode"] = tmp;
      // TODO: consider opacity fallback for IE
    }
    if (aiStyle.spaceBefore > 0) {
      cssStyle["padding-top"] = aiStyle.spaceBefore + "px";
    }
    if (aiStyle.spaceAfter > 0) {
      cssStyle["padding-bottom"] = aiStyle.spaceAfter + "px";
    }
    if ("tracking" in aiStyle) {
      cssStyle["letter-spacing"] =
        roundTo(aiStyle.tracking / 1000, cssPrecision) + "em";
    }
    if (aiStyle.superscript) {
      fontSize = roundTo(fontSize * 0.7, 1);
      cssStyle["vertical-align"] = "super";
    }
    if (aiStyle.subscript) {
      fontSize = roundTo(fontSize * 0.7, 1);
      cssStyle["vertical-align"] = "sub";
    }
    if (fontSize > 0) {
      cssStyle["font-size"] = fontSize + "px";
    }
    // kludge: text-align of rotated text is handled as a special case (see also getTextFrameCss())
    if (aiStyle.rotated && aiStyle.frameType == "point") {
      cssStyle["text-align"] = "center";
    } else if (
      aiStyle.justification &&
      (tmp = getJustificationCss(aiStyle.justification))
    ) {
      cssStyle["text-align"] = tmp;
    }
    if (
      aiStyle.capitalization &&
      (tmp = getCapitalizationCss(aiStyle.capitalization))
    ) {
      cssStyle["text-transform"] = tmp;
    }
    if (aiStyle.color) {
      cssStyle.color = aiStyle.color;
    }
    // applying vshift only to point text
    // (based on experience with NYTFranklin)
    if (aiStyle.size > 0 && fontInfo.vshift && aiStyle.frameType == "point") {
      cssStyle.top = vshiftToPixels(fontInfo.vshift, aiStyle.size);
      cssStyle.position = "relative";
    }
    return cssStyle;
  }

  function vshiftToPixels(vshift, fontSize) {
    var i = vshift.indexOf("%");
    var pct = parseFloat(vshift);
    var px = (fontSize * pct) / 100;
    if (!px || i == -1) return "0";
    return roundTo(px, 1) + "px";
  }

  function textFrameIsRenderable(frame, artboardRect) {
    var good = true;
    if (!testBoundsIntersection(frame.visibleBounds, artboardRect)) {
      good = false;
    } else if (
      frame.kind != TextType.AREATEXT &&
      frame.kind != TextType.POINTTEXT
    ) {
      good = false;
    } else if (objectIsHidden(frame)) {
      good = false;
    } else if (frame.contents === "") {
      good = false;
    }
    return good;
  }

  // Find clipped art objects that are inside an artboard but outside the bounding box
  // box of their clipping path
  // items: array of PageItems assocated with a clipping path
  // clipRect: bounding box of clipping path
  // abRect: bounds of artboard to test
  //
  function selectMaskedItems(items, clipRect, abRect) {
    var found = [];
    var itemRect, itemInArtboard, itemInMask, maskInArtboard;
    for (var i = 0, n = items.length; i < n; i++) {
      itemRect = items[i].geometricBounds;
      // capture items that intersect the artboard but are masked...
      itemInArtboard = testBoundsIntersection(abRect, itemRect);
      maskInArtboard = testBoundsIntersection(abRect, clipRect);
      itemInMask = testBoundsIntersection(itemRect, clipRect);
      if (itemInArtboard && (!maskInArtboard || !itemInMask)) {
        found.push(items[i]);
      }
    }
    return found;
  }

  // Find clipped TextFrames that are inside an artboard but outside their
  // clipping path (using bounding box of clipping path to approximate clip area)
  function getClippedTextFramesByArtboard(ab, masks) {
    var abRect = ab.artboardRect;
    var frames = [];
    forEach(masks, function (o) {
      var clipRect = o.mask.geometricBounds;
      if (testSimilarBounds(abRect, clipRect, 5)) {
        // if clip path is masking the current artboard, skip the test
        return;
      }
      if (!testBoundsIntersection(abRect, clipRect)) {
        return; // ignore masks in other artboards
      }
      var texts = o.textframes;
      // var texts = filter(o.items, function(item) {return item.typename == 'TextFrame';});
      texts = selectMaskedItems(texts, clipRect, abRect);
      if (texts.length > 0) {
        frames = frames.concat(texts);
      }
    });
    return frames;
  }

  // Get array of TextFrames belonging to an artboard, excluding text that
  // overlaps the artboard but is hidden by a clipping mask
  function getTextFramesByArtboard(ab, masks, settings) {
    var candidateFrames = findTextFramesToRender(
      doc.textFrames,
      ab.artboardRect
    );
    var excludedFrames = getClippedTextFramesByArtboard(ab, masks);
    candidateFrames = arraySubtract(candidateFrames, excludedFrames);
    if (settings.render_rotated_skewed_text_as == "image") {
      excludedFrames = filter(candidateFrames, textIsRotated);
      candidateFrames = arraySubtract(candidateFrames, excludedFrames);
    }
    return candidateFrames;
  }

  function findTextFramesToRender(frames, artboardRect) {
    var selected = [];
    for (var i = 0; i < frames.length; i++) {
      if (textFrameIsRenderable(frames[i], artboardRect)) {
        selected.push(frames[i]);
      }
    }
    // Sort frames top to bottom, left to right.
    selected.sort(
      firstBy(function (v1, v2) {
        return v2.top - v1.top;
      }).thenBy(function (v1, v2) {
        return v1.left - v2.left;
      })
    );
    return selected;
  }

  // Extract key: value pairs from the contents of a note attribute
  function parseDataAttributes(note) {
    var o = {};
    var parts;
    if (note) {
      parts = note.split(/[\r\n;,]+/);
      for (var i = 0; i < parts.length; i++) {
        parseKeyValueString(parts[i], o);
      }
    }
    return o;
  }

  function formatCssPct(part, whole) {
    return roundTo((part / whole) * 100, cssPrecision) + "%";
  }

  function getUntransformedTextBounds(textFrame) {
    var copy = textFrame.duplicate(
      textFrame.parent,
      ElementPlacement.PLACEATEND
    );
    var matrix = clearMatrixShift(textFrame.matrix);
    copy.transform(app.invertMatrix(matrix));
    var bnds = copy.geometricBounds;
    if (textFrame.kind == TextType.AREATEXT) {
      // prevent offcenter problem caused by extra vertical space in text area
      // TODO: de-kludge
      // this would be much simpler if <TextFrameItem>.convertAreaObjectToPointObject()
      // worked correctly (throws MRAP error when trying to remove a converted object)
      var textWidth = bnds[2] - bnds[0];
      copy.transform(matrix);
      // Transforming outlines avoids the offcenter problem, but width of bounding
      // box needs to be set to width of transformed TextFrame for correct output
      copy = copy.createOutline();
      copy.transform(app.invertMatrix(matrix));
      bnds = copy.geometricBounds;
      var dx = Math.ceil(textWidth - (bnds[2] - bnds[0])) / 2;
      bnds[0] -= dx;
      bnds[2] += dx;
    }
    copy.remove();
    return bnds;
  }

  function getTransformationCss(textFrame, vertAnchorPct) {
    var matrix = clearMatrixShift(textFrame.matrix);
    var horizAnchorPct = 50;
    var transformOrigin = horizAnchorPct + "% " + vertAnchorPct + "%;";
    var transform =
      "matrix(" +
      roundTo(matrix.mValueA, cssPrecision) +
      "," +
      roundTo(-matrix.mValueB, cssPrecision) +
      "," +
      roundTo(-matrix.mValueC, cssPrecision) +
      "," +
      roundTo(matrix.mValueD, cssPrecision) +
      "," +
      roundTo(matrix.mValueTX, cssPrecision) +
      "," +
      roundTo(matrix.mValueTY, cssPrecision) +
      ");";

    // TODO: handle character scaling.
    // One option: add separate CSS transform to paragraphs inside a TextFrame
    var charStyle = textFrame.textRange.characterAttributes;
    var scaleX = charStyle.horizontalScale;
    var scaleY = charStyle.verticalScale;
    if (scaleX != 100 || scaleY != 100) {
      warn(
        "Vertical or horizontal text scaling will be lost. Affected text: " +
          truncateString(textFrame.contents, 35)
      );
    }

    return (
      "transform: " +
      transform +
      "transform-origin: " +
      transformOrigin +
      "-webkit-transform: " +
      transform +
      "-webkit-transform-origin: " +
      transformOrigin +
      "-ms-transform: " +
      transform +
      "-ms-transform-origin: " +
      transformOrigin
    );
  }

  // Create class='' and style='' CSS for positioning the label container div
  // (This container wraps one or more <p> tags)
  function getTextFrameCss(thisFrame, abBox, pgData, settings) {
    var styles = "";
    var classes = "";
    // Using AI style of first paragraph in TextFrame to get information about
    // tracking, justification and top padding
    // TODO: consider positioning paragraphs separately, to handle pgs with different
    //   justification in the same text block
    var firstPgStyle = pgData[0].aiStyle;
    var lastPgStyle = pgData[pgData.length - 1].aiStyle;
    var isRotated = firstPgStyle.rotated;
    var aiBounds = isRotated
      ? getUntransformedTextBounds(thisFrame)
      : thisFrame.geometricBounds;
    var htmlBox = convertAiBounds(
      shiftBounds(aiBounds, -abBox.left, abBox.top)
    );
    var thisFrameAttributes = parseDataAttributes(thisFrame.note);
    // estimated space between top of HTML container and character glyphs
    // (related to differences in AI and CSS vertical positioning of text blocks)
    var marginTopPx =
      (firstPgStyle.leading - firstPgStyle.size) / 2 + firstPgStyle.spaceBefore;
    // estimated space between bottom of HTML container and character glyphs
    var marginBottomPx =
      (lastPgStyle.leading - lastPgStyle.size) / 2 + lastPgStyle.spaceAfter;
    // var trackingPx = firstPgStyle.size * firstPgStyle.tracking / 1000;
    var htmlL = htmlBox.left;
    var htmlT = Math.round(htmlBox.top - marginTopPx);
    var htmlW = htmlBox.width;
    var htmlH = htmlBox.height + marginTopPx + marginBottomPx;
    var alignment, v_align, vertAnchorPct;

    if (firstPgStyle.justification == "Justification.LEFT") {
      alignment = "left";
    } else if (firstPgStyle.justification == "Justification.RIGHT") {
      alignment = "right";
    } else if (firstPgStyle.justification == "Justification.CENTER") {
      alignment = "center";
    }

    if (thisFrame.kind == TextType.AREATEXT) {
      v_align = "top"; // area text aligned to top by default
      // EXPERIMENTAL feature
      // Put a box around the text, if the text frame's textPath is styled
      styles += convertAreaTextPath(thisFrame);
    } else {
      // point text
      // point text aligned to midline (sensible default for chart y-axes, map labels, etc.)
      v_align = "middle";
      htmlW += 22; // add a bit of extra width to try to prevent overflow
    }

    if (thisFrameAttributes.valign && !isRotated) {
      // override default vertical alignment, unless text is rotated (TODO: support other )
      v_align = thisFrameAttributes.valign;
      if (v_align == "center") {
        v_align = "middle";
      }
    }

    if (isRotated) {
      vertAnchorPct = ((marginTopPx + htmlBox.height * 0.5 + 1) / htmlH) * 100; // TODO: de-kludge
      styles += getTransformationCss(thisFrame, vertAnchorPct);
      // Only center alignment currently works well with rotated text
      // TODO: simplify alignment of rotated text (some logic is in convertAiTextStyle())
      v_align = "middle";
      alignment = "center";
      // text-align of point text set to 'center' in convertAiTextStyle()
    }

    if (v_align == "bottom") {
      var bottomPx =
        abBox.height - (htmlBox.top + htmlBox.height + marginBottomPx);
      styles += "bottom:" + formatCssPct(bottomPx, abBox.height) + ";";
    } else if (v_align == "middle") {
      // https://css-tricks.com/centering-in-the-unknown/
      // TODO: consider: http://zerosixthree.se/vertical-align-anything-with-just-3-lines-of-css/
      styles +=
        "top:" +
        formatCssPct(htmlT + marginTopPx + htmlBox.height / 2, abBox.height) +
        ";";
      styles +=
        "margin-top:-" + roundTo(marginTopPx + htmlBox.height / 2, 1) + "px;";
    } else {
      styles += "top:" + formatCssPct(htmlT, abBox.height) + ";";
    }
    if (alignment == "right") {
      styles +=
        "right:" +
        formatCssPct(abBox.width - (htmlL + htmlBox.width), abBox.width) +
        ";";
    } else if (alignment == "center") {
      styles +=
        "left:" + formatCssPct(htmlL + htmlBox.width / 2, abBox.width) + ";";
      // setting a negative left margin for horizontal placement of centered text
      // using percent for area text (because area text width uses percent) and pixels for point text
      if (thisFrame.kind == TextType.POINTTEXT) {
        styles += "margin-left:-" + roundTo(htmlW / 2, 1) + "px;";
      } else {
        styles += "margin-left:" + formatCssPct(-htmlW / 2, abBox.width) + ";";
      }
    } else {
      styles += "left:" + formatCssPct(htmlL, abBox.width) + ";";
    }

    classes =
      nameSpace + getLayerName(thisFrame.layer) + " " + nameSpace + "aiAbs";
    if (thisFrame.kind == TextType.POINTTEXT) {
      classes += " " + nameSpace + "aiPointText";
      // using pixel width with point text, because pct width causes alignment problems -- see issue #63
      // adding extra pixels in case HTML width is slightly less than AI width (affects alignment of right-aligned text)
      styles += "width:" + roundTo(htmlW, cssPrecision) + "px;";
    } else if (settings.text_responsiveness == "fixed") {
      styles += "width:" + roundTo(htmlW, cssPrecision) + "px;";
    } else {
      // area text uses pct width, so width of text boxes will scale
      // TODO: consider only using pct width with wider text boxes that contain paragraphs of text
      styles += "width:" + formatCssPct(htmlW, abBox.width) + ";";
    }
    return 'class="' + classes + '" style="' + styles + '"';
  }

  function convertAreaTextPath(frame) {
    var style = "";
    var path = frame.textPath;
    var obj;
    if (path.stroked || path.filled) {
      style += "padding: 6px 6px 6px 7px;";
      if (path.filled) {
        obj = convertAiColor(path.fillColor, path.opacity);
        style += "background-color: " + obj.color + ";";
      }
      if (path.stroked) {
        obj = convertAiColor(path.strokeColor, path.opacity);
        style += "border: 1px solid " + obj.color + ";";
      }
    }
    return style;
  }

  // =================================
  // ai2svelte symbol functions
  // =================================

  // Return inline CSS for styling a single symbol
  // TODO: create classes to capture style properties that are used repeatedly
  function getBasicSymbolCss(geom, style, abBox, opts) {
    var center = geom.center;
    var styles = [];
    // Round fixed-size symbols to integer size, to prevent pixel-snapping from
    // changing squares and circles to rectangles and ovals.
    var precision = opts.scaled ? 1 : 0;
    var width, height;
    var border;

    if (geom.type == "line") {
      precision = 2;
      width = geom.width;
      height = geom.height;
      if (width > height) {
        // kludge to minimize gaps between segments (found using trial and error)
        width += style.strokeWidth * 0.5;
        center[0] += style.strokeWidth * 0.333;
      }
    } else if (geom.type == "rectangle") {
      width = geom.width;
      height = geom.height;
    } else if (geom.type == "circle") {
      width = geom.radius * 2;
      height = width;
      // styles.push('border-radius: ' + roundTo(geom.radius, 1) + 'px');
      styles.push("border-radius: 50%");
    }

    width = roundTo(width, precision);
    height = roundTo(height, precision);

    if (opts.scaled) {
      styles.push("width: " + formatCssPct(width, abBox.width));
      styles.push("height: " + formatCssPct(height, abBox.height));
      styles.push("margin-left: " + formatCssPct(-width / 2, abBox.width));
      // vertical margin pct is calculated as pct of width
      styles.push("margin-top: " + formatCssPct(-height / 2, abBox.width));
    } else {
      styles.push("width: " + width + "px");
      styles.push("height: " + height + "px");
      styles.push("margin-top: " + -height / 2 + "px");
      styles.push("margin-left: " + -width / 2 + "px");
    }

    if (style.stroke) {
      if (geom.type == "line" && width > height) {
        border = "border-top";
      } else if (geom.type == "line") {
        border = "border-right";
      } else {
        border = "border";
      }
      styles.push(
        border + ": " + style.strokeWidth + "px solid " + style.stroke
      );
    }
    if (style.fill) {
      styles.push("background-color: " + style.fill);
    }
    if (style.opacity < 1 && style.opacity) {
      styles.push("opacity: " + style.opacity);
    }
    if (style.multiply) {
      styles.push("mix-blend-mode: multiply");
    }
    styles.push("left: " + formatCssPct(center[0], abBox.width));
    styles.push("top: " + formatCssPct(center[1], abBox.height));
    // TODO: use class for colors and other properties
    return 'style="' + styles.join("; ") + ';"';
  }

  function getSymbolClass() {
    return nameSpace + "aiSymbol";
  }

  function exportSymbolAsHtml(item, geometries, abBox, opts) {
    var html = "";
    var style = getBasicSymbolStyle(item);
    var properties = item.name
      ? 'data-name="' + makeKeyword(item.name) + '" '
      : "";
    var geom, x, y;
    var innerBlock = opts.innerBlock || "";
    var symbolClass = getSymbolClass();
    var divId = "";

    if (opts.tagPrefix == "snippet") {
      symbolClass += " " + nameSpace + "aiSnippet";
      properties = 'data-name="' + opts.idName + '" ';
      var id = nameSpace + "snippet-" + opts.idName;
      divId = 'id="' + id + '" ';
    } else if (opts.tagPrefix == "div" && item.name) {
      var id = nameSpace + "div-" + opts.idName + "-" + item.name;
      divId = 'id="' + id + '" ';
    } else if (opts.tagPrefix == "symbol" && item.name) {
      var id = nameSpace + "symbol-" + opts.idName + "-" + item.name;
      divId = 'id="' + id + '" ';
    }

    for (var i = 0; i < geometries.length; i++) {
      geom = geometries[i];
      // make center coords relative to top,left of artboard
      x = geom.center[0] - abBox.left;
      y = -geom.center[1] - abBox.top;
      geom.center = [x, y];
      html +=
        "\r\t\t\t" +
        '<div class="' +
        symbolClass +
        '" ' +
        divId +
        properties +
        getBasicSymbolCss(geom, style, abBox, opts) +
        ">\r" +
        innerBlock +
        "\r</div>";
    }
    return html;
  }

  function testLayerArtboardIntersection(lyr, ab) {
    if (lyr) {
      return layerIsVisible(lyr);
    } else {
      return some(doc.layers, layerIsVisible);
    }

    function layerIsVisible(lyr) {
      if (objectIsHidden(lyr)) return false;
      return (
        some(lyr.layers, layerIsVisible) ||
        some(lyr.pageItems, itemIsVisible) ||
        some(lyr.groupItems, groupIsVisible)
      );
    }

    function itemIsVisible(item) {
      if (item.hidden || item.guides || item.typename == "GroupItem")
        return false;
      return testBoundsIntersection(item.visibleBounds, ab.artboardRect);
    }

    function groupIsVisible(group) {
      if (group.hidden) return;
      return (
        some(group.pageItems, itemIsVisible) ||
        some(group.groupItems, groupIsVisible)
      );
    }
  }

  // Convert paths representing simple shapes to HTML and hide them
  function exportSymbols(lyr, ab, masks, opts) {
    var items = [];
    var abBox = convertAiBounds(ab.artboardRect);
    var html = "";
    var tagPrefix = opts.tagPrefix || "symbol";
    forLayer(lyr);

    function forLayer(lyr) {
      // if (lyr.hidden) return; // bug -- layers use visible property, not hidden
      if (objectIsHidden(lyr)) return;
      forEach(lyr.pageItems, forPageItem);
      forEach(lyr.layers, forLayer);
      forEach(lyr.groupItems, forGroup);
    }

    function forGroup(group) {
      if (group.hidden) return;
      forEach(group.pageItems, forPageItem);
      forEach(group.groupItems, forGroup);
    }

    function forPageItem(item) {
      var singleGeom, geometries;

      if (
        item.hidden ||
        item.guides ||
        !testBoundsIntersection(item.visibleBounds, ab.artboardRect)
      )
        return;
      // try to convert to circle or rectangle
      // note: filled shapes aren't necessarily closed
      if (item.typename != "PathItem") return;
      singleGeom =
        getRectangleData(item.pathPoints) || getCircleData(item.pathPoints);
      if (singleGeom) {
        geometries = [singleGeom];
      } else if (opts.scaled && item.stroked && !item.closed) {
        // try to convert to line segment(s)
        geometries = getLineGeometry(item.pathPoints);
      }
      if (!geometries) return; // item is not convertible to an HTML symbol

      var innerBlock = "";

      if (tagPrefix == "snippet") {
        innerBlock += "{@render " + opts.prop + "?.()}";

        opts.innerBlock = innerBlock;
        opts.idName = opts.prop;
      } else if (tagPrefix == "div") {
        opts.idName = opts.divName;
      } else if (tagPrefix == "symbol") {
        opts.idName = opts.symbolName;
      }

      html += exportSymbolAsHtml(item, geometries, abBox, opts);
      items.push(item);

      if (tagPrefix != "snippet") {
        item.hidden = true;
      }
    }

    if (html) {
      html =
        '\t\t<div class="' +
        nameSpace +
        tagPrefix +
        "-layer " +
        nameSpace +
        getLayerName(lyr) +
        '">' +
        html +
        "\r\t\t</div>\r";
    }

    return {
      html: html,
      items: items,
    };
  }

  function getBasicSymbolStyle(item) {
    // TODO: handle opacity
    var style = {};
    var stroke, fill;
    style.opacity = roundTo(getComputedOpacity(item) / 100, 2);
    if (getBlendMode(item) == BlendModes.MULTIPLY) {
      style.multiply = true;
    }
    if (item.filled) {
      fill = convertAiColor(item.fillColor);
      style.fill = fill.color;
    }
    if (item.stroked) {
      stroke = convertAiColor(item.strokeColor);
      style.stroke = stroke.color;
      // Chrome doesn't consistently render borders that are less than 1px, which
      // can cause lines to disappear or flicker as the window is resized.
      style.strokeWidth =
        item.strokeWidth < 1 ? 1 : Math.round(item.strokeWidth);
    }
    return style;
  }

  function getPathBBox(points) {
    var bbox = [Infinity, Infinity, -Infinity, -Infinity];
    var p;
    for (var i = 0, n = points.length; i < n; i++) {
      p = points[i].anchor;
      if (p[0] < bbox[0]) bbox[0] = p[0];
      if (p[0] > bbox[2]) bbox[2] = p[0];
      if (p[1] < bbox[1]) bbox[1] = p[1];
      if (p[1] > bbox[3]) bbox[3] = p[1];
    }
    return bbox;
  }

  function getBBoxCenter(bbox) {
    return [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
  }

  // Return array of line records if path is composed only of vertical and/or
  //   horizontal line segments, else return null;
  function getLineGeometry(points) {
    var bbox, w, h, p;
    var lines = [];
    for (var i = 0, n = points.length; i < n; i++) {
      p = points[i];
      if (!pathPointIsCorner(p)) {
        return null;
      }
      if (i === 0) continue;
      bbox = getPathBBox([points[i - 1], p]);
      w = bbox[2] - bbox[0];
      h = bbox[3] - bbox[1];
      if (w < 1 && h < 1) continue; // double vertex = skip
      if (w > 1 && h > 1) return null; // diagonal line = fail
      lines.push({
        type: "line",
        center: getBBoxCenter(bbox),
        width: w,
        height: h,
      });
    }
    return lines.length > 0 ? lines : null;
  }

  function pathPointIsCorner(p) {
    var xy = p.anchor;
    // Vertices of polylines (often) use PointType.SMOOTH. Need to check control points
    //   to determine if the line is curved or not at p
    // if (p.pointType != PointType.CORNER) return false;
    if (
      xy[0] != p.leftDirection[0] ||
      xy[0] != p.rightDirection[0] ||
      xy[1] != p.leftDirection[1] ||
      xy[1] != p.rightDirection[1]
    )
      return false;
    return true;
  }

  // If path described by points array looks like a rectangle, return data for rendering
  //   as a rectangle; else return null
  // points: an array of PathPoint objects
  function getRectangleData(points) {
    var bbox, p, xy;
    // Some rectangles are 4-point closed paths, some are 5-point open paths
    if (points.length < 4 || points.length > 5) return null;
    bbox = getPathBBox(points);
    for (var i = 0; i < 4; i++) {
      p = points[i];
      xy = p.anchor;
      if (!pathPointIsCorner(p)) return null;
      // point must be a bbox corner
      if (
        xy[0] != bbox[0] &&
        xy[0] != bbox[2] &&
        xy[1] != bbox[1] &&
        xy[1] != bbox[3]
      ) {
        return null;
      }
    }
    return {
      type: "rectangle",
      center: getBBoxCenter(bbox),
      width: bbox[2] - bbox[0],
      height: bbox[3] - bbox[1],
    };
  }

  // If path described by points array looks like a circle, return data for rendering
  //    as a circle; else return null
  // Assumes that circles have four anchor points at the top, right, bottom and left
  //    positions around the circle.
  // points: an array of PathPoint objects
  function getCircleData(points) {
    var bbox, p, xy, edges;
    if (points.length != 4) return null;
    bbox = getPathBBox(points);
    for (var i = 0; i < 4; i++) {
      p = points[i];
      xy = p.anchor;
      // heuristic for identifying circles:
      // * each vertex is "smooth"
      // * either x or y coord of each vertex is on the bbox
      if (p.pointType != PointType.SMOOTH) return null;
      edges = 0;
      if (xy[0] == bbox[0] || xy[0] == bbox[2]) edges++;
      if (xy[1] == bbox[1] || xy[1] == bbox[3]) edges++;
      if (edges != 1) return null;
    }
    return {
      type: "circle",
      center: getBBoxCenter(bbox),
      // radius is the average of vertical and horizontal half-axes
      // ellipses are converted to circles
      radius: (bbox[2] - bbox[0] + bbox[3] - bbox[1]) / 4,
    };
  }

  // =================================
  // ai2svelte image functions
  // =================================

  function getArtboardImageName(ab, settings) {
    return getArtboardUniqueName(ab, settings);
  }

  function getLayerImageName(lyr, ab, settings) {
    return getArtboardImageName(ab, settings) + "-" + getLayerName(lyr);
  }

  function getImageId(imgName) {
    return nameSpace + imgName + "-img";
  }

  function uniqAssetName(name, names) {
    var uniqName = name;
    var num = 2;
    while (contains(names, uniqName)) {
      uniqName = name + "-" + num;
      num++;
    }
    return uniqName;
  }

  // setting: value from ai2svelte settings (e.g. 'auto' 'png')
  function resolveArtboardImageFormat(setting, ab) {
    var fmt;
    if (setting == "auto") {
      fmt = artboardContainsVisibleRasterImage(ab) ? "jpg" : "png";
    } else {
      fmt = setting;
    }
    return fmt;
  }

  function objectHasLayer(obj) {
    var hasLayer = false;
    try {
      hasLayer = !!obj.layer;
    } catch (e) {
      // trying to access the layer property of a placed item that is used as an opacity mask
      // throws an error (as of Illustrator 2018)
    }
    return hasLayer;
  }

  function artboardContainsVisibleRasterImage(ab) {
    function test(item) {
      // Calling objectHasLayer() prevents a crash caused by opacity masks created from linked rasters.
      return (
        objectHasLayer(item) &&
        objectOverlapsArtboard(item, ab) &&
        !objectIsHidden(item)
      );
    }
    // TODO: verify that placed items are rasters
    return contains(doc.placedItems, test) || contains(doc.rasterItems, test);
  }

  // Generate images and return HTML embed code
  function convertArtItems(activeArtboard, textFrames, masks, settings) {
    var imgName = getArtboardImageName(activeArtboard, settings);
    var hideTextFrames =
      !isTrue(settings.testing_mode) && settings.render_text_as != "image";
    var textFrameCount = textFrames.length;
    var html = "";
    var uniqNames = [];
    var hiddenItems = [];
    var hiddenLayers = [];
    var i;

    // holds layer's HTML code in a separate array
    // to avoid layer order in final HTML
    // by default, layers are ordered as
    // :symbol, :div, :svg, :png, :block
    // this does not allow higher z-indexed svg layer on top of block layer
    var layerHtml = [];

    checkForOutputFolder(getImageFolder(settings), "image_output_path");

    if (hideTextFrames) {
      for (i = 0; i < textFrameCount; i++) {
        textFrames[i].hidden = true;
      }
    }

    // Symbols in :symbol layers are not scaled
    forEach(findTaggedLayers("symbol"), function (lyr) {
      var name = /(.*):symbol/.exec(lyr.name)[1];
      var obj = exportSymbols(lyr, activeArtboard, masks, {
        scaled: false,
        tagPrefix: "symbol",
        symbolName: name,
      });
      var lyrZ = lyr.zOrderPosition;
      layerHtml.push({
        z: lyrZ,
        html: obj.html + "\r",
      });
      hiddenItems = hiddenItems.concat(obj.items);
    });

    // Symbols in :div layers are scaled
    forEach(findTaggedLayers("div"), function (lyr) {
      var name = /(.*):div/.exec(lyr.name)[1];
      var obj = exportSymbols(lyr, activeArtboard, masks, {
        scaled: true,
        tagPrefix: "div",
        divName: name,
      });
      var lyrZ = lyr.zOrderPosition;
      layerHtml.push({
        z: lyrZ,
        html: obj.html + "\r",
      });
      hiddenItems = hiddenItems.concat(obj.items);
    });

    forEach(findTaggedLayers("svg"), function (lyr) {
      var opts = extend({}, settings, { tagPrefix: "svg" });
      var uniqName = uniqAssetName(
        getLayerImageName(lyr, activeArtboard, settings),
        uniqNames
      );
      var svgHtml = exportImage(
        uniqName,
        "svg",
        activeArtboard,
        masks,
        lyr,
        opts
      );
      var lyrZ = lyr.zOrderPosition;
      if (svgHtml) {
        uniqNames.push(uniqName);
        layerHtml.push({
          z: lyrZ,
          html: svgHtml + "\r",
        });
      }
      lyr.visible = false;
      hiddenLayers.push(lyr);
    });

    // Embed images tagged :png as separate images
    // Inside this function, layers are hidden and unhidden as needed
    forEachImageLayer("png", function (lyr) {
      var opts = extend({}, settings, {
        png_transparent: true,
        tagPrefix: "png",
      });
      // var name = getLayerImageName(lyr, activeArtboard, settings);
      var name = /(.*):png/.exec(lyr.name)[1];
      var fmt = contains(settings.image_format || [], "png24")
        ? "png24"
        : "png";
      var lyrZ = lyr.zOrderPosition;
      // This test prevents empty images, but is expensive when a layer contains many art objects...
      // consider only testing if an option is set by the user.
      if (testLayerArtboardIntersection(lyr, activeArtboard)) {
        var pngHtml =
          exportImage(name, fmt, activeArtboard, null, null, opts) + "\r";
        layerHtml.push({
          z: lyrZ,
          html: pngHtml,
        });
      }
      hiddenLayers.push(lyr); // need to unhide this layer later, after base image is captured
    });

    docSettings.snippetProps = [];

    forEach(findSnippets("snippet").reverse(), function (lyr) {
      var lyrZ = lyr.zOrderPosition;
      var snippetProp = lyr.name.match(new RegExp(/(.*):snippet/))[1];

      docSettings.snippetProps.push(snippetProp);

      var obj = exportSymbols(lyr, activeArtboard, masks, {
        scaled: true,
        tagPrefix: "snippet",
        prop: snippetProp,
      });

      layerHtml.push({
        z: lyrZ,
        html: obj.html + "\r",
      });

      lyr.visible = false;
      hiddenLayers.push(lyr);
    });

    var sortedLayerHtml = layerHtml.sort(function (a, b) {
      return a.z - b.z;
    });

    var accumulatedHTML = map(sortedLayerHtml, function (layer) {
      return layer.html;
    });

    // placing ab image before other elements
    html =
      captureArtboardImage(imgName, activeArtboard, masks, settings) +
      accumulatedHTML.join("");
    // unhide hidden layers (if any)
    forEach(hiddenLayers, function (lyr) {
      lyr.visible = true;
    });

    // unhide text frames
    if (hideTextFrames) {
      for (i = 0; i < textFrameCount; i++) {
        textFrames[i].hidden = false;
      }
    }

    // unhide items exported as symbols
    forEach(hiddenItems, function (item) {
      item.hidden = false;
    });

    return { html: html };
  }

  // collects all the :tag layers
  function findSnippets(tag) {
    var layers = [];
    var regex = new RegExp("^.+:" + tag + "$");
    for (var i = 0; i < doc.layers.length; i++) {
      if (doc.layers[i].name.match(regex)) {
        layers.push(doc.layers[i]);
      }
    }
    return layers;
  }

  function findTaggedLayers(tag) {
    function test(lyr) {
      return tag && parseObjectName(lyr.name)[tag];
    }
    return findLayers(doc.layers, test) || [];
  }

  function getImageFolder(settings) {
    // return pathJoin(docPath, settings.html_output_path, settings.image_output_path);
    if (settings.isPreview) {
      return settings.image_output_path;
    } else {
      return pathJoin(docPath, settings.image_output_path);
    }
  }

  function getImageFileName(name, fmt) {
    // for file extension, convert png24 -> png; other format names are same as extension
    return name + "." + fmt.substring(0, 3);
  }

  function getLayerOpacityCSS(layer) {
    var o = getComputedOpacity(layer);
    return o < 100 ? "opacity:" + roundTo(o / 100, 2) + ";" : "";
  }

  // Capture and save an image to the filesystem and return html embed code
  //
  function exportImage(imgName, format, ab, masks, layer, settings) {
    var imgFile = getImageFileName(imgName, format);
    var outputPath = pathJoin(getImageFolder(settings), imgFile);
    var imgId = getImageId(imgName);

    // separate id convention for tagged png layers
    if (settings.tagPrefix == "png") {
      imgId = nameSpace + "png-" + imgName;
    }

    // imgClass: // remove artboard size (careful not to remove deduplication annotations)
    var imgClass = imgId.replace(/-[1-9][0-9]+-/, "-");
    // all images are now absolutely positioned (before, artboard images were
    // position:static to set the artboard height)
    var check = layer && parseObjectName(layer.name).inline;
    var inlineSvg = isTrue(settings.inline_svg) || check;
    var svgInlineStyle, svgLayersArg;
    var svgOutput, html;
    // var divId = nameSpace + "svg-" + imgName;

    imgClass += " " + nameSpace + "aiImg";

    // change id for tagged svg layer
    // after assigning the original class derived from original id
    if (settings.tagPrefix == "svg") {
      var svgName = /(.*):svg/.exec(layer.name)[1];
      imgId = nameSpace + "svg-" + svgName;
    }

    if (format == "svg") {
      imgClass += " " + nameSpace + "svg-layer";

      if (layer) {
        svgInlineStyle = getLayerOpacityCSS(layer);
        svgLayersArg = [layer];
      }
      svgOutput = exportSVG(outputPath, ab, masks, svgLayersArg, settings);
      if (!svgOutput) {
        return ""; // no image was created
      }
      rewriteSVGFile(outputPath, imgId);

      if (inlineSvg) {
        if (settings.tagPrefix == "svg") {
          width = roundTo(svgOutput.width, 1);
          height = roundTo(svgOutput.height, 1);
          left = roundTo(svgOutput.left, 1);
          top = roundTo(svgOutput.top, 1);
          var abBox = convertAiBounds(ab.artboardRect);

          svgInlineStyle += "position: absolute;";
          svgInlineStyle += "width: " + formatCssPct(width, abBox.width) + ";";
          svgInlineStyle +=
            "height: " + formatCssPct(height, abBox.height) + ";";
          svgInlineStyle += "top: " + formatCssPct(top, abBox.height) + ";";
          // vertical margin pct is calculated as pct of width
          svgInlineStyle += "left: " + formatCssPct(left, abBox.width) + ";";

          // remove namespace-aiImg class to avoid other CSS styles
          imgClass = imgClass.replace(" " + nameSpace + "aiImg", "");
        }

        html = generateInlineSvg(
          outputPath,
          imgClass,
          svgInlineStyle,
          settings
        );
        if (layer) {
          message(
            "Generated inline SVG for layer [" + getLayerName(layer) + "]"
          );
        }
      } else {
        // generate link to external SVG file
        html = generateImageHtml(
          imgFile,
          imgId,
          imgClass,
          svgInlineStyle,
          ab,
          settings
        );
        if (layer) {
          message("Exported an SVG layer as " + outputPath.replace(/.*\//, ""));
        }
      }
    } else {
      // export raster image & generate link
      exportRasterImage(outputPath, ab, format, settings);
      html = generateImageHtml(imgFile, imgId, imgClass, null, ab, settings);
    }

    return html;
  }

  function generateInlineSvg(imgPath, imgClass, imgStyle, settings) {
    var svg = readFile(imgPath) || "";
    var attr = ' class="' + imgClass + '"';
    if (imgStyle) {
      attr += ' style="' + imgStyle + '"';
    }
    svg = svg.replace(/<\?xml.*?\?>/, "");
    svg = svg.replace("<svg", "<svg" + attr);
    svg = replaceSvgIds(svg, settings.svg_id_prefix);
    return svg;
  }

  // Replace ids generated by Illustrator with ids that are as close as possible to
  // the original names of objects in the document.
  // prefix: optional namespace string (to avoid collisions with other ids on the page)
  var svgIds; // index of ids
  function replaceSvgIds(svg, prefix) {
    var idRxp = /id="([^"]+)_[0-9]+_"/g; // matches ids generated by AI
    var hexRxp = /_x([1-7][0-9A-F])_/g; // matches char codes inserted by AI
    var dupes = [];
    var msg;
    prefix = prefix || "";
    svgIds = svgIds || {};
    svg = svg.replace(idRxp, replaceId);
    if (dupes.length > 0) {
      msg = truncateString(dupes.sort().join(", "), 65, true);
      warnOnce(
        "Found duplicate SVG " + (dupes.length == 1 ? "id" : "ids") + ": " + msg
      );
    }
    return svg;

    function replaceId(str, id) {
      var fixedId = id.replace(hexRxp, replaceHexCode);
      var uniqId = uniqify(fixedId);
      return 'id="' + prefix + uniqId + '" data-name="' + fixedId + '"';
    }

    function replaceHexCode(str, hex) {
      return String.fromCharCode(parseInt(hex, 16));
    }

    // resolve id collisions by appending a string
    function uniqify(origId) {
      var id = origId,
        n = 1;
      while (id in svgIds) {
        n++;
        id = origId + "-" + n;
      }
      if (n == 2) {
        dupes.push(origId);
      }
      svgIds[id] = true;
      return id;
    }
  }

  // Finds layers that have an image type annotation in their names (e.g. :png)
  //   and passes each tagged layer to a callback, after hiding all other content
  // Side effect: Tagged layers remain hidden after the function completes
  //   (they have to be unhidden later)
  function forEachImageLayer(imageType, callback) {
    var targetLayers = findTaggedLayers(imageType); // only finds visible layers with a tag
    var hiddenLayers = [];
    if (targetLayers.length === 0) return;

    // Hide all visible layers (image export captures entire artboard)
    forEach(findLayers(doc.layers), function (lyr) {
      // Except: don't hide layers that are children of a targeted layer
      // (inconvenient to unhide these selectively later)
      if (
        find(targetLayers, function (target) {
          return layerIsChildOf(lyr, target);
        })
      )
        return;
      lyr.visible = false;
      hiddenLayers.push(lyr);
    });

    forEach(targetLayers, function (lyr) {
      // show layer (and any hidden parent layers)
      unhideLayer(lyr);
      callback(lyr);
      lyr.visible = false; // hide again
    });

    // Re-show all layers except image layers
    forEach(hiddenLayers, function (lyr) {
      if (indexOf(targetLayers, lyr) == -1) {
        lyr.visible = true;
      }
    });
  }

  // ab: artboard (assumed to be the active artboard)
  function captureArtboardImage(imgName, ab, masks, settings) {
    var formats = settings.image_format;
    var imgHtml;

    // This test can be expensive... consider enabling the empty artboard test only if an option is set.
    // if (testEmptyArtboard(ab)) return '';

    if (!formats.length) {
      warnOnce(
        "No images were created because no image formats were specified."
      );
      return "";
    }

    if (
      formats[0] != "auto" &&
      formats[0] != "jpg" &&
      artboardContainsVisibleRasterImage(ab)
    ) {
      warnOnce(
        "An artboard contains a raster image -- consider exporting to jpg instead of " +
          formats[0] +
          "."
      );
    }

    forEach(formats, function (fmt) {
      var html;
      fmt = resolveArtboardImageFormat(fmt, ab);
      html = exportImage(imgName, fmt, ab, masks, null, settings);
      if (!imgHtml) {
        // use embed code for first of multiple formats
        imgHtml = html;
      }
    });
    return imgHtml;
  }

  // Create an <img> tag for the artboard image
  function generateImageHtml(imgFile, imgId, imgClass, imgStyle, ab, settings) {
    var imgDir;

    imgDir =
      "{ assetsPath.replace(new RegExp('/([^/.]+)$'), '/$1/') || '/' }" +
      settings.image_source_path;

    var imgAlt = encodeHtmlEntities(settings.image_alt_text || ""),
      html,
      src;

    if (settings.isPreview) {
      // preview-xs.jpg -> {previewXS}
      var grps = imgFile.match(/(.*)-(.*)\..*/);
      var importName = `${grps[1]}${grps[2].toString().toUpperCase()}`;
      src = `{${importName}}`;

      previewImageImports.push(`import ${importName} from './${imgFile}';`);
    } else {
      src = pathJoin(imgDir, imgFile);
    }

    html =
      '\t\t<div id="' +
      imgId +
      '" class="' +
      imgClass +
      '" alt="' +
      imgAlt +
      '"';
    html += ' style="';
    if (imgStyle) {
      html += imgStyle + ";";
    }

    html += "background-image: url(" + src + ');"';

    if (isTrue(settings.use_lazy_loader)) {
      // native lazy loading seems to work well -- images aren't loaded when
      // hidden or far from the viewport.
      html += ' loading="lazy"';
    }

    html += "></div>";

    return html;
  }

  // Returns 1 or 2 (corresponding to standard pixel scale and 'retina' pixel scale)
  // format: png, png24 or jpg
  // doubleres: true/false ('always' option has been removed)
  // NOTE: this function used to force single-res for png images > 3 megapixels,
  //   because of resource limits on early iphones. This rule has been changed
  //   to a warning and the limit increased.
  function getOutputImagePixelRatio(width, height, format, doubleres) {
    var k = isTrue(doubleres) ? 2 : 1;
    // thresholds may be obsolete
    var warnThreshold = format == "jpg" ? 32 * 1024 * 1024 : 5 * 1024 * 1024; // jpg and png
    var pixels = width * height * k * k;
    if (pixels > warnThreshold) {
      warn(
        "An output image contains ~" +
          Math.round(pixels / 1e6) +
          " million pixels -- this may cause problems on mobile devices"
      );
    }
    return k;
  }

  // Exports contents of active artboard as an image (without text, unless in test mode)
  // imgPath: full path of output file
  // ab: assumed to be active artboard
  // format: png, png24, jpg
  //
  function exportRasterImage(imgPath, ab, format, settings) {
    // This constant is specified in the Illustrator Scripting Reference under ExportOptionsJPEG.
    var MAX_JPG_SCALE = 776.19;
    var abPos = convertAiBounds(ab.artboardRect);
    var imageScale, exportOptions, fileType;

    if (settings.image_width) {
      // fixed width (used for promo image output)
      imageScale = (100 * settings.image_width) / abPos.width;
    } else {
      imageScale =
        100 *
        getOutputImagePixelRatio(
          abPos.width,
          abPos.height,
          format,
          settings.use_2x_images_if_possible
        );
    }

    if (format == "png") {
      fileType = ExportType.PNG8;
      exportOptions = new ExportOptionsPNG8();
      exportOptions.colorCount = settings.png_number_of_colors;
      exportOptions.transparency = isTrue(settings.png_transparent);
    } else if (format == "png24") {
      fileType = ExportType.PNG24;
      exportOptions = new ExportOptionsPNG24();
      exportOptions.transparency = isTrue(settings.png_transparent);
    } else if (format == "jpg") {
      if (imageScale > MAX_JPG_SCALE) {
        imageScale = MAX_JPG_SCALE;
        warn(
          imgPath.split("/").pop() +
            " was output at a smaller size than desired because of a limit on jpg exports in Illustrator." +
            " If the file needs to be larger, change the image format to png which does not appear to have limits."
        );
      }
      fileType = ExportType.JPEG;
      exportOptions = new ExportOptionsJPEG();
      exportOptions.qualitySetting = settings.jpg_quality;
    } else {
      warn("Unsupported image format: " + format);
      return;
    }

    exportOptions.horizontalScale = imageScale;
    exportOptions.verticalScale = imageScale;
    exportOptions.artBoardClipping = true;
    exportOptions.antiAliasing = false;
    app.activeDocument.exportFile(new File(imgPath), fileType, exportOptions);
  }

  function makeTmpDocument(doc, ab) {
    // create temp document (pretty slow -- ~1.5s)
    var artboardBounds = ab.artboardRect;
    var doc2 = app.documents.add(
      DocumentColorSpace.RGB,
      doc.width,
      doc.height,
      1
    );
    doc2.pageOrigin = doc.pageOrigin; // not sure if needed
    doc2.rulerOrigin = doc.rulerOrigin;
    // The following caused MRAP
    // doc2.artboards[0].artboardRect = ab.artboardRect;
    doc2.artboards[0].artboardRect = artboardBounds;
    return doc2;
  }

  // Copy contents of an artboard to a temporary document, excluding objects
  //   that are hidden by masks
  // items: Optional argument to copy specific layers or items (default is all layers in the doc)
  // Returns a newly-created document containing artwork to export, or null
  //   if no image should be created.
  //
  // TODO: grouped text is copied (but hidden). Avoid copying text in groups, for
  //   smaller SVG output.
  function copyArtboardForImageExport(ab, masks, items) {
    var layerMasks = filter(masks, function (o) {
        return !!o.layer;
      }),
      artboardBounds = ab.artboardRect,
      sourceItems = items || toArray(doc.layers),
      destLayer = doc.layers.add(),
      destGroup = doc.groupItems.add(),
      itemCount = 0,
      groupPos,
      group2,
      doc2;

    destLayer.name = "ArtboardContent";
    destGroup.move(destLayer, ElementPlacement.PLACEATEND);
    forEach(sourceItems, copyLayerOrItem);

    // kludge: export empty documents if items argument is missing (assuming
    //    this is the main artboard image, which is needed to set the container size)
    if (itemCount > 0 || !items) {
      // need to save group position before copying to second document. Oddly,
      // the reported position of the original group changes after duplication
      groupPos = destGroup.position;
      doc2 = makeTmpDocument(doc, ab);
      group2 = destGroup.duplicate(doc2.layers[0], ElementPlacement.PLACEATEND);
      group2.position = groupPos;
    }
    destGroup.remove();
    destLayer.remove();
    return doc2 || null;

    function copyLayer(lyr) {
      var mask;
      if (lyr.hidden) return; // ignore hidden layers
      mask = findLayerMask(lyr);
      if (mask) {
        copyMaskedLayerAsGroup(lyr, mask);
      } else {
        forEach(getSortedLayerItems(lyr), copyLayerOrItem);
      }
    }

    function removeHiddenItems(group) {
      // only remove text frames, for performance
      // TODO: consider checking all item types
      // TODO: consider checking subgroups (recursively)
      // FIX: convert group.textFrames to array to avoid runtime error 'No such element' in forEach()
      forEach(toArray(group.textFrames), removeItemIfHidden);
    }

    function removeItemIfHidden(item) {
      if (item.hidden) item.remove();
    }

    // Item: Layer (sublayer) or PageItem
    function copyLayerOrItem(item) {
      if (item.typename == "Layer") {
        copyLayer(item);
      } else {
        copyPageItem(item, destGroup);
      }
    }

    // TODO: locked objects in masked layer may not be included in mask.items array
    //   consider traversing layer in this function ...
    //   make sure doubly masked objects aren't copied twice
    function copyMaskedLayerAsGroup(lyr, mask) {
      var maskBounds = mask.mask.geometricBounds;
      var newMask, newGroup;
      if (!testBoundsIntersection(artboardBounds, maskBounds)) {
        return;
      }
      newGroup = doc.groupItems.add();
      newGroup.move(destGroup, ElementPlacement.PLACEATEND);
      forEach(mask.items, function (item) {
        copyPageItem(item, newGroup);
      });
      if (newGroup.pageItems.length > 0) {
        // newMask = duplicateItem(mask.mask, destGroup);
        // TODO: refactor
        newMask = mask.mask.duplicate(destGroup, ElementPlacement.PLACEATEND);
        newMask.moveToBeginning(newGroup);
        newGroup.clipped = true;
      } else {
        newGroup.remove();
      }
    }

    // Remove opacity and multiply from an item and add to the item's
    // name property (exported as an SVG id). This prevents AI's SVG exporter
    // from converting these items to images. The styles are later parsed out
    // of the SVG id in reapplyEffectsInSVG().
    // Example names: Z--opacity50  Z--multiply--original-name
    // TODO: handle other styles that cause image conversion
    // (This trick does not work for many other effects, like drop shadows and
    //  styles added via the Appearance panel).
    function handleEffects(item) {
      var name = "";
      if (item.opacity && item.opacity < 100) {
        name += "-opacity" + item.opacity;
        item.opacity = 100;
      }
      if (item.blendingMode == BlendModes.MULTIPLY) {
        item.blendingMode = BlendModes.NORMAL;
        name += "-multiply";
      }
      if (name) {
        if (item.name) {
          name += "--" + item.name;
        }
        item.name = "Z-" + name;
      }
    }

    function findLayerMask(lyr) {
      return find(layerMasks, function (o) {
        return o.layer == lyr;
      });
    }

    function copyPageItem(item, dest) {
      var excluded =
        // item.typename == 'TextFrame' || // text objects should be copied if visible
        !testBoundsIntersection(item.geometricBounds, artboardBounds) ||
        objectIsHidden(item) ||
        item.clipping;
      var copy;
      if (!excluded) {
        copy = item.duplicate(dest, ElementPlacement.PLACEATEND); //  duplicateItem(item, dest);
        handleEffects(copy);
        itemCount++;
        if (copy.typename == "GroupItem") {
          removeHiddenItems(copy);
        }
      }
    }
  }

  // Returns true if a file was created or else false (because svg document was empty);
  function exportSVG(ofile, ab, masks, items, settings) {
    var width = 0;
    var height = 0;
    var left = 0;
    var top = 0;
    //   Illustrator's SVG output contains all objects in a document (it doesn't
    //   clip to the current artboard), so we copy artboard objects to a temporary
    //   document for export.
    var parentArtboardBounds = convertAiBounds(ab.artboardRect);
    var exportDoc = copyArtboardForImageExport(ab, masks, items);
    var opts = new ExportOptionsSVG();
    if (!exportDoc) return false;

    opts.embedAllFonts = false;
    opts.fontSubsetting = SVGFontSubsetting.None;
    opts.compressed = false;
    opts.documentEncoding = SVGDocumentEncoding.UTF8;
    opts.embedRasterImages = isTrue(settings.svg_embed_images);
    // opts.DTD                   = SVGDTDVersion.SVG1_1;
    opts.DTD = SVGDTDVersion.SVGTINY1_2;
    opts.cssProperties = SVGCSSPropertyLocation.STYLEATTRIBUTES;

    // SVGTINY* DTD variants:
    //  * Smaller file size (50% on one test file)
    //  * Convert raster/vector effects to external .png images (other DTDs use jpg)

    exportDoc.activate();

    if (settings.tagPrefix == "svg") {
      // Run menu command to trim svg to visible items
      app.executeMenuCommand("Fit Artboard to artwork bounds");
      var svgBounds = convertAiBounds(exportDoc.artboards[0].artboardRect);
      // trimming artboard repositions final artboard
      // to artwork's x, y
      left = svgBounds.left - parentArtboardBounds.left;
      top = svgBounds.top - parentArtboardBounds.top;

      // if svg bounds exceed parent artboard's bounds,
      // revert trimming operation and use parent artboard's bounds
      if (
        svgBounds.width > parentArtboardBounds.width ||
        svgBounds.height > parentArtboardBounds.height
      ) {
        app.executeMenuCommand("undo");
        svgBounds = convertAiBounds(exportDoc.artboards[0].artboardRect);
        left = 0;
        top = 0;
      }

      width = svgBounds.width;
      height = svgBounds.height;
    }
    exportDoc.exportFile(new File(ofile), ExportType.SVG, opts);

    doc.activate();
    //exportDoc.pageItems.removeAll();
    exportDoc.close(SaveOptions.DONOTSAVECHANGES);

    var response = {
      width: width,
      height: height,
      left: left,
      top: top,
    };

    return response;
  }

  function rewriteSampleSVG(path) {
    var svg = readFile(path);
    if (!svg) return;

    var newSVG = cropSVG(svg);
    saveTextFile(path, newSVG);
  }

  function rewriteSVGFile(path, id) {
    var svg = readFile(path);
    var selector;
    if (!svg) return;
    // replace id created by Illustrator (relevant for inline SVG)
    svg = svg.replace(/id="[^"]*"/, 'id="' + id + '"');
    // reapply opacity and multiply effects
    svg = reapplyEffectsInSVG(svg);
    // prevent SVG strokes from scaling
    // (add element id to selector to prevent inline SVG from affecting other SVG on the page)
    selector = map(
      "rect,circle,path,line,polyline,polygon".split(","),
      function (name) {
        return "#" + id + " " + name;
      }
    ).join(", ");
    svg = injectCSSinSVG(
      svg,
      selector + " { vector-effect: non-scaling-stroke; }"
    );
    // remove images from filesystem and SVG file
    svg = removeImagesInSVG(svg, path);
    saveTextFile(path, svg);
  }

  function reapplyEffectsInSVG(svg) {
    var rxp = /id="Z-(-[^"]+)"/g;
    var opacityRxp = /-opacity([0-9]+)/;
    var multiplyRxp = /-multiply/;
    function replace(a, b) {
      var style = "",
        retn;
      if (multiplyRxp.test(b)) {
        style += "mix-blend-mode:multiply;";
        b = b.replace(multiplyRxp, "");
      }
      if (opacityRxp.test(b)) {
        style += "opacity:" + parseOpacity(b) + ";";
        b = b.replace(opacityRxp, "");
      }
      retn = 'style="' + style + '"';
      if (b.indexOf("--") === 0) {
        // restore original id
        retn = 'id="' + b.substr(2) + '" ' + retn;
      }
      return retn;
    }

    function parseOpacity(str) {
      var found = str.match(opacityRxp);
      return parseInt(found[1]) / 100;
    }
    return svg.replace(rxp, replace);
  }

  function removeImagesInSVG(content, path) {
    var dir = pathSplit(path)[0];
    var count = 0;
    content = content.replace(
      /<image[^<]+href="([^"]+)"[^<]+<\/image>/gm,
      function (match, href) {
        count++;
        deleteFile(pathJoin(dir, href));
        return "";
      }
    );
    if (count > 0) {
      warnOnce(
        "This document contains images or effects that can't be exported to SVG."
      );
    }
    return content;
  }

  // Note: stopped wrapping CSS in CDATA tags (caused problems with NYT cms)
  // TODO: check for XML reserved chars
  function injectCSSinSVG(content, css) {
    var style = "<style>\n" + css + "\n</style>";
    return content.replace("</svg>", style + "\n</svg>");
  }

  // ===================================
  // ai2svelte output generation functions
  // ===================================

  function generateArtboardDiv(ab, group, settings) {
    var id = nameSpace + getArtboardUniqueName(ab, settings);
    var classname = nameSpace + "artboard";
    var widthRange = getArtboardWidthRange(ab, group, settings);
    var visibleRange = getArtboardVisibilityRange(ab, group, settings);
    var abBox = convertAiBounds(ab.artboardRect);
    var aspectRatio = abBox.width / abBox.height;
    var inlineStyle = "";
    var html = "";

    // Set size of graphic using inline CSS
    if (widthRange[0] == widthRange[1]) {
      // fixed width
      // inlineSpacerStyle += "width:" + abBox.width + "px; height:" + abBox.height + "px;";
      inlineStyle +=
        "width:" + abBox.width + "px; height:" + abBox.height + "px;";
    } else {
      if (widthRange[0] > 0) {
        inlineStyle += "min-width: " + widthRange[0] + "px;";
      }
      if (widthRange[1] < Infinity) {
        inlineStyle += "max-width: " + widthRange[1] + "px;";
      }
    }

    inlineStyle += "aspect-ratio: " + abBox.width / abBox.height + ";";

    if (!settings.include_resizer_css) {
      if (visibleRange[1] < Infinity) {
        html +=
          "{#if width && ( width >= " +
          visibleRange[0] +
          " && width <" +
          (Number(visibleRange[1]) + 1) +
          ")}";
      } else {
        html += "{#if width && (width >= " + visibleRange[0] + ")}";
      }

      html += "\n\r";
    }

    html +=
      '\t<div id="' +
      id +
      '" class="' +
      classname +
      '" style="' +
      inlineStyle +
      '"';
    html += ' data-aspect-ratio="' + roundTo(aspectRatio, 3) + '"';
    if (isTrue(settings.include_resizer_widths)) {
      html += ' data-min-width="' + visibleRange[0] + '"';
      if (visibleRange[1] < Infinity) {
        html += ' data-max-width="' + visibleRange[1] + '"';
      }
    }
    html += ">\r";
    return html;
  }

  function generateArtboardCss(ab, group, cssRules, settings) {
    var abId = "#" + nameSpace + getArtboardUniqueName(ab, settings),
      css = formatCssRule(abId, {
        position: "relative",
        overflow: "hidden",
      });

    if (isTrue(settings.include_resizer_css)) {
      css += generateContainerQueryCss(ab, abId, group, settings);
    }

    // classes for paragraph and character styles
    forEach(cssRules, function (cssBlock) {
      css += abId + " " + cssBlock;
    });
    return css;
  }

  function generateContainerQueryCss(ab, abId, group, settings) {
    var css = "";
    var visibleRange = getArtboardVisibilityRange(ab, group, settings);
    var isSmallest = visibleRange[0] === 0;
    var isLargest = visibleRange[1] === Infinity;
    var query;
    if (isSmallest && isLargest) {
      // single artboard: no query needed
      return "";
    }
    // default visibility: smallest ab visible, others hidden
    // (fallback in case browser doesn't support container queries)
    if (!isSmallest) {
      css += formatCssRule(abId, { display: "none" });
    }
    // compose container query
    if (isSmallest) {
      query = "(width >= " + (visibleRange[1] + 1) + "px)";
    } else {
      query = "(width >= " + visibleRange[0] + "px)";
      if (!isLargest) {
        query += " and (width < " + (visibleRange[1] + 1) + "px)";
      }
    }
    css +=
      "@container " +
      getGroupContainerId(group.groupName) +
      " " +
      query +
      " {\r";
    css += formatCssRule(abId, { display: isSmallest ? "none" : "block" });
    css += "}\r";
    return css;
  }

  // mixin to combine multiple animations passed
  // through @include animations(x, y, z)
  function animationMixin() {
    var css = `@mixin animations($values...) {
        $animation: ();
        @each $value in $values {
            $animation: append($animation, $value, comma);
        }
        animation: $animation;
    }`;
    return css;
  }

  // css for snippets to occupy only the space inside the box
  // adds object-fit cover for html image and video snippets
  function snippetCss() {
    var css = "";
    css += ".g-aiSnippet {\r";
    css += ":global {";
    css += "* { \r";
    css += "width: 100%; \r";
    css += "height: 100%; \r";
    css += "padding: 0; \r";
    css += "margin: 0; \r";
    css += "}\r";
    css += "img, video {\r";
    css += "object-fit: cover;\r";
    css += "}\r";
    css += "}\r";
    css += "}\r";

    return css;
  }

  // Get CSS styles that are common to all generated content
  function generatePageCss(containerId, group, settings) {
    var css = "";
    var blockStart = "#" + containerId;

    if (isTrue(settings.include_resizer_css) && group.artboards.length > 1) {
      css += formatCssRule(blockStart, {
        "container-type": "inline-size",
        "container-name": containerId,
      });
    }

    if (settings.max_width) {
      css += formatCssRule(blockStart, {
        "max-width": settings.max_width + "px",
      });
    }

    if (isTrue(settings.center_html_output)) {
      css += formatCssRule(
        blockStart + ",\r" + blockStart + " ." + nameSpace + "artboard",
        { margin: "0 auto" }
      );
    }

    if (settings.alt_text) {
      css += formatCssRule(blockStart + " ." + nameSpace + "aiAltText", {
        position: "absolute",
        left: "-10000px",
        width: "1px",
        height: "1px",
        overflow: "hidden",
        "white-space": "nowrap",
      });
    }

    if (settings.clickable_link !== "") {
      css += formatCssRule(blockStart + " ." + nameSpace + "ai2svelteLink", {
        display: "block",
      });
    }

    // default <p> styles
    css += formatCssRule(blockStart + " p", { margin: "0" });
    if (isTrue(settings.testing_mode)) {
      css += formatCssRule(blockStart + " p", {
        color: "rgba(209, 0, 0, 0.5) !important",
      });
    }

    css += formatCssRule(blockStart + " ." + nameSpace + "aiAbs", {
      position: "absolute",
    });

    css += formatCssRule(blockStart + " ." + nameSpace + "aiImg", {
      position: "absolute",
      top: "0",
      display: "block",
      width: "100% !important",
      height: "100%",
      "background-size": "contain",
      "background-repeat": "no-repeat",
    });

    css += formatCssRule(blockStart + " ." + getSymbolClass(), {
      position: "absolute",
      "box-sizing": "border-box",
    });

    css += formatCssRule(blockStart + " ." + nameSpace + "aiPointText p", {
      "white-space": "nowrap",
    });

    // if (docSettings.snippetProps) {
    //   css += snippetCss();
    // }

    css += animationMixin();

    return css;
  }

  function addTextBlockContent(output, content) {
    if (content.css) {
      output.css += "\r/* Custom CSS */\r" + content.css + "\r";
    }
    if (content["html-before"]) {
      output.html +=
        "<!-- Custom HTML -->\r" +
        content["html-before"].join("\r") +
        "\r" +
        output.html +
        "\r";
    }
    if (content["html-after"]) {
      output.html +=
        "\r<!-- Custom HTML -->\r" + content["html-after"].join("\r") + "\r";
    }
    // deprecated
    if (content.html) {
      output.html +=
        "\r<!-- Custom HTML -->\r" + content.html.join("\r") + "\r";
    }
    // TODO: assumed JS contained in <script> tag -- verify this?
    if (content.js) {
      output.js += "\r<!-- Custom JS -->\r" + content.js.join("\r") + "\r";
    }
  }

  // generates <script> code
  function generateSvelteScript() {
    var script = "<script>\r\t";

    script += "let { assetsPath = '/', onAiMounted = () => {}";

    if (docSettings.snippetProps) {
      script += ", " + docSettings.snippetProps.join(", ");
    }

    script += " } = $props();\r";

    if (!settingsArg.settings.include_resizer_css) {
      script += "let width = $state(100);\n\r";

      for (let i = 0; i < previewImageImports.length; i++) {
        script += previewImageImports[i] + "\n\r";
      }
    }

    // add prop for onmount function that defaults to noop
    script += "import { onMount } from 'svelte';\n";
    script += "onMount(() => {\r  onAiMounted();\r});\r";

    script += "\r</script>\r";

    return script;
  }

  // Wrap content HTML in a <div>, add styles and resizer script, write to a file
  function generateOutputHtml(content, group, settings) {
    var pageName = settings.project_name || group.groupName;
    var linkSrc = settings.clickable_link || "";
    var containerId = getGroupContainerId(pageName);
    var responsiveJs = "";
    var altTextId = containerId + "-img-desc";
    var textForFile, html, js, css, commentBlock;
    var htmlFileDestinationFolder, htmlFileDestination;
    var containerClasses = "ai2svelte";

    // accessibility features
    var ariaAttrs = "";
    if (settings.aria_role) {
      ariaAttrs += ' role="' + settings.aria_role + '"';
    }
    if (settings.alt_text) {
      ariaAttrs += ' aria-describedby="' + altTextId + '"';
    }

    progressBar.setTitle("Writing HTML output...");

    commentBlock =
      "<!-- Generated by ai2svelte v" +
      scriptVersion +
      " - " +
      getDateTimeStamp() +
      " -->\r" +
      "<!-- ai file: " +
      doc.name +
      " -->\r";

    // SCRIPT
    html = generateSvelteScript();

    // HTML
    html +=
      '<div id="' +
      containerId +
      '" class="' +
      containerClasses +
      '"' +
      ariaAttrs +
      (settings.include_resizer_css ? "" : "bind:clientWidth={width}") +
      ">\r";

    if (settings.alt_text) {
      html +=
        '<div class="' +
        nameSpace +
        'aiAltText" id="' +
        altTextId +
        '">' +
        encodeHtmlEntities(settings.alt_text) +
        "</div>";
    }
    if (linkSrc) {
      // optional link around content
      html +=
        '\t<a class="' + nameSpace + 'ai2svelteLink" href="' + linkSrc + '">\r';
    }

    html += content.html;

    if (linkSrc) {
      html += "\t</a>\r";
    }
    html += "</div>\r";

    // CSS
    css = '<style lang="scss">\r';

    if (settings.isPreview) {
      css += '@use "../public/shadows.scss" as *;\n';
      css += '@use "../public/animations.scss" as *;\n\n';
    }

    css +=
      generatePageCss(containerId, group, settings) +
      content.css +
      "\r</style>\r";

    // JS
    js = content.js + responsiveJs;

    textForFile =
      "\r" +
      commentBlock +
      css +
      "\r" +
      html +
      "\r" +
      js +
      "<!-- End ai2svelte" +
      " - " +
      getDateTimeStamp() +
      " -->\r";

    textForFile = applyTemplate(textForFile, settings);

    if (settings.isPreview == true) {
      // previews should be stored in extension directory
      htmlFileDestinationFolder = settings.html_output_path;
    } else {
      htmlFileDestinationFolder = docPath + settings.html_output_path;
    }

    checkForOutputFolder(htmlFileDestinationFolder, "html_output_path");
    htmlFileDestination =
      htmlFileDestinationFolder + pageName + settings.html_output_extension;

    // write file
    saveTextFile(htmlFileDestination, textForFile);
  }
}
