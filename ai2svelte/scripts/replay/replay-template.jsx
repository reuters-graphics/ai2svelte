#target illustrator
(function () {
  var jsxIndexPath = "%%JSX_INDEX_PATH%%";
  var aiFilePath = "%%AI_FILE_PATH%%";
  var calls = %%CALLS_JSON%%;

  $.evalFile(jsxIndexPath);

  // ponytail: id hardcoded from cep.config.ts, same as visual-test/run-fixture.jsx
  var ns = "com.reuters-graphics.ai2svelte";
  var host = typeof $ !== "undefined" ? $ : window;

  // left open on purpose so the replayed state can be inspected
  app.open(new File(aiFilePath));
  for (var i = 0; i < calls.length; i++) {
    $.writeln("replay " + (i + 1) + "/" + calls.length + ": " + calls[i].fn);
    host[ns][calls[i].fn].apply(null, calls[i].args);
  }
})();
