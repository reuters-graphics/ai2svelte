<!-- TODO -->
<!-- pick id, class from Illustrator as identifier -->
<!-- current identifier preview with styles applied -->

<script lang="ts">
    import { onDestroy, onMount, untrack } from "svelte";
    import { fly, scale, slide } from "svelte/transition";
    import { evalTS } from "../../lib/utils/bolt";
    import shadows, { cheeses } from "./shadows";
    import { initTippy } from "./utils";
    import { styles, updateInProgress, isCEP } from "../stores";
    import type { Style } from "../stores";
    import ColorPicker from "svelte-awesome-color-picker";
    import postcss from "postcss";
    import scss from "postcss-scss";

    import SectionTabBar from "../Components/SectionTabBar.svelte";
    // import Select from "../Components/Select.svelte";
    import ShadowCard from "../Components/ShadowCard.svelte";
    import CmTextArea from "../Components/CMTextArea.svelte";
    import Pill from "../Components/Pill.svelte";
    import Input from "../Components/Input.svelte";

    let activeTab = $state("");

    let specimen: string = $state("");
    let specimenWeight: 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 =
        $state(400);
    let backdrop: string | undefined = $state();
    let fillColor: string = $state("#ffffff");
    let shadowColor: string = $state("#000000");
    let shadowSelector: string = $state(".g-text");

    let initialLoad = $state(false);

    let editableCssString: string = $state("");

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

    // Sync the derived cssString to the editable version when styles change
    $effect(() => {
        editableCssString = cssString;
    });

    type ShadowItem = {
        id: string;
        shadow: string;
        active: boolean;
        dataName: string;
    };
    let allShadows: ShadowItem[] = $state([]);

    $effect(() => {
        if (initialLoad && editableCssString) {
            initialLoad = false;
        }
    });

    onMount(async () => {
        initTippy();

        allShadows = [...shadows].map((x) => ({
            id: x.id,
            shadow: x.shadow,
            active: false,
            dataName: "",
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

    function updateStyle(string: string) {
        console.log("updating styles", string);
        let obj;

        console.log(postcss.parse(string, { parser: scss }));

        obj = postcss.parse(string, { parser: scss }).nodes.map((x) => {
            return {
                selector: x.selector,
                styles: x.nodes.map((s) => processCSS(s)),
            };
        });

        const newStyles = { ...$styles };
        obj.forEach((x) => {
            newStyles[x.selector] = {
                styles: x.styles,
            };
        });
        styles.set(newStyles);
        console.log($styles);
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

    function updateStyles(shadowName: string, operation: boolean) {
        const shadowString: string =
            "@includes shadow-" + shadowName + "(" + shadowColor + ")";

        // true to add
        // false to remove
        if (operation == true) {
            if (!$styles[shadowSelector]) {
                $styles[shadowSelector] = { shadowName: "", styles: [] };
            }
            $styles[shadowSelector].styles.push(shadowString);
        } else {
            const index: number = $styles[shadowSelector].styles.findIndex(
                (x) => x == shadowString,
            );
            $styles[shadowSelector].styles.splice(index, 1);
        }

        if ($styles[shadowSelector].styles.length == 0) {
            delete $styles[shadowSelector];
        }

        $styles = $styles;
        console.log($styles);
    }

    function clearShadowSelection() {
        allShadows.forEach((x) => {
            const shadowMixin =
                "@includes shadow-" + x.dataName + "(" + shadowColor + ")";

            if ($styles[shadowSelector]) {
                if ($styles[shadowSelector].styles.includes(shadowMixin)) {
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
                            Object.keys($styles).at(-1) || ".g-text";
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
                style="--picker-color: {shadowColor};"
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

    <Input label="Shadow identifier" type="text" bind:value={shadowSelector} />

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

    <CmTextArea
        bind:value={editableCssString}
        type="css"
        onUpdate={(e: Event) => {
            updateStyle(editableCssString);
        }}
    />
</div>

<style lang="scss">
    @use "../shadows.scss" as *;

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
