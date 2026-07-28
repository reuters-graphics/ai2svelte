import { describe, it, expect, vi, afterEach } from "vitest";
import { isNewerVersion, checkForUpdate } from "../updateCheck";

describe("isNewerVersion", () => {
  it("returns true when latest has a higher patch version", () => {
    expect(isNewerVersion("1.0.9", "1.0.8")).toBe(true);
  });

  it("returns true when latest has a leading v", () => {
    expect(isNewerVersion("v1.0.9", "1.0.8")).toBe(true);
  });

  it("returns false when versions are equal", () => {
    expect(isNewerVersion("1.0.8", "1.0.8")).toBe(false);
  });

  it("returns false when latest is older", () => {
    expect(isNewerVersion("1.0.7", "1.0.8")).toBe(false);
  });

  it("compares major/minor before patch", () => {
    expect(isNewerVersion("2.0.0", "1.9.9")).toBe(true);
    expect(isNewerVersion("1.1.0", "1.0.9")).toBe(true);
  });
});

describe("checkForUpdate", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns update info when a newer release exists", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            tag_name: "v1.0.9",
            html_url: "https://github.com/reuters-graphics/ai2svelte/releases/tag/v1.0.9",
          }),
      })
    );

    const result = await checkForUpdate("1.0.8");
    expect(result).toEqual({
      version: "v1.0.9",
      url: "https://github.com/reuters-graphics/ai2svelte/releases/tag/v1.0.9",
    });
  });

  it("returns null when already on the latest version", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ tag_name: "v1.0.8", html_url: "https://example.com" }),
      })
    );

    expect(await checkForUpdate("1.0.8")).toBeNull();
  });

  it("returns null when fetch rejects (offline)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    expect(await checkForUpdate("1.0.8")).toBeNull();
  });

  it("returns null on a non-OK response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    expect(await checkForUpdate("1.0.8")).toBeNull();
  });
});
