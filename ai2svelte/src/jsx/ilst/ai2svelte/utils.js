// ================================================
// Constant data
// ================================================

// html entity substitution
const basicCharacterReplacements = [
  ["\x26", "&amp;"],
  ["\x22", "&quot;"],
  ["\x3C", "&lt;"],
  ["\x3E", "&gt;"],
];
const extraCharacterReplacements = [
  ["\xA0", "&nbsp;"],
  ["\xA1", "&iexcl;"],
  ["\xA2", "&cent;"],
  ["\xA3", "&pound;"],
  ["\xA4", "&curren;"],
  ["\xA5", "&yen;"],
  ["\xA6", "&brvbar;"],
  ["\xA7", "&sect;"],
  ["\xA8", "&uml;"],
  ["\xA9", "&copy;"],
  ["\xAA", "&ordf;"],
  ["\xAB", "&laquo;"],
  ["\xAC", "&not;"],
  ["\xAD", "&shy;"],
  ["\xAE", "&reg;"],
  ["\xAF", "&macr;"],
  ["\xB0", "&deg;"],
  ["\xB1", "&plusmn;"],
  ["\xB2", "&sup2;"],
  ["\xB3", "&sup3;"],
  ["\xB4", "&acute;"],
  ["\xB5", "&micro;"],
  ["\xB6", "&para;"],
  ["\xB7", "&middot;"],
  ["\xB8", "&cedil;"],
  ["\xB9", "&sup1;"],
  ["\xBA", "&ordm;"],
  ["\xBB", "&raquo;"],
  ["\xBC", "&frac14;"],
  ["\xBD", "&frac12;"],
  ["\xBE", "&frac34;"],
  ["\xBF", "&iquest;"],
  ["\xD7", "&times;"],
  ["\xF7", "&divide;"],
  ["\u0192", "&fnof;"],
  ["\u02C6", "&circ;"],
  ["\u02DC", "&tilde;"],
  ["\u2002", "&ensp;"],
  ["\u2003", "&emsp;"],
  ["\u2009", "&thinsp;"],
  ["\u200C", "&zwnj;"],
  ["\u200D", "&zwj;"],
  ["\u200E", "&lrm;"],
  ["\u200F", "&rlm;"],
  ["\u2013", "&ndash;"],
  ["\u2014", "&mdash;"],
  ["\u2018", "&lsquo;"],
  ["\u2019", "&rsquo;"],
  ["\u201A", "&sbquo;"],
  ["\u201C", "&ldquo;"],
  ["\u201D", "&rdquo;"],
  ["\u201E", "&bdquo;"],
  ["\u2020", "&dagger;"],
  ["\u2021", "&Dagger;"],
  ["\u2022", "&bull;"],
  ["\u2026", "&hellip;"],
  ["\u2030", "&permil;"],
  ["\u2032", "&prime;"],
  ["\u2033", "&Prime;"],
  ["\u2039", "&lsaquo;"],
  ["\u203A", "&rsaquo;"],
  ["\u203E", "&oline;"],
  ["\u2044", "&frasl;"],
  ["\u20AC", "&euro;"],
  ["\u2111", "&image;"],
  ["\u2113", ""],
  ["\u2116", ""],
  ["\u2118", "&weierp;"],
  ["\u211C", "&real;"],
  ["\u2122", "&trade;"],
  ["\u2135", "&alefsym;"],
  ["\u2190", "&larr;"],
  ["\u2191", "&uarr;"],
  ["\u2192", "&rarr;"],
  ["\u2193", "&darr;"],
  ["\u2194", "&harr;"],
  ["\u21B5", "&crarr;"],
  ["\u21D0", "&lArr;"],
  ["\u21D1", "&uArr;"],
  ["\u21D2", "&rArr;"],
  ["\u21D3", "&dArr;"],
  ["\u21D4", "&hArr;"],
  ["\u2200", "&forall;"],
  ["\u2202", "&part;"],
  ["\u2203", "&exist;"],
  ["\u2205", "&empty;"],
  ["\u2207", "&nabla;"],
  ["\u2208", "&isin;"],
  ["\u2209", "&notin;"],
  ["\u220B", "&ni;"],
  ["\u220F", "&prod;"],
  ["\u2211", "&sum;"],
  ["\u2212", "&minus;"],
  ["\u2217", "&lowast;"],
  ["\u221A", "&radic;"],
  ["\u221D", "&prop;"],
  ["\u221E", "&infin;"],
  ["\u2220", "&ang;"],
  ["\u2227", "&and;"],
  ["\u2228", "&or;"],
  ["\u2229", "&cap;"],
  ["\u222A", "&cup;"],
  ["\u222B", "&int;"],
  ["\u2234", "&there4;"],
  ["\u223C", "&sim;"],
  ["\u2245", "&cong;"],
  ["\u2248", "&asymp;"],
  ["\u2260", "&ne;"],
  ["\u2261", "&equiv;"],
  ["\u2264", "&le;"],
  ["\u2265", "&ge;"],
  ["\u2282", "&sub;"],
  ["\u2283", "&sup;"],
  ["\u2284", "&nsub;"],
  ["\u2286", "&sube;"],
  ["\u2287", "&supe;"],
  ["\u2295", "&oplus;"],
  ["\u2297", "&otimes;"],
  ["\u22A5", "&perp;"],
  ["\u22C5", "&sdot;"],
  ["\u2308", "&lceil;"],
  ["\u2309", "&rceil;"],
  ["\u230A", "&lfloor;"],
  ["\u230B", "&rfloor;"],
  ["\u2329", "&lang;"],
  ["\u232A", "&rang;"],
  ["\u25CA", "&loz;"],
  ["\u2660", "&spades;"],
  ["\u2663", "&clubs;"],
  ["\u2665", "&hearts;"],
  ["\u2666", "&diams;"],
];

