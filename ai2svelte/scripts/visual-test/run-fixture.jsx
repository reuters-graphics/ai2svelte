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
    if (settingsArg.translationFixture) {
      var testCase = settingsArg.translationFixture;
      delete settingsArg.translationFixture;
      if (testCase.inlineStyleText) {
        var markerStart = testCase.sourceText.indexOf(testCase.inlineStyleText);
        if (markerStart < 0) {
          throw new Error("The translation fixture inline style marker is missing.");
        }
        var markerColor = new RGBColor();
        markerColor.red = 220;
        markerColor.green = 38;
        markerColor.blue = 38;
        for (var frameIndex = 0; frameIndex < doc.textFrames.length; frameIndex++) {
          var frame = doc.textFrames[frameIndex];
          if (String(frame.contents) !== testCase.sourceText) continue;
          for (
            var characterIndex = markerStart;
            characterIndex < markerStart + testCase.inlineStyleText.length;
            characterIndex++
          ) {
            frame.textRange.characters[characterIndex].characterAttributes.fillColor =
              markerColor;
            frame.textRange.characters[characterIndex].characterAttributes.size =
              12;
          }
        }
      }
      var scan = host[ns].fetchDocSelectors(false, true);
      var matches = [];
      for (var i = 0; i < scan.groups.length; i++) {
        var plainSource = scan.groups[i].text.replace(/<\/?[0-9]+>/g, "");
        if (plainSource === testCase.sourceText) {
          matches.push(scan.groups[i]);
        }
      }
      if (matches.length !== 1) {
        throw new Error(
          "Expected one translation fixture source group for " +
            testCase.sourceText +
            ", found " +
            matches.length,
        );
      }
      var source = matches[0];
      var translations = testCase.translations;
      for (var targetLanguage in translations) {
        if (!Object.prototype.hasOwnProperty.call(translations, targetLanguage)) {
          continue;
        }
        for (
          var segmentIndex = 0;
          segmentIndex < translations[targetLanguage].length;
          segmentIndex++
        ) {
          if (translations[targetLanguage][segmentIndex].styleKey == "@inline") {
            if (!source.styleKeys.length) {
              throw new Error("The translation fixture inline style was not scanned.");
            }
            translations[targetLanguage][segmentIndex].styleKey =
              source.styleKeys[0];
          }
        }
      }
      var languages = ["en"];
      if (testCase.languages) {
        for (var languageIndex = 0; languageIndex < testCase.languages.length; languageIndex++) {
          languages.push(testCase.languages[languageIndex]);
        }
      } else {
        for (var language in testCase.translations) {
          if (Object.prototype.hasOwnProperty.call(testCase.translations, language)) {
            languages.push(language);
          }
        }
      }
      if (typeof settingsArg.settings.include_translations == "undefined") {
        settingsArg.settings.include_translations = true;
      }
      settingsArg.textTranslations = {
        schemaVersion: 1,
        sourceLanguage: "en",
        languages: languages,
        nextMessageId: 2,
        messages: [
          {
            id: "m1",
            signature: source.signature,
            sourceText: source.text,
            reviewedSignature: testCase.stale ? "stale-source" : source.signature,
            styleKeys: source.styleKeys,
            translations: translations,
          },
        ],
      };
    }
    host[ns].runAi2Svelte(settingsArg);
  } finally {
    doc.close(SaveOptions.DONOTSAVECHANGES);
  }
})();
