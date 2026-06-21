import { constrain } from "../utils/utils";

// Maps n from one range to another, optionally clamping to the target range.
// Used by InputRange for mouse-drag-to-value conversion.
export function map(n: number, start1: number, stop1: number, start2: number, stop2: number, withinBounds: boolean = true) {
    const newval =
      ((n - start1) / (stop1 - start1)) * (stop2 - start2) + start2;
    if (!withinBounds) {
      return newval;
    }
    if (start2 < stop2) {
      return constrain(newval, start2, stop2);
    } else {
      return constrain(newval, stop2, start2);
    }
}
