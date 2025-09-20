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
    insertTab,
    defaultKeymap,
    indentWithTab,
    indentMore,
  } from "@codemirror/commands";
  import { css } from "@codemirror/lang-css";
  import { StreamLanguage } from "@codemirror/language";
  import { properties } from "@codemirror/legacy-modes/mode/properties";
  import { vsCodeDark, vsCodeLight } from "@fsegurai/codemirror-theme-bundle";
  import { onMount } from "svelte";
  import { userData } from "../state.svelte";

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
            {
              key: "Enter",
              run: (view) => {
                console.log("Enter command triggered");
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
                console.log("Tab command triggered");
                return indentMore(view);
              },
            },
          ])
        ),
        updateListener,
        EditorView.editable.of(!readonly),
        themeConfig.of([getTheme(userData.theme)]),
        type == "yaml" ? [StreamLanguage.define(properties)] : css(),
        autoCompletionTokens
          ? autocompletion({ override: [customCompletions] })
          : autocompletion(),
        EditorView.lineWrapping,
        myTheme,
        EditorView.domEventHandlers({
          focusin: (e, v) => {
            isFocused = true;
            console.log("focus in", editor?.hasFocus);
          },
          focusout: (e, v) => {
            isFocused = false;
            console.log("focus out", editor?.hasFocus);
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
