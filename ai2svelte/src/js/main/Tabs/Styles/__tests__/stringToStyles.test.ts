import { describe, it, expect } from "vitest";
import { get } from "svelte/store";
import { stringToStyles } from "../utils";
import { styles, commitStyles } from "../../../stores";

describe("stringToStyles", () => {
  it("resolves undefined for unparseable SCSS", async () => {
    expect(await stringToStyles("a { color: red")).toBeUndefined();
  });

  it("resolves a root for valid SCSS", async () => {
    const result = await stringToStyles("a { color: red; }");
    expect(result?.root.toString()).toContain("color: red");
  });
});

describe("commitStyles", () => {
  it("leaves the styles store alone when the parse failed", async () => {
    const good = await stringToStyles("a { color: red; }");
    styles.set(good);
    await commitStyles(Promise.resolve(undefined));
    expect(get(styles)).toBe(good);
  });
});
