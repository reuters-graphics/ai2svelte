<script lang="ts">
    import { onMount, untrack } from "svelte";
    import { fly } from "svelte/transition";
    import { evalTS } from "../../lib/utils/bolt";

    import { snippets } from "../stores";
    import { basicSetup } from "codemirror";
    import { EditorView, keymap } from "@codemirror/view";
    import { indentWithTab } from "@codemirror/commands";
    import { json } from "@codemirror/lang-json";
    import { oneDark } from "@codemirror/theme-one-dark";
    import { myTheme } from "./utils";

    import unescapeJs from "unescape-js";

    import SectionTitle from "../Components/SectionTitle.svelte";

    type ContentElements =
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement;

    let allowedComponents = [
        "BeforeAfter",
        "Byline",
        "Custom",
        "Datawrapperchart",
        "EndNotes",
        "FeaturePhoto",
        "GraphicBlock",
        "Headline",
        "HeroHeadline",
        "HTMLImage",
        "HTMLVideo",
        "InfoBox",
        "SimpleTimeline",
        "Table",
        "Video",
    ];

    let activeFormat: string = $state("");

    let uiContent: HTMLElement | undefined = $state();
    let uiContentHeight: number = $state(1);
    let codeContent: HTMLElement | undefined = $state();
    let codeContentHeight: number = $state(400);
    let activeHeight: number | undefined = $derived.by(() => {
        if (activeFormat === "UI") {
            return uiContentHeight;
        } else if (activeFormat === "CODE") {
            return codeContentHeight;
        }
    });
    let focusedOption: HTMLElement | undefined | null = $state();

    let editor: Element = $state();

    let view;

    $effect(() => {
        let temp = "";
        Object.keys($snippets).forEach((key, index) => {
            temp += index == 0 ? "" : "\n\n";
            temp += key;
            temp += ": ";
            temp += $snippets[key];
        });
        if (editor) {
            view = new EditorView({
                doc: `${temp}`,
                parent: editor,
                extensions: [
                    basicSetup,
                    json(),
                    keymap.of([indentWithTab]),
                    oneDark,
                    myTheme,
                    EditorView.domEventHandlers({
                        input: (e, v) => {
                            // updateStyle(view.state.doc.toString());
                        },
                    }),
                ],
            });

            console.log(view);
        }
    });

    onMount(() => {
        activeFormat = "UI";
    });

    // // handles clicks to change ui format
    function handleClick(e: Event) {
        e.preventDefault();
        if (e.target && e.target instanceof HTMLElement) {
            const targetElement = e.target.innerText;
            activeFormat = targetElement;
            if (activeFormat === "UI") {
                // compileSettings();
            }
        }
    }

    // // converts string in textarea to js object
    // function convertStringToObject(s: string) {
    //     const obj: { [key: string]: unknown } = {};
    //     s.trim()
    //         .split("\n")
    //         .forEach((line) => {
    //             const [key, ...rest] = line.split(":");
    //             if (key && rest.length) {
    //                 let value: unknown = rest.join(":").trim();
    //                 // Try to convert to number if possible
    //                 if (parseInt(value as string)) {
    //                     value = Number(value);
    //                 }
    //                 obj[key.trim()] = value;
    //             }
    //         });
    //     return obj;
    // }

    // // handles text change in textarea
    // function handleTextChange(e: Event) {
    //     e.preventDefault();

    //     if (e.target && e.target instanceof HTMLTextAreaElement) {
    //         const settingsText = e.target.value;
    //         $settingsObject = convertStringToObject(settingsText);
    //     }
    // }

    // // compiles text from text area into settingsObject
    // function compileSettings() {
    //     const formElement = document.querySelector("#ui-form");
    //     const labels = formElement?.querySelectorAll("label");

    //     labels?.forEach((label) => {
    //         const key = label.getAttribute("for");

    //         const inputElement = document.querySelector("#" + key) as
    //             | HTMLInputElement
    //             | HTMLSelectElement
    //             | null;
    //         const val = inputElement ? inputElement.value : null;

    //         if (key) {
    //             $settingsObject[key] = val;
    //         }
    //     });
    // }

    // function isContentElement(
    //     element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
    // ) {
    //     return (
    //         element instanceof HTMLInputElement ||
    //         element instanceof HTMLSelectElement ||
    //         element instanceof HTMLTextAreaElement
    //     );
    // }

    // function handleBlur(e: Event, toParent: boolean = true) {
    //     const target = e.target as ContentElements;
    //     if (target && isContentElement(target)) {
    //         if (toParent) {
    //             target.parentElement?.classList.remove("focused");
    //         } else {
    //             target.classList.remove("focused");
    //         }

    //         const settingsString = compileSettingsString();

    //         evalTS("updateAiSettings", settingsString);
    //     }
    // }

    // function handleFocus(e: Event, toParent: boolean = true) {
    //     const target = e.target as ContentElements;
    //     if (target && isContentElement(target)) {
    //         if (toParent) {
    //             target.parentElement?.classList.add("focused");
    //         } else {
    //             target.classList.add("focused");
    //         }
    //     }
    // }

    // function handleInput(e: Event, key: string) {
    //     const target = e.target as ContentElements;
    //     if (target && isContentElement(target)) {
    //         $settingsObject[key] = target.value;
    //     }
    // }

    // function compileSettingsString() {
    //     const str =
    //         "ai2html-settings\r" +
    //         Object.keys($settingsObject)
    //             .filter((key) => $settingsObject[key] !== null)
    //             .map((key) => `${key}: ${$settingsObject[key]}`)
    //             .join("\n")
    //             .trim();
    //     return str;
    // }

    function handleSnippet(e: Event) {
        const target = e.target;
        if (target && target instanceof HTMLElement) {
            const snippetName = `layer:snippet:${e.target.getAttribute("data-name").toLowerCase()}`;
            console.log(snippetName);
            // evalTS("addSnippetLayer");
        }
    }
</script>

{#snippet formatChoice(name: string)}
    <label
        class="format-button {activeFormat == name ? 'active' : null}"
        onclick={(e) => handleClick(e)}
        for={"format-" + name}
    >
        <input
            type="radio"
            name="format-choice"
            id={"format-" + name}
            value={name}
            checked={activeFormat == name}
        />{name}
    </label>
{/snippet}

{#snippet chip(name: string)}
    <button class="chip" data-name={name} onclick={(e) => handleSnippet(e)}
        >{name}</button
    >
{/snippet}

<div class="tab-content">
    <div class="chips-container">
        {#each allowedComponents as component}
            {@render chip(component)}
        {/each}
    </div>

    <SectionTitle title="Properties" labels={["ui", "code"]} />

    <hr />
</div>

<style lang="scss">
    @use "../../variables.scss" as *;
</style>
