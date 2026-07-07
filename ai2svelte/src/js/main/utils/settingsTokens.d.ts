export type SettingToken = {
  label: string;
  type: string;
  info: string;
  default: string | null;
  inputType: "text" | "select" | "range";
  options?: string[];
  start?: number;
  end?: number;
};

export const aiSettingsTokens: SettingToken[];
