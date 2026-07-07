// @ts-nocheck
/**
 * Polyfills for APIs missing or broken in Adobe CEP's embedded Chromium.
 *
 * Adobe CEP uses an embedded Chromium browser:
 *   CEP 9  (Illustrator CC 2019) → Chromium 73
 *   CEP 10 (Illustrator CC 2020) → Chromium 83
 *   CEP 11 (Illustrator CC 2021) → Chromium 88
 *   CEP 12 (Illustrator CC 2022) → Chromium 99
 *
 * This file must be imported before any bits-ui code executes.
 *
 * Known CEP issues fixed here:
 *   1. Array/String.prototype.at missing in Chrome < 92
 *   2. CEP 12 (Chromium 99) dispatches pointermove but NEVER dispatches
 *      pointerdown or pointerup for mouse button presses. bits-ui's Select
 *      trigger and Slider both require pointerdown to function — the trigger
 *      opens on pointerdown (intentionally calling preventDefault to suppress
 *      click), and the Slider attaches document-level pointerdown/pointerup
 *      listeners for drag tracking. Without this polyfill, those two components
 *      are completely unresponsive to mouse clicks.
 */

// ─── 1. Array.prototype.at / String.prototype.at ─────────────────────────────
// Chrome 92+ only. bits-ui uses these for keyboard Home/End navigation and
// floating-layer z-order detection.

if (typeof Array.prototype.at !== "function") {
  Array.prototype.at = function at(index) {
    const len = this.length >>> 0;
    const relIndex = index < 0 ? len + index : index;
    return relIndex >= 0 && relIndex < len ? this[relIndex] : undefined;
  };
  Object.defineProperty(Array.prototype, "at", { enumerable: false });
}

if (typeof String.prototype.at !== "function") {
  String.prototype.at = function at(index) {
    const str = String(this);
    const len = str.length;
    const relIndex = index < 0 ? len + index : index;
    return relIndex >= 0 && relIndex < len ? str[relIndex] : undefined;
  };
  Object.defineProperty(String.prototype, "at", { enumerable: false });
}

// ─── 2. pointerdown / pointerup synthesis for CEP ────────────────────────────
// CEP's native event bridge forwards pointermove to the browser but silently
// drops pointerdown and pointerup. We detect this at runtime (by checking
// whether a native pointerdown fires alongside the first mousedown) and patch
// globally so bits-ui's handlers receive the events they need.
//
// Guard: we only synthesize when the native event is absent. In a normal
// desktop browser, pointerdown always fires BEFORE mousedown (both come from
// the same OS input), so nativePointerDownFired will be true by the time the
// mousedown handler runs and no synthesis occurs. In CEP the flag stays false.
//
// The synthesized events have isTrusted: false (unavoidable for script-created
// events). bits-ui does not filter on isTrusted so they work correctly.
(function () {
  let nativePDFired = false;
  let nativePUFired = false;

  // Track native pointerdown (isTrusted: true means it came from real hardware)
  document.addEventListener(
    "pointerdown",
    function (e) {
      if (e.isTrusted) nativePDFired = true;
    },
    { capture: true }
  );

  // On mousedown: if pointerdown didn't precede it, synthesize one
  document.addEventListener(
    "mousedown",
    function (e) {
      if (!nativePDFired && e.target instanceof Element) {
        e.target.dispatchEvent(
          new PointerEvent("pointerdown", {
            bubbles: true,
            cancelable: true,
            composed: true,
            clientX: e.clientX,
            clientY: e.clientY,
            screenX: e.screenX,
            screenY: e.screenY,
            button: e.button,
            buttons: e.buttons,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            metaKey: e.metaKey,
            pointerId: 1,
            pointerType: "mouse",
            isPrimary: true,
            pressure: 0.5,
          })
        );
      }
      nativePDFired = false; // reset for the next interaction
    },
    { capture: true }
  );

  // Same for pointerup ← mouseup
  document.addEventListener(
    "pointerup",
    function (e) {
      if (e.isTrusted) nativePUFired = true;
    },
    { capture: true }
  );

  document.addEventListener(
    "mouseup",
    function (e) {
      if (!nativePUFired && e.target instanceof Element) {
        e.target.dispatchEvent(
          new PointerEvent("pointerup", {
            bubbles: true,
            cancelable: true,
            composed: true,
            clientX: e.clientX,
            clientY: e.clientY,
            screenX: e.screenX,
            screenY: e.screenY,
            button: e.button,
            buttons: e.buttons,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            metaKey: e.metaKey,
            pointerId: 1,
            pointerType: "mouse",
            isPrimary: true,
            pressure: 0,
          })
        );
      }
      nativePUFired = false;
    },
    { capture: true }
  );
})();
