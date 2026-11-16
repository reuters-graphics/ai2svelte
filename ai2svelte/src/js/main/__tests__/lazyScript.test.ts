import { afterAll, describe, expect, it } from "vitest";
import { writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { flushSync, mount } from "svelte";
import { LAZY_SCRIPT } from "../../../jsx/ilst/ai2svelte/lazyScript.js";

// Mounts the lazy-loading code the generator emits, in a component shaped
// like the generated one (two tiles, same markup as ai2svelte.js writes).
const file = path.join(__dirname, "_lazy.generated.svelte");
writeFileSync(
  file,
  "<script>\r\tlet { lazyMargin = '50% 50%', lazyRoot = null } = $props();\r" +
    LAZY_SCRIPT +
    "</script>\r" +
    ["a", "b", "c"]
      .map(
        (id) =>
          `<div id="${id}" {@attach lazy} style:background-image={seen["${id}"] ? \`url("${id}.webp")\` : null}></div>`,
      )
      .join(""),
);
afterAll(() => unlinkSync(file));

const observers: {
  opts: IntersectionObserverInit;
  observed: Set<Element>;
  cb: IntersectionObserverCallback;
}[] = [];
globalThis.IntersectionObserver = class {
  observed = new Set<Element>();
  constructor(
    public cb: IntersectionObserverCallback,
    public opts: IntersectionObserverInit,
  ) {
    observers.push(this);
  }
  observe(el: Element) {
    this.observed.add(el);
  }
  unobserve(el: Element) {
    this.observed.delete(el);
  }
} as unknown as typeof IntersectionObserver;

describe("emitted lazy loader", () => {
  it("loads on intersection by default, and on reveal() past clipping", async () => {
    const { default: C } = await import(/* @vite-ignore */ file);
    const target = document.createElement("div");
    const ai = mount(C, { target, props: { lazyMargin: "0% 1000%" } });
    flushSync();
    const [a, b] = ["a", "b"].map(
      (id) => target.querySelector<HTMLElement>(`#${id}`)!,
    );
    const io = observers[0];

    expect(io.opts).toEqual({ root: null, rootMargin: "0% 1000%" });
    expect(ai.getLazyTiles()).toEqual([
      { id: "a", el: a },
      { id: "b", el: b },
      { id: "c", el: target.querySelector("#c") },
    ]);
    expect(a.style.backgroundImage).toBe("");

    // observer path (unchanged default)
    io.cb([{ isIntersecting: true, target: a } as never], io as never);
    flushSync();
    expect(a.style.backgroundImage).toContain("a.webp");
    expect(io.observed.has(a)).toBe(false);

    // host path: loads straight away, no intersection needed
    ai.reveal("b");
    ai.reveal(["c"]);
    flushSync();
    expect(b.style.backgroundImage).toContain("b.webp");
    expect(io.observed.size).toBe(0);
    expect(ai.getLazyTiles()).toEqual([]);
  });

  it("check() reveals by real position within lazyMargin", async () => {
    const { default: C } = await import(/* @vite-ignore */ file);
    const target = document.createElement("div");
    // jsdom viewport is 1024 x 768; "0% 100%" reaches 1024px either side
    const ai = mount(C, { target, props: { lazyMargin: "0% 100%" } });
    flushSync();
    const at = (id: string, left: number, width = 500) =>
      (target.querySelector(`#${id}`)!.getBoundingClientRect = () =>
        ({
          left,
          right: left + width,
          top: 0,
          bottom: width && 300,
          width,
          height: width && 300,
        }) as DOMRect);
    at("a", 1900); // starts 876px past the right edge: inside the margin
    at("b", 2100); // 1076px past: outside
    at("c", 0, 0); // display:none artboard: zero size, never loads

    ai.check();
    flushSync();
    expect(ai.getLazyTiles().map((t: { id: string }) => t.id)).toEqual([
      "b",
      "c",
    ]);
    expect(
      target.querySelector<HTMLElement>("#a")!.style.backgroundImage,
    ).toContain("a.webp");

    at("b", 1500); // panned closer
    ai.check();
    expect(ai.getLazyTiles().map((t: { id: string }) => t.id)).toEqual(["c"]);
  });
});
