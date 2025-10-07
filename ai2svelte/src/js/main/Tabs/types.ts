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
  arguments: string;
  animationRule: string;
  definition: string;
  candidate: string;
  cssVariables?: { [key: string]: string };
};