// =================================
// JS utility functions
// =================================

function replaceAll(str, search, replacement) {
  return str.split(search).join(replacement);
}

function forEach(arr, cb) {
  for (var i = 0, n = arr.length; i < n; i++) {
    cb(arr[i], i);
  }
}

function map(arr, cb) {
  var arr2 = [];
  for (var i = 0, n = arr.length; i < n; i++) {
    arr2.push(cb(arr[i], i));
  }
  return arr2;
}

function filter(arr, test) {
  var filtered = [];
  for (var i = 0, n = arr.length; i < n; i++) {
    if (test(arr[i], i)) {
      filtered.push(arr[i]);
    }
  }
  return filtered;
}

// obj: value or test function
function indexOf(arr, obj) {
  var test = typeof obj == "function" ? obj : null;
  for (var i = 0, n = arr.length; i < n; i++) {
    if (test ? test(arr[i]) : arr[i] === obj) {
      return i;
    }
  }
  return -1;
}

function find(arr, obj) {
  var i = indexOf(arr, obj);
  return i == -1 ? null : arr[i];
}

function contains(arr, obj) {
  return indexOf(arr, obj) >= 0;
}

// alias for contains() with function arg
function some(arr, cb) {
  return indexOf(arr, cb) >= 0;
}

function extend(o) {
  for (var i = 1; i < arguments.length; i++) {
    forEachProperty(arguments[i], add);
  }
  function add(v, k) {
    o[k] = v;
  }
  return o;
}

function forEachProperty(o, cb) {
  for (var k in o) {
    if (o.hasOwnProperty(k)) {
      cb(o[k], k);
    }
  }
}

// Return new object containing properties of a that are missing or different in b
// Return null if output object would be empty
// a, b: JS objects
function objectDiff(a, b) {
  var diff = null;
  for (var k in a) {
    if (a[k] != b[k] && a.hasOwnProperty(k)) {
      diff = diff || {};
      diff[k] = a[k];
    }
  }
  return diff;
}

// return elements in array "a" but not in array "b"
function arraySubtract(a, b) {
  var diff = [],
    alen = a.length,
    blen = b.length,
    i,
    j;
  for (i = 0; i < alen; i++) {
    diff.push(a[i]);
    for (j = 0; j < blen; j++) {
      if (a[i] === b[j]) {
        diff.pop();
        break;
      }
    }
  }
  return diff;
}

// Copy elements of an array-like object to an array
function toArray(obj) {
  var arr = [];
  for (var i = 0, n = obj.length; i < n; i++) {
    arr[i] = obj[i]; // about 2x faster than push() (apparently)
    // arr.push(obj[i]);
  }
  return arr;
}

// multiple key sorting function based on https://github.com/Teun/thenBy.js
// first by length of name, then by population, then by ID
// data.sort(
//     firstBy(function (v1, v2) { return v1.name.length - v2.name.length; })
//     .thenBy(function (v1, v2) { return v1.population - v2.population; })
//     .thenBy(function (v1, v2) { return v1.id - v2.id; });
// );
function firstBy(f1, f2) {
  var compare = f2
    ? function (a, b) {
        return f1(a, b) || f2(a, b);
      }
    : f1;
  compare.thenBy = function (f) {
    return firstBy(compare, f);
  };
  return compare;
}

// Remove whitespace from beginning and end of a string
function trim(s) {
  return s.replace(/^[\s\uFEFF\xA0\x03]+|[\s\uFEFF\xA0\x03]+$/g, "");
}

// splits a string into non-empty lines
function stringToLines(str) {
  var empty = /^\s*$/;
  return filter(str.split(/[\r\n\x03]+/), function (line) {
    return !empty.test(line);
  });
}

function zeroPad(val, digits) {
  var str = String(val);
  while (str.length < digits) str = "0" + str;
  return str;
}

function truncateString(str, maxlen, useEllipsis) {
  // TODO: add ellipsis, truncate at word boundary
  if (str.length > maxlen) {
    str = str.substr(0, maxlen);
    if (useEllipsis) str += "...";
  }
  return str;
}

function makeKeyword(text) {
  return text.replace(/[^A-Za-z0-9_-]+/g, "_");
}

// TODO: don't convert ampersand in pre-existing entities (e.g. "&quot;" -> "&amp;quot;")
function encodeHtmlEntities(text) {
  return replaceChars(
    text,
    basicCharacterReplacements.concat(extraCharacterReplacements)
  );
}

