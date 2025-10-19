<script lang="ts">
  import { myTheme } from "../utils/utils";
  import { basicSetup } from "codemirror";
  import { Compartment, Prec } from "@codemirror/state";
  import { EditorView, keymap } from "@codemirror/view";
  import type { EditorViewConfig } from "@codemirror/view";
  import { autocompletion } from "@codemirror/autocomplete";
  import {
    insertNewlineAndIndent,
    indentLess,
    defaultKeymap,
    indentMore,
  } from "@codemirror/commands";
  import { searchKeymap } from "@codemirror/search";
  import { lintGutter, linter, openLintPanel } from "@codemirror/lint";
  import { sass } from "@codemirror/lang-sass";
  import { StreamLanguage } from "@codemirror/language";
  import { properties } from "@codemirror/legacy-modes/mode/properties";
  import { vsCodeDark, vsCodeLight } from "@fsegurai/codemirror-theme-bundle";
  import { onMount } from "svelte";
  import { userData } from "../state.svelte";
  import { getSCSSLanguageService } from "vscode-css-languageservice";
  import { TextDocument } from "vscode-languageserver-textdocument";

  let editorEle: HTMLElement | undefined = $state();

  interface Props {
    editor?: EditorView;
    textValue: string;
    type: string;
    onUpdate?: (value: string) => void;
    autoCompletionTokens?: { label: string; type: string; info: string }[];
    readonly: boolean;
  }

  interface tokenType {
    label: string;
    type: string;
    info: string;
  }
  type tokenTypeArray = tokenType[];

  let {
    editor = $bindable(),
    textValue = $bindable(),
    type = "yaml",
    onUpdate = $bindable(() => {}),
    autoCompletionTokens,
    readonly = false,
  }: Props = $props();

  let isFocused: boolean | null = $state(true);

  const themeConfig = new Compartment();

  let customCompletions: (context: any) => { from: any; options: any } | null;

  function setupAutoCompletions(tokens: tokenTypeArray) {
    // Create completion source
    customCompletions = (context) => {
      let word = context.matchBefore(/\w*/);
      if (!word || (word.from == word.to && !context.explicit)) {
        return null;
      }

      return {
        from: word.from,
        options: tokens.map((token) => ({
          label: token.label,
          type: token.type,
          info: token.info,
        })),
      };
    };
  }

  function getTheme(theme: string) {
    const palette = theme == "dark" ? vsCodeDark : vsCodeLight;
    return palette;
  }

  function changeTheme(theme: string) {
    editor?.dispatch({
      effects: themeConfig.reconfigure([getTheme(theme)]),
    });
  }

  function setupLinter() {
    const cssLinter = linter(async (view) => {
      const document = TextDocument.create(
        "file.scss",
        "scss",
        1,
        view.state.doc.toString()
      );

      const scssService = getSCSSLanguageService();
      const stylesheet = scssService.parseStylesheet(document);
      const scssDiagnostics = scssService.doValidation(document, stylesheet);

      const diagnostics = [];

      scssDiagnostics.forEach((message) => {
        const fromCol = message.range.start.character ?? 0;
        const toCol = message.range.end.character ?? fromCol;
        diagnostics.push({
          from:
            view.state.doc.line(message.range.start.line + 1).from + fromCol,
          to: view.state.doc.line(message.range.end.line + 1).from + toCol,
          severity: message.severity === 1 ? "error" : "warning",
          message: message.message,
        });
      });

      return diagnostics;
    });

    return cssLinter;
  }

  $effect(() => {
    if (userData.theme) {
      changeTheme(userData.theme);
    }
  });

  onMount(() => {
    if (autoCompletionTokens) {
      setupAutoCompletions(autoCompletionTokens);
    }

    const updateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;

      // test if the text change is made by user input
      const userInput = update.transactions[0].annotations.some(
        (x) =>
          x.value.toString().match(/input/) ||
          x.value.toString().match(/delete/)
      );

      // if made by the user input,
      // run onUpdate
      if (update.state.doc.toString() !== textValue && userInput) {
        textValue = update.state.doc.toString();
        onUpdate(update.state.doc.toString());
      }
    });

    const theme = document.documentElement.getAttribute("data-theme");

    editor = new EditorView({
      doc: textValue,
      parent: editorEle,
      extensions: [
        basicSetup,
        Prec.highest(
          keymap.of([
            ...defaultKeymap,
            ...searchKeymap,
            {
              key: "Enter",
              run: (view) => {
                // console.log("Enter command triggered");
                return insertNewlineAndIndent(view);
              },
            },
            {
              key: "Shift-Tab",
              preventDefault: true,
              run: indentLess,
            },
            {
              key: "Tab",
              preventDefault: true,
              run: (view) => {
                // console.log("Tab command triggered");
                return indentMore(view);
              },
            },
          ])
        ),
        updateListener,
        EditorView.editable.of(!readonly),
        themeConfig.of([getTheme(userData.theme)]),
        type == "yaml" ? [StreamLanguage.define(properties)] : sass(),
        autoCompletionTokens
          ? autocompletion({ override: [customCompletions] })
          : autocompletion(),
        EditorView.lineWrapping,
        type == "css" ? setupLinter() : [],
        type == "css" ? lintGutter() : [],
        myTheme,
        EditorView.domEventHandlers({
          focusin: (e, v) => {
            isFocused = true;
            // console.log("focus in", editor?.hasFocus);
          },
          focusout: (e, v) => {
            isFocused = false;
            // console.log("focus out", editor?.hasFocus);
          },
          keydown(event, view) {
            // Stop all keyboard events from bubbling up and reaching parent apps (e.g., Illustrator)

            event.stopPropagation();
            event.stopImmediatePropagation();
            return false; // Allow CodeMirror to handle the event
          },
        }),
      ],
    } as EditorViewConfig);

    editor.requestMeasure();
    editor.focus();
  });

  // runs when styles are added by toggling cards
  $effect(() => {
    if (!readonly) {
      if (textValue !== editor?.state.doc.toString() && !isFocused) {
        // console.log("updated programmatically");
        editor?.dispatch({
          changes: {
            from: 0,
            to: editor.state.doc.length,
            insert: textValue,
          },
        });
      }
    } else {
      if (textValue !== editor?.state.doc.toString()) {
        // console.log("updated programmatically");
        editor?.dispatch({
          changes: {
            from: 0,
            to: editor.state.doc.length,
            insert: textValue,
          },
        });
      }
    }
  });
</script>

<div class="cm-codeeditor" bind:this={editorEle}></div>

<style lang="scss">
  .cm-codeeditor {
    width: 100%;
    position: relative;
    height: 20rem;
    background-color: var(--color-primary);
    border-radius: 8px;
    overflow: hidden;

    :global(.cm-editor) {
      height: 100% !important;
    }
  }
</style>
