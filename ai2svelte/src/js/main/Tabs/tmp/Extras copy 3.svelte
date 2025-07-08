<!-- TODO -->
<!-- pick id, class from Illustrator as identifier -->
<!-- current identifier preview with styles applied -->

<script lang="ts">
    import { onDestroy, onMount, untrack } from "svelte";
    import { fly } from "svelte/transition";
    import { evalTS } from "../../lib/utils/bolt";
    import shadows, { cheeses } from "./shadows";
    import { initTippy } from "./utils";
    import { styles, updateInProgress, isCEP } from "../stores";
    import type { Style } from "../stores";
    import ColorPicker from "svelte-awesome-color-picker";
    import postcss from "postcss";
    import scss from "postcss-scss";
    import { myTheme } from "./utils";

    import { basicSetup } from "codemirror";
    import { EditorView, keymap } from "@codemirror/view";
    import { indentWithTab } from "@codemirror/commands";
    import { css } from "@codemirror/lang-css";
    import { oneDark } from "@codemirror/theme-one-dark";

    let specimen: string = $state("");
    let specimenWeight: 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 =
        $state(400);
    let backdrop: string | undefined = $state();
    let fillColor: string = $state("#ffffff");
    let strokeColor: string = $state("#000000");
    let shadowSelector: string = $state(".g-text");

    let editor: Element = $state();

    let initialLoad = $state(false);

    let view;

    let cssString: string = $derived.by(() => {
        // don't update while its fetching settings from AI
        if (!$updateInProgress) {
            const keys = Object.keys($styles);
            // let string = "shadow-settings\n";
            let string = "";

            keys.forEach((key) => {
                string += key + " {\n\t";
                string += ($styles[key]?.styles.join(";\n\t") || "") + ";";
                string += "\n}\n";
            });

            console.log("updated cssString");

            if ($isCEP) {
                evalTS("updateAiSettings", "shadow-settings", string);
            }
            return string;
        }
        return "";
    });

    $effect(() => {
        if (initialLoad && cssString) {
            dispatchStylesToEditor();
            initialLoad = false;
        }
    });

    onMount(async () => {
        initTippy();

        view = new EditorView({
            doc: `.g-text{
    
}`,
            parent: editor,
            extensions: [
                basicSetup,
                keymap.of([indentWithTab]),
                css(),
                oneDark,
                myTheme,
                EditorView.domEventHandlers({
                    input: (e, v) => {
                        updateStyle(view.state.doc.toString());
                    },
                }),
            ],
        });

        if (!$isCEP) {
            updateStyle(view.state.doc.toString());
        }

        initialLoad = true;

        changeSpecimen();
        backdrop = await fetchNewImageURL();
    });

    onDestroy(() => {});

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
        let newImageURL;
        try {
            newImageURL = await fetchNewImageURL();
        } catch (error) {
            changeBackdrop();
            return;
        }

        if (newImageURL) {
            backdrop = newImageURL;
        }
    }

    function updateStyle(string: string) {
        console.log("updating styles", string);
        let obj;

        obj = postcss.parse(string, { parser: scss }).nodes.map((x) => {
            return {
                selector: x.selector,
                styles: x.nodes.map((s) =>
                    s.type == "decl"
                        ? `${s.prop} : ${s.value}`
                        : s.type == "atrule"
                          ? `@${s.name} ${s.params}`
                          : "",
                ),
            };
        });

        const styleObject = {};

        obj.forEach((x) => {
            $styles[x.selector] = {
                styles: x.styles,
            };
        });
    }

    function changeSpecimen() {
        if (cheeses.length) {
            specimen = cheeses[Math.floor(Math.random() * cheeses.length)];
        } else {
            specimen =
                "My dev job requires fixing buggy code with zeal and panache";
        }

        specimenWeight = Math.floor(Math.random() * 9 + 1) * 100;
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
            // document.querySelectorAll(".card-shadow").forEach((card) => {
            //     if (card !== target) {
            //         card.classList.remove("focused");
            //     }
            // });

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
                $styles[shadowSelector].styles.splice(index, 1);
                if ($styles[shadowSelector].styles.length == 0) {
                    delete $styles[shadowSelector];
                }
                $styles = $styles;
            }
        }

        Object.keys($styles).forEach((selector) => {
            $styles[selector].styles.sort();
        });

        dispatchStylesToEditor();
    }

    function dispatchStylesToEditor() {
        view?.dispatch({
            changes: {
                from: 0,
                to: view.state.doc.length,
                insert: cssString,
            },
        });
    }

    function clearShadowSelection() {
        document.querySelectorAll(".card-shadow").forEach((card) => {
            card.classList.remove("focused");
        });
    }

    function handleIdentifier() {
        clearShadowSelection();

        const regex = /@includes\s+shadow-([a-zA-Z]+)\s*\(/g;

        if (Object.keys($styles).includes(shadowSelector)) {
            const shadowsInIdentifier = [
                ...$styles[shadowSelector].styles.join("\n").matchAll(regex),
            ].map((x) => x[1]);

            console.log(shadowsInIdentifier);
            document.querySelectorAll(".card-shadow").forEach((card) => {
                if (
                    shadowsInIdentifier.includes(
                        card.getAttribute("data-name"),
                    ) &&
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
        {#each shadows as shadow (shadow.id)}
            {@render card(shadow.id, shadow.shadow)}
        {/each}
    </div>

    <div id="shadow-textarea" bind:this={editor}></div>
</div>

<style lang="scss">
    @use "../shadows.scss" as *;
</style>
