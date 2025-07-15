<!-- TODO -->
<!-- pick id, class from Illustrator as identifier -->
<!-- current identifier preview with styles applied -->

<script lang="ts">
    import { onDestroy, onMount, untrack } from "svelte";
    import { fly, scale, slide } from "svelte/transition";
    import { evalTS } from "../../lib/utils/bolt";
    import shadows, { cheeses } from "./shadows";
    import animations from "./animations.json";
    import { styles, stylesString, updateInProgress, isCEP } from "../stores";
    import type { Style } from "../stores";
    import ColorPicker from "svelte-awesome-color-picker";
    import postcss from "postcss";
    import scss from "postcss-scss";

    import SectionTabBar from "../Components/SectionTabBar.svelte";
    import ShadowCard from "../Components/ShadowCard.svelte";
    import CmTextArea from "../Components/CMTextArea.svelte";
    import Pill from "../Components/Pill.svelte";
    import Input from "../Components/Input.svelte";
    import AnimationCard from "../Components/AnimationCard.svelte";

    let activeTab = $state("");

    let specimen: string = $state("");
    let specimenWeight: 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 =
        $state(400);
    let backdrop: string | undefined = $state();
    let fillColor: string = $state("#ffffff");
    let shadowColor: string = $state("#000000");
    let shadowSelector: string = $state(`p[class^="g-pstyle"]`);

    let initialLoad = $state(false);

    let editableCssString: string = $state("");

    let codeEditor = $state();

    let cssString: string = $derived.by(() => {
        // don't update while its fetching settings from AI
        if (!$updateInProgress) {
            const keys = Object.keys($styles);
            // let string = "shadow-settings\n";
            let string = "";

            keys.forEach((key) => {
                string += key + " {\n\t";
                string += ($styles[key]?.join(";\n\t") || "") + ";";
                string += "\n}\n";
            });

            if ($isCEP) {
                evalTS("updateAiSettings", "shadow-settings", string);
            }
            return string;
        }
        return "";
    });

    $effect(() => {
        editableCssString = cssString;
    });

    // Sync the derived cssString to the editable version when styles change
    // $effect(() => {
    //     editableCssString = cssString;
    //     const allMixinIncludes = generateAllMixins();
    //     $stylesString = allMixinIncludes + "\n" + cssString;
    // });

    // $effect(() => {
    //     console.log("editable:", editableCssString);
    //     updateStyle(editableCssString);
    // });

    type ShadowItem = {
        id: string;
        shadow: string;
        active: boolean;
        dataName: string;
    };
    let allShadows: ShadowItem[] = $state([]);

    type AnimationItem = {
        name: string;
        usage: string;
        active: boolean;
        def: string;
        value: string;
        candidate: string;
    };

    let allAnimations: AnimationItem[] = $state([]);

    $effect(() => {
        if (initialLoad && editableCssString) {
            initialLoad = false;
        }
    });

    onMount(async () => {
        allShadows = [...shadows].map((x) => ({
            id: x.id,
            shadow: x.shadow,
            active: false,
            dataName: "",
        }));

        allAnimations = [...animations].map((x) => ({
            name: x.name,
            usage: x.usage,
            active: false,
            def: x.def,
            value: x.value,
            candidate: x.candidate,
        }));

        activeTab = "shadows";

        // if (!$isCEP) {
        //     updateStyle(view.state.doc.toString());
        // }

        initialLoad = true;

        changeSpecimen();
        backdrop = await fetchNewImageURL();
    });

    onDestroy(() => {});

    $effect(() => {
        if (shadowSelector) {
            clearShadowSelection();
        }
    });

    function generateAllMixins() {
        const mixinRegex = new RegExp(/@include\sshadow-(.*)\((#\d+)\)/);

        // get all unique shadow styles
        const allStyles = new Set(
            Object.keys($styles)
                .map((x) => $styles[x])
                .flat()
                .filter((x) => mixinRegex.test(x))
                .map((x) => {
                    const match = x.match(mixinRegex);
                    return match ? match[1] : undefined;
                }),
        );

        // get all shadows CSS
        const allStylesCSS = Array.from(allStyles).map((x) =>
            shadows.find(
                (s) => s.id.toLowerCase().replace(" ", "") == x.toLowerCase(),
            ),
        );

        // generate all mixins
        const allMixins = allStylesCSS.map((shadow) =>
            createMixinFromCSS(shadow),
        );

        return allMixins.join("\n");
    }

    function createMixinsFile() {
        const mixins = [];

        shadows.forEach((shadow) => {
            const sh = shadow.shadow;
            const name = "shadow-" + shadow.id.toLowerCase().replace(" ", "");
            let str = `@mixin ${name}($clr){\n`;
            str += sh.replaceAll("rgba(0,0,0", "rgba($clr");
            str += "\n}";
            mixins.push(str);
        });

        console.log(mixins.join("\n\n"));
    }

    function toCamelCase(str: string) {
        return str
            .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
                return index === 0 ? word.toLowerCase() : word.toUpperCase();
            })
            .replace(/\s+/g, "");
    }

    function createMixinFromCSS(shadow) {
        const name = "shadow-" + toCamelCase(shadow.id);
        let str = `@mixin ${name}($clr){\n`;
        str += shadow.shadow.replaceAll("rgba(0,0,0", "rgba($clr");
        str += "\n}";

        return str;
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

    function processCSS(s) {
        switch (s.type) {
            case "decl":
                return `${s.prop} : ${s.value}`;
                break;

            case "atrule":
                return `@${s.name} ${s.params}`;
                break;

            case "rule":
                const styles = s.nodes.map((x) => processCSS(x)).join(";\n");
                const str = `${s.selector} {
    ${styles};
}`;
                return str;
                break;

            default:
                return "";
                break;
        }
    }

    // parses css into object
    function updateStyle(string: string) {
        let obj;

        // console.log(postcss.parse(string, { parser: scss }));

        try {
            obj = postcss.parse(string, { parser: scss }).nodes.map((x) => {
                return {
                    selector: x.selector,
                    styles: x.nodes.map((s) => processCSS(s)),
                };
            });

            const newStyles = { ...$styles };
            obj.forEach((x) => {
                newStyles[x.selector] = x.styles;
            });
            styles.set(newStyles);
        } catch (error) {
            // ignore errors cause user might still be typing the style
        }
    }

    function changeSpecimen() {
        if (cheeses.length) {
            specimen = cheeses[Math.floor(Math.random() * cheeses.length)];
        } else {
            specimen =
                "My dev job requires fixing buggy code with zeal and panache";
        }

        specimenWeight = ((specimenWeight + 50) % 900) + 50;
    }

    function updateAnimations(
        animationUsage: string,
        animationDefinition: string,
        operation: boolean,
    ) {
        const defPlusUsage =
            "/* " + animationDefinition + " */\n\t" + animationUsage;

        if (operation) {
            if (!$styles[shadowSelector]) {
                $styles[shadowSelector] = [];
            }

            $styles[shadowSelector].push(defPlusUsage);
        } else {
            const index: number = $styles[shadowSelector].findIndex(
                (x) => x == defPlusUsage,
            );
            $styles[shadowSelector].splice(index, 1);
        }

        if ($styles[shadowSelector].length == 0) {
            delete $styles[shadowSelector];
        }

        $styles = $styles;
    }

    function updateStyles(shadowName: string, operation: boolean) {
        const shadowString: string =
            "@include shadow-" + shadowName + "(" + shadowColor + ")";

        // true to add
        // false to remove
        if (operation) {
            if (!$styles[shadowSelector]) {
                $styles[shadowSelector] = [];
            }
            $styles[shadowSelector].push(shadowString);
        } else {
            const index: number = $styles[shadowSelector].findIndex(
                (x) => x == shadowString,
            );
            $styles[shadowSelector].splice(index, 1);
        }

        if ($styles[shadowSelector].length == 0) {
            delete $styles[shadowSelector];
        }

        $styles = $styles;
    }

    function clearShadowSelection() {
        allShadows.forEach((x) => {
            const shadowMixin =
                "@include shadow-" + x.dataName + "(" + shadowColor + ")";

            if ($styles[shadowSelector]) {
                if ($styles[shadowSelector].includes(shadowMixin)) {
                    x.active = true;
                } else {
                    x.active = false;
                }
            } else {
                x.active = false;
            }
        });

        allAnimations.forEach((x) => {
            const defPlusUsage = "/* " + x.def + " */\n\t" + x.usage;

            if ($styles[shadowSelector]) {
                if ($styles[shadowSelector].includes(defPlusUsage)) {
                    x.active = true;
                } else {
                    x.active = false;
                }
            } else {
                x.active = false;
            }
        });
    }
</script>

<div class="shadow-content" in:fly={{ y: -50, duration: 300 }}>
    {#if Object.keys($styles).length}
        <div class="pills-container" transition:slide={{ duration: 200 }}>
            {#each Object.keys($styles) as selector}
                <Pill
                    name={selector}
                    active={selector == shadowSelector}
                    onClick={(e) => {
                        shadowSelector = selector;
                    }}
                    onRemove={(e) => {
                        delete $styles[selector];
                        $styles = $styles;
                        shadowSelector =
                            Object.keys($styles).at(-1) ||
                            `p[class^="g-pstyle"]`;
                    }}
                />
            {/each}
        </div>
    {/if}

    <SectionTabBar
        labels={["shadows", "animations"]}
        bind:activeValue={activeTab}
    >
        <div id="extra-configs">
            <button
                id="replace-image"
                onclick={changeBackdrop}
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
                aria-label="Change type specimen"
            >
                <img
                    style="width: 24px;"
                    src="../../assets/type_specimen.svg"
                    alt="Change type specimen"
                />
            </button>
            <div style="--picker-color: {fillColor};">
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
            <div style="--picker-color: {shadowColor};">
                <ColorPicker
                    position="responsive"
                    label=""
                    isAlpha={false}
                    bind:hex={shadowColor}
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
    </SectionTabBar>

    <Input label="Identifier" type="text" bind:value={shadowSelector} />

    {#if activeTab == "shadows"}
        <div class="shadow-container">
            {#each allShadows as shadow, index (shadow.id)}
                <ShadowCard
                    name={shadow.id}
                    shadow={shadow.shadow}
                    {specimen}
                    {specimenWeight}
                    {backdrop}
                    {shadowColor}
                    {fillColor}
                    bind:active={shadow.active}
                    bind:dataName={shadow.dataName}
                    onChange={(e: Event) => {
                        allShadows[index].active = shadow.active;
                        allShadows = [...allShadows];
                        updateStyles(shadow.dataName, shadow.active);
                    }}
                    delay={index * 20}
                />
            {/each}
        </div>
    {:else if activeTab == "animations"}
        <div class="shadow-container">
            {#each allAnimations as animation, index}
                <AnimationCard
                    name={animation.name}
                    animation={animation.usage}
                    definition={animation.def}
                    bind:active={animation.active}
                    propValue={animation.value}
                    candidate={animation.candidate}
                    onChange={(e: Event) => {
                        allAnimations[index].active = animation.active;
                        allAnimations = [...allAnimations];
                        updateAnimations(
                            animation.usage,
                            animation.def,
                            animation.active,
                        );
                    }}
                    delay={index * 20}
                />
            {/each}
        </div>
    {/if}

    <div class="code-editor">
        <CmTextArea
            bind:textValue={editableCssString}
            type="css"
            onUpdate={(e: string) => {
                updateStyle(e);
            }}
        />
    </div>
</div>

<style lang="scss">
    @use "../shadows.scss" as *;
    @use "../animations.scss" as *;

    .shadow-content {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
    }

    .pills-container {
        display: flex;
        flex-direction: row;
        gap: 8px;
        margin-bottom: 16px;
    }

    #extra-configs {
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        gap: 16px;

        button {
            width: 24px;
            height: 24px;
        }

        #replace-image,
        #replace-specimen {
            padding: 0;
            margin: 0;
            border: unset;
            background: transparent;
            cursor: pointer;
        }

        #replace-image:hover,
        #replace-specimen:hover {
            filter: brightness(1.5);
        }
    }

    .shadow-container {
        width: 100%;
        display: grid;
        grid-gap: 8px;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }
</style>
