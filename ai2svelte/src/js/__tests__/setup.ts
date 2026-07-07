import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Svelte 5 transitions call element.animate(). jsdom doesn't implement the Web
// Animation API, so we polyfill with a mock that:
//   - triggers onfinish immediately (Svelte 5 uses `animation.onfinish = fn` to
//     know when an out-transition completes and can remove the element)
//   - exposes a resolved `finished` Promise (used by some internal paths)
function makeAnimationMock(): Animation {
  let _onfinish: ((ev: AnimationPlaybackEvent) => void) | null = null;
  let _oncancel: ((ev: AnimationPlaybackEvent) => void) | null = null;

  return {
    pause: vi.fn(),
    play: vi.fn(),
    cancel: vi.fn(),
    finish: vi.fn(),
    reverse: vi.fn(),
    finished: Promise.resolve({} as Animation),
    ready: Promise.resolve({} as Animation),
    currentTime: 0,
    playState: 'finished' as AnimationPlayState,
    effect: null,
    timeline: null,
    id: '',
    replaceState: 'active' as AnimationReplaceState,
    pending: false,
    commitStyles: vi.fn(),
    persist: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
    // Getter/setter: when Svelte assigns `animation.onfinish = cleanup`, fire
    // the callback in the next microtask so the element is removed promptly.
    get onfinish() {
      return _onfinish;
    },
    set onfinish(fn: ((ev: AnimationPlaybackEvent) => void) | null) {
      _onfinish = fn;
      if (fn) {
        Promise.resolve().then(() => fn({} as AnimationPlaybackEvent));
      }
    },
    get oncancel() {
      return _oncancel;
    },
    set oncancel(fn: ((ev: AnimationPlaybackEvent) => void) | null) {
      _oncancel = fn;
    },
    startTime: null,
    playbackRate: 1,
    updatePlaybackRate: vi.fn(),
  } as unknown as Animation;
}

HTMLElement.prototype.animate = vi.fn().mockImplementation(makeAnimationMock);
SVGElement.prototype.animate = HTMLElement.prototype.animate;

// jsdom does not implement window.matchMedia.
// Svelte 5's Spring / MediaQuery rune requires this at construction time.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  })),
});

// bits-ui's Slider (and Floating UI's autoUpdate) call `new ResizeObserver()`.
// vi.fn().mockImplementation() cannot be used as a constructor — use a class.
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(_callback?: ResizeObserverCallback) {}
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// bits-ui Select.Trigger's onpointerdown calls hasPointerCapture / releasePointerCapture.
// jsdom implements pointer events but omits the capture methods on Element.
if (!HTMLElement.prototype.hasPointerCapture) {
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
}
if (!HTMLElement.prototype.setPointerCapture) {
  HTMLElement.prototype.setPointerCapture = vi.fn();
}
if (!HTMLElement.prototype.releasePointerCapture) {
  HTMLElement.prototype.releasePointerCapture = vi.fn();
}

// Pill.svelte's onclick handler checks `e.target instanceof SVGPathElement`.
// jsdom exposes SVGElement but not SVGPathElement; alias it so the check doesn't
// throw a ReferenceError and the else-branch (onClick) runs correctly.
if (typeof (global as unknown as Record<string, unknown>).SVGPathElement === 'undefined') {
  (global as unknown as Record<string, unknown>).SVGPathElement = global.SVGElement;
}
