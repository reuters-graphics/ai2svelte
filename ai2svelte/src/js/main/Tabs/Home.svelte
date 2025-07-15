<script lang="ts">
    import { onMount, untrack } from "svelte";
    import AiSettings from "../ai-settings.json";
    import { fly } from "svelte/transition";
    import { settingsObject, stylesString } from "../stores";
    import { evalTS } from "../../lib/utils/bolt";
    import SectionTitle from "../Components/SectionTitle.svelte";
    import Input from "../Components/Input.svelte";
    import CmTextArea from "../Components/CMTextArea.svelte";
    import { allSettings } from "../utils/allSettings";

    interface AiSettingOption {
        options: string[];
        type: string;
        value: string | number | null;
        description: string;
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
    let codeContent: HTMLElement | undefined = $state();
    let yamlString: string = $derived.by(() => {
        return Object.keys($settingsObject)
            .filter((key) => $settingsObject[key] !== null)
            .map((key) => `${key}: ${$settingsObject[key]}`)
            .join("\n")
            .trim();
    });
    let editableYamlString: string = $state("");

    $effect(() => {
        if (Object.keys($settingsObject).length == 0 && AiSettings) {
            untrack(() => {
                const obj = JSON.parse(JSON.stringify(AiSettings));

                Object.keys(AiSettings).forEach((key) => {
                    const typedKey = key as keyof typeof AiSettings;
                    obj[key] = (AiSettings[typedKey] as AiSettingOption).value;
                });

                settingsObject.set(JSON.parse(JSON.stringify(obj)));
            });
        }
    });

    // Sync the derived yamlString to the editable version when styles change
    $effect(() => {
        editableYamlString = yamlString;
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
                    // if (parseInt(value as string)) {
                    //     value = Number(value);
                    // }
                    obj[key.trim()] = value;
                }
            });

        settingsObject.set(obj);

        if (window.cep) {
            evalTS("setVariable", "ai-settings", $settingsObject);
            evalTS("setVariable", "css-settings", $stylesString);
        }
    }
</script>

<div class="tab-content">
    <button
        id="hero-button"
        onclick={(e) => {
            evalTS("runNightly", {
                settings: $settingsObject,
                code: { css: $stylesString },
            });
            evalTS("setVariable", "ai-settings", $settingsObject);
        }}>Run Nightly</button
    >

    <button
        id="hero-button"
        onclick={(e) => {
            console.log($settingsObject);
            evalTS("setVariable", "ai-settings", $settingsObject);
            evalTS("setVariable", "css-settings", $stylesString);
        }}>Save Settings</button
    >

    <SectionTitle
        title={"Settings"}
        labels={["ui", "code"]}
        bind:activeValue={activeFormat}
    />

    <div id="content">
        {#if activeFormat === "ui"}
            <div
                id="ui-form"
                class="options content-item"
                bind:this={uiContent}
                in:fly={{ y: -50, duration: 300 }}
                out:fly={{ y: 50, duration: 300 }}
            >
                {#if $settingsObject}
                    {#each Object.keys($settingsObject) as key, index}
                        <div class="ai-setting">
                            {#if (AiSettings[key as keyof AiSettings] as AiSettingOption)?.type == "select"}
                                <Input
                                    label={key}
                                    options={(
                                        AiSettings[
                                            key as keyof AiSettings
                                        ] as AiSettingOption
                                    ).options}
                                    bind:value={$settingsObject[key] as string}
                                    delay={index * 30}
                                />
                            {:else if (AiSettings[key as keyof AiSettings] as AiSettingOption)?.type == "range"}
                                <Input
                                    label={key}
                                    bind:value={$settingsObject[key]}
                                    start={AiSettings[key].start}
                                    end={AiSettings[key].end}
                                    type="range"
                                    delay={index * 30}
                                />
                            {:else}
                                <!-- avoid condition here to allow any keys from Code section as text input -->
                                <Input
                                    label={key}
                                    bind:value={$settingsObject[key]}
                                    type="text"
                                    delay={index * 30}
                                />
                            {/if}
                        </div>
                    {/each}
                {/if}
            </div>
        {:else if activeFormat === "code"}
            <div
                id="aisettings-textarea"
                class="content-item code-editor"
                bind:this={codeContent}
                in:fly={{ y: -50, duration: 300 }}
                out:fly={{ y: 50, duration: 300 }}
            >
                {#if allSettings}
                    <CmTextArea
                        type="yaml"
                        bind:textValue={editableYamlString}
                        onUpdate={(e: string) => {
                            convertStringToObject(e);
                        }}
                        autoCompletionTokens={allSettings}
                    />
                {/if}
            </div>
        {/if}
    </div>
</div>

<style lang="scss">
    .tab-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    #hero-button {
        cursor: pointer;
        padding: 1rem;
        color: var(--color-white);
        background-color: var(--color-accent-primary);
        border: unset;
        border-radius: 4px;
        font-size: var(--font-size-s);
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
</style>
