import { styles } from "../../stores";

export type SpecimenWeight = 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

interface StylesState {
  selectors: string[];
  cssSelector: string;
  specimen: string;
  specimenWeight: SpecimenWeight;
  backdrop: string | undefined;
  fillColor: string;
  shadowColor: string;
}

export const stylesState: StylesState = $state({
  cssSelector: 'p[class^="g-pstyle"]',
  selectors: [],
  specimen: "",
  specimenWeight: 400,
  backdrop: undefined,
  fillColor: "#ffffff",
  shadowColor: "#000000",
});

styles.subscribe((rawStyles) => {
  updateStylesState(rawStyles);
});

export function updateStylesState(rawStyles) {
  stylesState.selectors = [];
  rawStyles?.root?.walk((node) => {
    const isTopLevelNode = node.parent?.type === "root";

    if (isTopLevelNode && node.type === "rule" && node.selector) {
      stylesState.selectors.push(node.selector);
    }
  });
}
