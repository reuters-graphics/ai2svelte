export interface Style {
  [key: string]: string[];
}

export type ShadowCardItem = {
  id: string;
  shadow: string;
  active: boolean;
  dataName: string;
};

export type ShadowItem = {
  id: string;
  src?: string;
  shadow: string;
};

export type AnimationItem = {
  name: string;
  usage: string;
  active: boolean;
  arguments: string;
  animationRule: string;
  definition: string;
  candidate: string;
  cssVariables?: { [key: string]: string };
};

// Settings key-values as stored in the Illustrator document's XMP metadata.
// Values come from user-defined profiles and the ExtendScript side, so the
// exact keys are user-controlled — but values are always primitives.
export type SettingsObject = Record<string, string | number | boolean | null>;

// Snapshot of settings + styles string used by the Preview tab to detect
// whether a re-render is needed.
export type PreviewObject = { settings: SettingsObject; stylesString: string };

export type UserProfile = SettingsObject;

export type UserProfiles = {
  [key: string]: UserProfile;
};
