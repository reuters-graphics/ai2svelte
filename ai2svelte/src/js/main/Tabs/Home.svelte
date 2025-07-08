<script lang="ts">
    import { onMount, untrack } from "svelte";
    import AiSettings from "../ai-settings.json";
    import { fly } from "svelte/transition";
    import { settingsObject } from "../stores";
    import { evalTS } from "../../lib/utils/bolt";
    import SectionTitle from "../Components/SectionTitle.svelte";
    import Select from "../Components/Select.svelte";
    import Dropdown from "../Components/Dropdown.svelte";
    import CmTextArea from "../Components/CMTextArea.svelte";

    interface AiSettingOption {
        options: string[];
    }

    interface AiSettings {
        image_format: AiSettingOption;
        responsiveness: AiSettingOption;
        output: AiSettingOption;
        html_output_path: string;
        html_output_extension: AiSettingOption;
        image_output_path: string;
        image_source_path: string;
        png_transparent: AiSettingOption;
        png_number_of_colors: number;
        jpg_quality: number;
        graphicskit: AiSettingOption;
        inline_svg: AiSettingOption;
        "max-width": null | number;
    }

    let activeFormat: string = $state("");
    let uiContent: HTMLElement | undefined = $state();
    let uiContentHeight: number = $state(1);
    let codeContent: HTMLElement | undefined = $state();
    let codeContentHeight: number = $state(1);
    let activeHeight: number | undefined = $derived.by(() => {
        if (activeFormat === "ui") {
            // offset some to allow dropdown menus
            return uiContentHeight * 1.5;
        } else if (activeFormat === "code") {
            return codeContentHeight;
        }
    });

    let yamlString: string = $derived.by(() => {
        return Object.keys($settingsObject)
            .filter((key) => $settingsObject[key] !== null)
            .map((key) => `${key}: ${$settingsObject[key]}`)
            .join("\n")
            .trim();
    });

    $effect(() => {
        if (AiSettings) {
            untrack(() => {
                const obj = JSON.parse(JSON.stringify(AiSettings));

                Object.keys(AiSettings).forEach((key) => {
                    const typedKey = key as keyof typeof AiSettings;
                    if ((AiSettings[typedKey] as AiSettingOption)?.options) {
                        obj[key] = (
                            AiSettings[typedKey] as AiSettingOption
                        ).options[0];
                    }
                });

                settingsObject.set(JSON.parse(JSON.stringify(obj)));
            });
        }
    });

    $effect(() => {
        settingsObject.set(convertStringToObject(yamlString));
    });

    onMount(() => {
        activeFormat = "ui";
    });

    // converts string in textarea to js object
    function convertStringToObject(s: string) {
        const obj: { [key: string]: unknown } = {};
        s.trim()
            .split("\n")
            .forEach((line) => {
                const [key, ...rest] = line.split(":");
                if (key && rest.length) {
                    let value: unknown = rest.join(":").trim();
                    // Try to convert to number if possible
                    if (parseInt(value as string)) {
                        value = Number(value);
                    }
                    obj[key.trim()] = value;
                }
            });
        return obj;
    }
</script>

<div class="tab-content">
    <button id="hero-button">Run ai2svelte</button>

    <SectionTitle
        title={"Settings"}
        labels={["ui", "code"]}
        bind:activeValue={activeFormat}
    />

    <hr />

    <div id="content" style="height: {activeHeight}px;">
        {#if activeFormat === "ui"}
            <div
                id="ui-form"
                class="options content-item"
                bind:this={uiContent}
                bind:clientHeight={uiContentHeight}
                in:fly={{ y: -50, duration: 300 }}
                out:fly={{ y: 50, duration: 300 }}
            >
                {#if $settingsObject}
                    {#each Object.keys($settingsObject) as key}
                        <div class="ai-setting">
                            {#if (AiSettings[key as keyof AiSettings] as AiSettingOption)?.options !== undefined}
                                <Select
                                    label={key}
                                    options={(
                                        AiSettings[
                                            key as keyof AiSettings
                                        ] as AiSettingOption
                                    ).options}
                                    bind:value={$settingsObject[key]}
                                />
                            {:else}
                                <Select
                                    label={key}
                                    bind:value={$settingsObject[key]}
                                    type="text"
                                />
                            {/if}
                        </div>
                    {/each}
                {/if}
            </div>
        {:else if activeFormat === "code"}
            <div
                id="aisettings-textarea"
                bind:this={codeContent}
                bind:clientHeight={codeContentHeight}
                in:fly={{ y: -50, duration: 300 }}
                out:fly={{ y: 50, duration: 300 }}
            >
                <CmTextArea
                    type="text"
                    value={yamlString}
                    onUpdate={(e) => {}}
                />
            </div>
        {/if}
    </div>
</div>

<style lang="scss">
    @use "../../variables.scss" as *;

    .tab-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
        overflow: hidden;
    }

    #hero-button {
        cursor: pointer;
        padding: 1rem;
        background-color: $accent;
        border: unset;
        border-radius: 4px;
        color: white;
        font-size: 1rem;
        font-family: "Geist Mono";
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.2rem;
        transition: 0.2s ease;
        margin-bottom: 1rem;
    }

    #hero-button:hover {
        letter-spacing: 0;
    }

    .options {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 8px;
    }

    .ai-setting {
        flex-grow: 1;
        transition: 0.3s ease;
    }

    #aisettings-textarea {
        width: 100%;
        background-color: $color-charcoal-dark;
        box-sizing: border-box;
        padding: 0.75rem;
        border: unset;
        border-radius: 8px;
        height: auto;
    }
</style>
