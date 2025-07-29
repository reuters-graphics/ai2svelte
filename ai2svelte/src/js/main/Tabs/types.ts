export interface Style {
    [key: string]: string[];
}

export type ShadowItem = {
    id: string;
    shadow: string;
    active: boolean;
    dataName: string;
};

export type AnimationItem = {
    name: string;
    usage: string;
    active: boolean;
    props: string;
    value: string;
    definition: string;
    candidate: string;
};

export interface AiSettingOption {
        options?: string[];
        type: string;
        value: string | number | null;
        description: string;
        start?: number;
        end?: number;
    }

export interface AiSettingsType {
    image_format: AiSettingOption;
    responsiveness: AiSettingOption;
    output: AiSettingOption;
    html_output_path: string;
    html_output_extension: AiSettingOption;
    image_output_path: string;
    image_source_path: string;
    png_transparent: AiSettingOption;
    png_number_of_colors: AiSettingOption;
    jpg_quality: AiSettingOption;
    inline_svg: AiSettingOption;
    max_width: null | number;
}