function cleanHtmlText(text) {
  // Characters "<>& are not replaced
  return replaceChars(text, extraCharacterReplacements);
}

function replaceChars(str, replacements) {
  var charCode;
  for (var i = 0, n = replacements.length; i < n; i++) {
    charCode = replacements[i];
    if (str.indexOf(charCode[0]) > -1) {
      str = str.replace(new RegExp(charCode[0], "g"), charCode[1]);
    }
  }
  return str;
}

function straightenCurlyQuotesInsideAngleBrackets(text) {
  // This function's purpose is to fix quoted properties in HTML tags that were
  // typed into text blocks (Illustrator tends to automatically change single
  // and double quotes to curly quotes).
  // thanks to jashkenas
  // var quoteFinder = /[\u201C‘’\u201D]([^\n]*?)[\u201C‘’\u201D]/g;
  var tagFinder = /<[^\n]+?>/g;
  return text.replace(tagFinder, function (tag) {
    return straightenCurlyQuotes(tag);
  });
}

function straightenCurlyQuotes(str) {
  return str.replace(/[\u201C\u201D]/g, '"').replace(/[‘’]/g, "'");
}

// Not very robust -- good enough for printing a warning
function findHtmlTag(str) {
  var match;
  if (str.indexOf("<") > -1) {
    // bypass regex check
    match = /<(\w+)[^>]*>/.exec(str);
  }
  return match ? match[1] : null;
}

function addEnclosingTag(tagName, str) {
  var openTag = "<" + tagName;
  var closeTag = "</" + tagName + ">";
  if (new RegExp(openTag).test(str) === false) {
    str = openTag + ">\r" + str;
  }
  if (new RegExp(closeTag).test(str) === false) {
    str = str + "\r" + closeTag;
  }
  return str;
}

function stripTag(tagName, str) {
  var open = new RegExp("<" + tagName + "[^>]*>", "g");
  var close = new RegExp("</" + tagName + ">", "g");
  return str.replace(open, "").replace(close, "");
}

// precision: number of decimals in rounded number
function roundTo(number, precision) {
  var d = Math.pow(10, precision || 0);
  return Math.round(number * d) / d;
}

function getDateTimeStamp() {
  var d = new Date();
  var year = d.getFullYear();
  var date = zeroPad(d.getDate(), 2);
  var month = zeroPad(d.getMonth() + 1, 2);
  var hour = zeroPad(d.getHours(), 2);
  var min = zeroPad(d.getMinutes(), 2);
  return year + "-" + month + "-" + date + " " + hour + ":" + min;
}

function formatCssRule(selector, obj) {
  var css = selector + " {\r";
  for (var k in obj) {
    css += "\t" + k + ": " + obj[k] + ";\r";
  }
  css += "}\r";
  return css;
}

function getCssColor(r, g, b, opacity) {
  var col, o;
  if (opacity > 0 && opacity < 100) {
    o = roundTo(opacity / 100, 2);
    col = "rgba(" + r + "," + g + "," + b + "," + o + ")";
  } else {
    col = "rgb(" + r + "," + g + "," + b + ")";
  }
  return col;
}

// Test if two rectangles are the same, to within a given tolerance
// a, b: two arrays containing AI rectangle coordinates
// maxOffs: maximum pixel deviation on any side
function testSimilarBounds(a, b, maxOffs) {
  if (maxOffs >= 0 === false) maxOffs = 1;
  for (var i = 0; i < 4; i++) {
    if (Math.abs(a[i] - b[i]) > maxOffs) return false;
  }
  return true;
}

// Apply very basic string substitution to a template
function applyTemplate(template, replacements) {
  var keyExp = "([_a-zA-Z][\\w-]*)";
  var mustachePattern = new RegExp(
    "\\{\\{\\{? *" + keyExp + " *\\}\\}\\}?",
    "g"
  );
  var ejsPattern = new RegExp("<%=? *" + keyExp + " *%>", "g");
  var replace = function (match, name) {
    var lcname = name.toLowerCase();
    if (name in replacements) return replacements[name];
    if (lcname in replacements) return replacements[lcname];
    return match;
  };
  return template
    .replace(mustachePattern, replace)
    .replace(ejsPattern, replace);
}

// Similar to Node.js path.join()
function pathJoin() {
  var path = "";
  forEach(arguments, function (arg) {
    if (!arg) return;
    arg = String(arg);
    arg = arg.replace(/^\/+/, "").replace(/\/+$/, "");
    if (path.length > 0) {
      path += "/";
    }
    path += arg;
  });
  return path;
}

// Split a full path into directory and filename parts
function pathSplit(path) {
  var parts = path.split("/");
  var filename = parts.pop();
  return [parts.join("/"), filename];
}

export {
  basicCharacterReplacements,
  extraCharacterReplacements,
  forEach,
  map,
  filter,
  indexOf,
  find,
  contains,
  some,
  extend,
  forEachProperty,
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
  replaceChars,
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
  replaceAll,
};
