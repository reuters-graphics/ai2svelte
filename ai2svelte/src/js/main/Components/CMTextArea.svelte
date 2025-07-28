<script lang="ts">
    import { myTheme } from "../utils/utils";
    import { basicSetup } from "codemirror";
    import { Compartment } from "@codemirror/state";
    import { EditorView, keymap } from "@codemirror/view";
    import type { EditorViewConfig } from "@codemirror/view";
    import { autocompletion } from "@codemirror/autocomplete";
    import {
        indentWithTab,
        insertNewlineAndIndent,
    } from "@codemirror/commands";
    import { css } from "@codemirror/lang-css";
    import { StreamLanguage } from "@codemirror/language";
    import { properties } from "@codemirror/legacy-modes/mode/properties";
    import { vsCodeDark, vsCodeLight } from "@fsegurai/codemirror-theme-bundle";
    import { onMount } from "svelte";
    import { userTheme } from "../stores";

    let editorEle: HTMLElement | undefined = $state();

    interface Props {
        editor?: EditorView;
        textValue: string;
        type: string;
        onUpdate: (value: string) => void;
        autoCompletionTokens?: { label: string; type: string; info: string }[];
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
        onUpdate = $bindable(),
        autoCompletionTokens,
    }: Props = $props();

    let isFocused: boolean = $state(false);

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
        if ($userTheme) {
            changeTheme($userTheme);
        }
    });

    // Block all shortcuts when CodeMirror has focus
    const blockAllShortcuts = EditorView.domEventHandlers({
        keydown(event, view) {
            // Stop all keyboard events from reaching Illustrator
            event.stopPropagation();
            event.stopImmediatePropagation();
            return false; // Allow CodeMirror to handle the event
        },
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
                    x.value.toString().match(/delete/),
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
                updateListener,
                basicSetup,
                EditorView.lineWrapping,
                keymap.of([
                    indentWithTab,
                    { key: "Enter", run: insertNewlineAndIndent },
                ]),
                blockAllShortcuts,
                type == "yaml" ? [StreamLanguage.define(properties)] : css(),
                autocompletion({ override: [customCompletions] }),
                themeConfig.of([getTheme($userTheme)]),
                myTheme,
                EditorView.domEventHandlers({
                    focusin: (e, v) => {
                        isFocused = true;
                    },
                    focusout: (e, v) => {
                        isFocused = false;
                    },
                }),
            ],
        } as EditorViewConfig);
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
