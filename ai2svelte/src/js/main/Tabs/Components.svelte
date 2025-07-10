<script lang="ts">
    import { onMount, untrack } from "svelte";
    import { fly } from "svelte/transition";
    import { evalTS } from "../../lib/utils/bolt";

    import { snippets } from "../stores";

    import unescapeJs from "unescape-js";

    import Chip from "../Components/Chip.svelte";
    import SectionTitle from "../Components/SectionTitle.svelte";
    import CmTextArea from "../Components/CMTextArea.svelte";

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

    let activeTab: string = $state("");

    let uiContent: HTMLElement | undefined = $state();
    let uiContentHeight: number = $state(1);
    let codeContent: HTMLElement | undefined = $state();
    let codeContentHeight: number = $state(400);
    let activeHeight: number | undefined = $derived.by(() => {
        if (activeTab === "UI") {
            return uiContentHeight;
        } else if (activeTab === "CODE") {
            return codeContentHeight;
        }
    });
    let focusedOption: HTMLElement | undefined | null = $state();

    let yamlString: string = $state("");

    $effect(() => {
        let temp = "";
        Object.keys($snippets).forEach((key, index) => {
            temp += index == 0 ? "" : "\n\n";
            temp += key;
            temp += ": ";
            temp += $snippets[key];
        });
    });

    onMount(() => {
        activeTab = "ui";
    });

    // // handles clicks to change ui format
    function handleClick(e: Event) {
        e.preventDefault();
        if (e.target && e.target instanceof HTMLElement) {
            const targetElement = e.target.innerText;
            activeTab = targetElement;
            if (activeTab === "ui") {
                // compileSettings();
            }
        }
    }

    function handleSnippet(e: Event) {
        const target = e.target;
        if (target && target instanceof HTMLElement) {
            const snippetName = `layer:snippet:${e.target.getAttribute("data-name").toLowerCase()}`;
            console.log(snippetName);
            // evalTS("addSnippetLayer");
        }
    }
</script>

{#snippet chip(name: string)}
    <button class="chip" data-name={name} onclick={(e) => handleSnippet(e)}
        >{name}</button
    >
{/snippet}

<div class="tab-content" in:fly={{ y: -50, duration: 300 }}>
    <div
        id="snippetsettings-textarea"
        class="content-item"
        bind:this={codeContent}
        bind:clientHeight={codeContentHeight}
        in:fly={{ y: -50, duration: 300 }}
        out:fly={{ y: 50, duration: 300 }}
    >
        <CmTextArea
            type="text"
            value={yamlString}
            onUpdate={(e: Event) => {}}
        />
    </div>
</div>

<style lang="scss">
    .tab-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
        overflow: hidden;
    }

    #snippetsettings-textarea {
        width: 100%;
        background-color: var(--color-primary);
        box-sizing: border-box;
        padding: 0.75rem;
        border: unset;
        border-radius: 8px;
        height: auto;
    }
</style>
