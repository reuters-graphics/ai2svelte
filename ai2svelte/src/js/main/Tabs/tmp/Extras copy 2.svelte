<script lang="ts">
    import { onMount, untrack } from "svelte";
    import { fly } from "svelte/transition";
    import { evalTS } from "../../../lib/utils/bolt";
    import shadows, { cheeses } from "../shadows";
    import { initTippy } from "../utils";
    import { styles, updateInProgress } from "../../stores";
    import type { Style } from "../../stores";
    import ColorPicker from "svelte-awesome-color-picker";

    import { basicEditor } from "prism-code-editor/setups";
    import "prism-code-editor/prism/languages/css";
    import "prism-code-editor/prism/languages/css-extras";
    import {
        registerCompletions,
        autoComplete,
        fuzzyFilter,
    } from "prism-code-editor/autocomplete";
    import { cursorPosition } from "prism-code-editor/cursor";
    import { cssCompletion } from "prism-code-editor/autocomplete/css";

    let specimen: string = $state("");
    let specimenWeight: 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 =
        $state(400);
    let backdrop: string | undefined = $state();
    let fillColor: string = $state("#ffffff");
    let strokeColor: string = $state("#000000");
    let shadowSelector: string = $state(".g-text");

    let editor: Element = $state();

    let cssString: string = $derived.by(() => {
        // don't update while its fetching settings from AI
        if (!$updateInProgress) {
            const keys = Object.keys($styles);
            let string = "shadow-settings\n";

            keys.forEach((key) => {
                string += key + " {\n\t";
                string += ($styles[key]?.styles.join(";\n\t") || "") + ";";
                string += "\n}\n";
            });

            evalTS("updateAiSettings", "shadow-settings", string);

            return string;
        }
        return "";
    });

    onMount(async () => {
        // initTippy();

        // const view = new EditorView({
        //     doc: `p { background-color: purple }
        //         h1 {
        //         background-color: red;
        //         @include shadow;
        //         width: 100%;
        //         }`,
        //     parent: editor,
        //     extensions: [basicSetup, css(), oneDark],
        // });

        const view = basicEditor(
            "#shadow-textarea",
            {
                language: "css",
                theme: "github-dark",
            },
            () => console.log("mounted"),
        );

        view.addExtensions(
            cursorPosition(),
            autoComplete({
                filter: fuzzyFilter,
            }),
        );

        view.container.style.height = "50em";
        console.log(view.container.style);

        registerCompletions(["css"], {
            sources: [cssCompletion()],
        });

        // backdrop = await fetchNewImageURL();
        changeSpecimen();
    });

    function createMixinsFile() {
        const mixins = [];

        shadows.forEach((shadow) => {
            const sh = shadow.shadow;
            const name = "shadow-" + shadow.id.toLowerCase().replace(" ", "");
            let str = `@mixin ${name}($clr){\n`;
            str += "text-shadow: " + sh.replaceAll("rgba(0,0,0", "rgba($clr");
            str += "\n}";
            mixins.push(str);
        });

        console.log(mixins.join("\n\n"));
    }

    async function fetchNewImageURL() {
        try {
            const imgURL = await fetch("https://picsum.photos/300/200").then(
                (res) => res.url,
            );
            return imgURL;
        } catch (error) {
            console.log(error);
            return undefined;
        }
    }

    async function changeBackdrop() {
        const newImageURL = await fetchNewImageURL();
        if (newImageURL) {
            backdrop = newImageURL;
        }
    }

    function changeSpecimen() {
        if (cheeses.length) {
            specimen = cheeses[Math.floor(Math.random() * cheeses.length)];
        } else {
            specimen =
                "My dev job requires fixing buggy code with zeal and panache";
        }

        specimenWeight = Math.floor(Math.random() * 9 + 1) * 100;
        console.log({ specimenWeight });
    }

    function addShadowStyle(target, arr, shadowString) {
        arr.push(shadowString);

        const obj: Style = {
            styles: arr,
            shadowName: target.getAttribute("data-name") as string,
        };

        $styles[shadowSelector] = obj;
    }

    function handleShadow(e: Event) {
        const target = e.target as HTMLDivElement;

        if (target) {
            document.querySelectorAll(".card-shadow").forEach((card) => {
                if (card !== target) {
                    card.classList.remove("focused");
                }
            });

            target.classList.toggle("focused");

            const shadowString =
                "@includes shadow-" +
                target.getAttribute("data-name")?.replaceAll(" ", "") +
                "(" +
                strokeColor +
                ")";

            if (target.classList.contains("focused")) {
                if ($styles[shadowSelector]) {
                    const index = $styles[shadowSelector]?.styles.findIndex(
                        (x) => x == shadowString,
                    );

                    if (index == -1) {
                        let styleArr: string[] = [
                            ...($styles[shadowSelector]?.styles ?? []),
                        ];

                        addShadowStyle(target, styleArr, shadowString);
                    }
                } else {
                    let styleArr: string[] = [];
                    addShadowStyle(target, styleArr, shadowString);
                }
            } else {
                const index = $styles[shadowSelector].styles.findIndex(
                    (x) => x == shadowString,
                );
                $styles[shadowSelector].styles.splice(index);
                if ($styles[shadowSelector].styles.length == 0) {
                    delete $styles[shadowSelector];
                }
                $styles = $styles;
            }
        }
    }

    function clearShadowSelection() {
        document.querySelectorAll(".card-shadow").forEach((card) => {
            card.classList.remove("focused");
        });
    }

    function handleIdentifier() {
        clearShadowSelection();
        if (Object.keys($styles).includes(shadowSelector)) {
            document.querySelectorAll(".card-shadow").forEach((card) => {
                if (
                    card.getAttribute("data-name") ===
                        $styles[shadowSelector].shadowName &&
                    !card.classList.contains("focused")
                ) {
                    card.classList.add("focused");
                }
            });
        }
    }
