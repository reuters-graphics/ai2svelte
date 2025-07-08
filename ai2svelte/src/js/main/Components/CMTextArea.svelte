<script lang="ts">
    import { myTheme } from "../Tabs/utils";
    import { basicSetup } from "codemirror";
    import { EditorView, keymap } from "@codemirror/view";
    import type { EditorViewConfig } from "@codemirror/view";
    import { indentWithTab } from "@codemirror/commands";
    import { css } from "@codemirror/lang-css";
    import { yaml } from "@codemirror/lang-yaml";
    import { oneDark } from "@codemirror/theme-one-dark";
    import { onMount } from "svelte";

    let editorEle: HTMLElement | undefined = $state();
    let editor: EditorView | undefined = $state();

    interface Props {
        value: string;
        type: string;
        onUpdate: (event: Event) => void;
    }

    let {
        value = $bindable(),
        type = "yaml",
        onUpdate = $bindable(),
    }: Props = $props();

    let isFocused: boolean = $state(false);

    onMount(() => {
        editor = new EditorView({
            doc: value,
            parent: editorEle,
            extensions: [
                basicSetup,
                keymap.of([indentWithTab]),
                type == "yaml" ? yaml() : css(),
                oneDark,
                myTheme,
                EditorView.domEventHandlers({
                    input: (e, v) => {
                        value = editor?.state.doc.toString();
                        onUpdate(e);
                    },
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

    $effect(() => {
        if (editor && !isFocused) {
            editor.dispatch({
                changes: {
                    from: 0,
                    to: editor.state.doc.length,
                    insert: value,
                },
            });
        }
    });
</script>

<div class="cm-codeeditor" bind:this={editorEle}></div>

<style lang="scss">
    @use "../../variables.scss" as *;

    .cm-codeeditor {
        width: 100%;
        position: relative;
        min-height: 20rem;
    }
</style>
