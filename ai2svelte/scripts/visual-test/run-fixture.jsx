#target illustrator
(function () {
  var jsxIndexPath = "%%JSX_INDEX_PATH%%";
  var aiFilePath = "%%AI_FILE_PATH%%";
  var settingsArg = %%SETTINGS_JSON%%;

  $.evalFile(jsxIndexPath);

  // ponytail: id hardcoded from cep.config.ts — same value ai2svelte/src/shared/shared.ts
  // derives it from. Update here if that id ever changes.
  var ns = "com.reuters-graphics.ai2svelte";
  var host = typeof $ !== "undefined" ? $ : window;

  var doc = app.open(new File(aiFilePath));
  try {
    host[ns].runAi2Svelte(settingsArg);
  } finally {
    doc.close(SaveOptions.DONOTSAVECHANGES);
  }
})();