</script>

{#snippet card(name: string, shadow: string)}
    {@const shadowMod = shadow.replaceAll("#000000", strokeColor)}
    {@const shadowName = name
        .toLowerCase()
        .split(" ")
        .map((x, i) => (i == 0 ? x : x[0].toUpperCase() + x.substring(1)))
        .join("")}
    <div
        class="card card-shadow"
        style="background-image: url({backdrop});"
        data-name={shadowName}
        onclick={(e) => handleShadow(e)}
    >
        <p class="card-title" style="pointer-events:none;">{name}</p>
        <div style="position: relative; contain: unset; pointer-events:none;">
            <p class="card-pseudo-specimen" style:font-weight={specimenWeight}>
                {specimen}
            </p>
            <p
                class="card-specimen"
                style="text-shadow: {shadowMod}; color: {fillColor};"
                style:font-weight={specimenWeight}
            >
                {specimen}
            </p>
        </div>
    </div>
{/snippet}

<div class="shadow-content" in:fly={{ y: -50, duration: 300 }}>
    <div id="shadow-summary">
        <p class="title">Shadows</p>
        <div id="extra-configs">
            <button
                id="replace-image"
                onclick={changeBackdrop}
                data-tippy-content="Change backdrop"
                aria-label="Change backdrop"
            >
                <img
                    style="width: 24px;"
                    src="../../assets/replace_image.svg"
                    alt="Change backdrop"
                />
            </button>
            <button
                id="replace-specimen"
                onclick={changeSpecimen}
                data-tippy-content="Change type specimen"
                aria-label="Change type specimen"
            >
                <img
                    style="width: 24px;"
                    src="../../assets/type_specimen.svg"
                    alt="Change type specimen"
                />
            </button>
            <div
                data-tippy-content="Fill color"
                style="--picker-color: {fillColor};"
            >
                <ColorPicker
                    position="responsive"
                    label=""
                    isAlpha={false}
                    bind:hex={fillColor}
                    sliderDirection="horizontal"
                    --picker-width="160px"
                    --picker-height="120px"
                    --slider-width="20px"
                    --picker-indicator-size="40px"
                    --picker-z-index="10"
                    --input-size="24px"
                    --cp-border-color="#ffffff22"
                    --cp-bg-color="#292929"
                    --cp-text-color="#ffffff"
                    --cp-input-color="#292929"
                />
            </div>
            <div
                data-tippy-content="Shadow color"
                style="--picker-color: {strokeColor};"
            >
                <ColorPicker
                    position="responsive"
                    label=""
                    isAlpha={false}
                    bind:hex={strokeColor}
                    sliderDirection="horizontal"
                    --picker-width="160px"
                    --picker-height="120px"
                    --slider-width="20px"
                    --picker-indicator-size="40px"
                    --picker-z-index="10"
                    --input-size="24px"
                    --cp-border-color="#ffffff22"
                    --cp-bg-color="#292929"
                    --cp-text-color="#ffffff"
                    --cp-input-color="#292929"
                />
            </div>
            <!-- <input
                type="color"
                id="fillColor"
                bind:value={fillColor}
                data-tippy-content="Fill color"
            />
            <input
                type="color"
                id="strokeColor"
                bind:value={strokeColor}
                data-tippy-content="Shadow color"
            /> -->
        </div>
    </div>

    <hr />

    <div id="element-identifier-option" class="option">
        <label for="element-identifier" class="option-title"
            >Shadow Identifier</label
        >
        <input
            id={"element-identifier"}
            class="option-text"
            type="text"
            bind:value={shadowSelector}
            oninput={handleIdentifier}
        />
    </div>

    <div class="shadow-container">
        <!-- {#key [backdrop, specimen]} -->
        {#each shadows as shadow (shadow.id)}
            {@render card(shadow.id, shadow.shadow)}
        {/each}
        <!-- {/key} -->
    </div>

    <div id="shadow-textarea" bind:this={editor}>
        <!-- <label class="option-title" for="shadow-code">Shadow JSON</label>
        <textarea
            class="textarea"
            id="shadow-code"
            rows={Math.min(Object.keys($styles).length * 3, 10)}
            spellcheck="false">{cssString}</textarea
        > -->
    </div>
</div>

<style lang="scss">
    @use "../shadows.scss" as *;
</style>
