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
    import { tooltip } from "svooltip";
    import { tooltipSettings } from "../utils/utils";
    // @ts-ignore - Since HostAdapter isn't explicitly typed, linting throws an error we'll ignore
    import {
        AIEventAdapter,
        AIEvent,
    } from "../../../public/BoltHostAdapter.js";

    import typeSpecimenIcon from "../../../public/type_specimen.svg";
    import replaceImageIcon from "../../../public/replace_image.svg";

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
    let cssSelector: string = $state(`p[class^="g-pstyle"]`);

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
    $effect(() => {
        editableCssString = cssString;
        const allMixinIncludes = generateAllMixins();
        $stylesString = allMixinIncludes + "\n" + cssString;
    });

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
        animId: string;
    };

    let allAnimations: AnimationItem[] = $state([]);

    $effect(() => {
        if (initialLoad && editableCssString) {
            initialLoad = false;
        }
    });

    // fires every time document is changed
    // used to handle stale previews
    function setDocChangeEventListener() {
        const adapter = AIEventAdapter.getInstance();
        adapter.addEventListener(
            AIEvent.ART_SELECTION_CHANGED,
            async (e: any) => {
                console.log("Selection changed:");
                const identifier = await evalTS("fetchSelectedItems");
                cssSelector = identifier || "";
            },
        );
    }

    onMount(async () => {
        allShadows = [...shadows]
            .map((x) => ({
                id: x.id,
                shadow: x.shadow,
                active: false,
                dataName: "",
            }))
            .sort((a, b) => a.id.localeCompare(b.id));

        allAnimations = [...animations]
            .map((x) => ({
                name: x.name,
                usage: x.usage,
                active: false,
                def: x.def,
                value: x.value,
                candidate: x.candidate,
                animId: x.animId,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        activeTab = "shadows";

        // if (!$isCEP) {
        //     updateStyle(view.state.doc.toString());
        // }

        initialLoad = true;

        if ($isCEP) {
            setDocChangeEventListener();
        }

        changeSpecimen();
        backdrop = await fetchNewImageURL();
    });

    onDestroy(() => {});

    $effect(() => {
        if (cssSelector) {
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

    // function processStyles(rawNodes) {
    //     // x.nodes.map((s, i) => processCSS(s, i))
    //     let stylesArray = [];

    //     let animMixinRegex = new RegExp(/@include anim(.*).*/);

    //     for(let i = 0; i < rawNodes.length; i++) {
    //         if(rawNodes[i].type == "comment" && rawNodes[i + 1].type == "atrule" && rawNodes[i+1].type == "") {
    //             // processing
    //             let comment = `/* ${s.text} */\n`;
    //             i++;
    //             let style =
    //         }
    //     }
    // }

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

            case "comment":
                return `/* ${s.text} */`;

            default:
                return "";
                break;
        }
    }

    // parses css into object
    function updateStyle(string: string) {
        let obj;

        console.log(postcss.parse(string, { parser: scss }));

        try {
            obj = postcss.parse(string, { parser: scss }).nodes.map((x) => {
                return {
                    selector: x.selector,
                    styles: x.nodes.map((s, i) => processCSS(s)),
                };
            });

            const newStyles = { ...$styles };
            obj.forEach((x) => {
                newStyles[x.selector] = x.styles;
            });
            // console.log(string);
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
        animationId: string,
        operation: boolean,
    ) {
        const animationMixinRegex = new RegExp(/.*@include (.*)\(\)/);
        const mixinCheck = animationUsage?.match(animationMixinRegex);
        const animationIdentifier = mixinCheck ? mixinCheck[1] : undefined;
        console.log("animId:" + animationIdentifier);
        console.log("operation:" + operation);
        const defPlusUsage =
            "/* " + animationDefinition + " */\n\t" + animationUsage;

        if (operation) {
            if (!$styles[cssSelector]) {
                $styles[cssSelector] = [];
            }

            $styles[cssSelector].push(
                `/* ${animationIdentifier} ${animationDefinition} */`,
            );
            $styles[cssSelector].push(animationUsage);
        } else {
            console.log("id:" + animationIdentifier);
            const regexCheck = new RegExp(`\\b${animationIdentifier}\\b`);

            const indexes = $styles[cssSelector]
                .map((x, i) => (regexCheck.test(x) ? i : null))
                .filter((x) => x !== null && x >= 0);

            const indexSet = new Set(indexes);
            console.log(indexSet);

            const arrayWithValuesRemoved = $styles[cssSelector].filter(
                (value, i) => !indexSet.has(i),
            );

            $styles[cssSelector] = [...arrayWithValuesRemoved];

            // const index: number = $styles[cssSelector].find((x) =>
            //     x.match(regexCheck),
            // );

            // $styles[cssSelector].splice(index, 1);
        }

        if ($styles[cssSelector].length == 0) {
            delete $styles[cssSelector];
        }

        $styles = $styles;
    }

    function updateStyles(shadowName: string, operation: boolean) {
        const shadowString: string =
            "@include shadow-" + shadowName + "(" + shadowColor + ")";

        // true to add
        // false to remove
        if (operation) {
            if (!$styles[cssSelector]) {
                $styles[cssSelector] = [];
            }
            $styles[cssSelector].push(shadowString);
        } else {
            const index: number = $styles[cssSelector].findIndex(
                (x) => x == shadowString,
            );
            $styles[cssSelector].splice(index, 1);
        }

        if ($styles[cssSelector].length == 0) {
            delete $styles[cssSelector];
        }

        $styles = $styles;
    }

    function clearShadowSelection() {
        console.log("clearShadowSelection");
        allShadows.forEach((x) => {
            const shadowMixin =
                "@include shadow-" + x.dataName + "(" + shadowColor + ")";

            if ($styles[cssSelector]) {
                if ($styles[cssSelector].includes(shadowMixin)) {
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
            const animationMixinRegex = new RegExp(/.*@include (.*)\(\)/);
            const mixinCheck = x.usage?.match(animationMixinRegex);
            const animationIdentifier = mixinCheck ? mixinCheck[1] : undefined;
            const regexCheck = new RegExp(`\\b${animationIdentifier}\\b`);

            if ($styles[cssSelector]) {
                if ($styles[cssSelector].some((x) => regexCheck.test(x))) {
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
                    active={selector == cssSelector}
                    onClick={(e) => {
                        cssSelector = selector;
                    }}
                    onRemove={(e) => {
                        delete $styles[selector];
                        $styles = $styles;
                        cssSelector =
                            Object.keys($styles).at(-1) ||
                            `p[class^="g-pstyle"]`;
                    }}
                />
            {/each}
        </div>
    {/if}

    <SectionTabBar
        labels={["shadows", "animations"]}
        tooltipDescription={["Add shadows", "Add animations"]}
        bind:activeValue={activeTab}
    >
        <div id="extra-configs">
            <button
                id="replace-image"
                onclick={changeBackdrop}
                aria-label="Change backdrop"
                use:tooltip={{
                    ...tooltipSettings,
                    content: "Change backdrop",
                }}
            >
                <img
                    style="width: 24px;"
                    src={replaceImageIcon}
                    alt="Change backdrop"
                />
            </button>
            <button
                id="replace-specimen"
                onclick={changeSpecimen}
                aria-label="Change type specimen"
                use:tooltip={{
                    ...tooltipSettings,
                    content: "Change type specimen",
                }}
            >
                <img
                    style="width: 24px;"
                    src={typeSpecimenIcon}
                    alt="Change type specimen"
                />
            </button>
            <div
                style="--picker-color: {fillColor};"
                use:tooltip={{
                    ...tooltipSettings,
                    content: "Fill color (view only)",
                }}
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
                style="--picker-color: {shadowColor};"
                use:tooltip={{
                    ...tooltipSettings,
                    content: "Shadow color",
                }}
            >
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

    <Input label="Identifier" type="text" bind:value={cssSelector} />

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
                    animId={animation.animId}
                    onChange={(e: Event) => {
                        allAnimations[index].active = animation.active;
                        allAnimations = [...allAnimations];
                        updateAnimations(
                            animation.usage,
                            animation.def,
                            animation.animId,
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
