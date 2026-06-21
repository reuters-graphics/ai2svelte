import { styles } from "../../stores";
import type { Result, Root } from "postcss";

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

// Keeps the selectors list in sync with the PostCSS AST in the styles store.
//
// Note: this subscription is module-scoped and intentionally lives for the
// entire application lifetime. In a CEP panel, the JS context is never torn
// down, so there is no effective memory leak. If this module is ever used in
// a remountable context, capture the returned unsubscribe function and call
// it in onDestroy.
styles.subscribe((rawStyles) => {
  updateStylesState(rawStyles);
});

export function updateStylesState(rawStyles: Result<Root> | undefined) {
  stylesState.selectors = [];
  rawStyles?.root?.walk((node) => {
    const isTopLevelNode = node.parent?.type === "root";

    if (isTopLevelNode && node.type === "rule" && node.selector) {
      stylesState.selectors.push(node.selector);
    }
  });
}
