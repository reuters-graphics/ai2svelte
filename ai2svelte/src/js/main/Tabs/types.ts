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

export type UserProfile = {
  [key: string]: string | number | boolean | unknown;
};

export type UserProfiles = {
  [key: string]: UserProfile;
};
