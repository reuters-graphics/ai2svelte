import { beforeEach, describe, expect, it, vi } from "vitest";
import { evalTS } from "../../../lib/utils/bolt";

// In-memory stand-in for the panel's JSON files (~/.../user-profiles.json etc.)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const files: Record<string, any> = {};
vi.mock("../../utils/utils", async (orig) => ({
  ...(await orig<typeof import("../../utils/utils")>()),
  readFile: (name: string) =>
    name in files ? structuredClone(files[name]) : null,
  writeFile: (name: string, data: unknown) => {
    files[name] = structuredClone(data);
    return true;
  },
}));
vi.mock("../flags.json?json", () => ({ default: {} }));
vi.mock("../../../../shared/shared", () => ({ version: "1.0.10" }));

import animations from "../../Tabs/data/animations.json?raw";
import JSON5 from "json5";
import { precheck } from "../precheck";

const system = JSON5.parse(animations) as {
  name: string;
  definition: string;
}[];
const pulse = system.find((a) => a.name === "pulse")!;
// flags of an install that already ran every migration before 1.0.10
const oldFlags = () => ({
  "1.0.2": { fixedToDynamicResponsiveness: true },
  "1.0.3": { fixedPecorino2ID: true },
  "1.0.6": { fixedAnimations: true },
  "1.0.9": { removedHtmlOutputExtension: true },
});

beforeEach(() => {
  for (const k of Object.keys(files)) delete files[k];
  vi.mocked(evalTS).mockResolvedValue({ version: "1.0.9" });
  vi.stubGlobal(
    "confirm",
    vi.fn(() => true),
  );
  vi.stubGlobal("alert", vi.fn());
});

describe("precheck 1.0.10 migration (upgrade from 1.0.9)", () => {
  it("renames jpg_quality, drops use_lazy_loader, in every profile", async () => {
    files[".flags.json"] = oldFlags();
    files["user-profiles.json"] = {
      default: { jpg_quality: 70, use_lazy_loader: true, image_format: "png" },
      other: { jpg_quality: 50, image_quality: 90, use_lazy_loader: false },
    };
    await precheck();
    expect(files["user-profiles.json"]).toEqual({
      default: { image_quality: 70, image_format: "png" },
      other: { image_quality: 90 }, // existing image_quality wins
    });
  });

  it("offers webp only when default profile is jpg, and honours a decline", async () => {
    files[".flags.json"] = oldFlags();
    files["user-profiles.json"] = { default: { image_format: "jpg" } };
    vi.mocked(confirm).mockReturnValue(false);
    await precheck();
    expect(files["user-profiles.json"].default.image_format).toBe("jpg");
    await precheck(); // flag set -> must not ask again
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it("switches jpg -> webp on accept", async () => {
    files[".flags.json"] = oldFlags();
    files["user-profiles.json"] = { default: { image_format: "jpg" } };
    await precheck();
    expect(files["user-profiles.json"].default.image_format).toBe("webp");
  });

  it("adds transform-box only to unedited presets", async () => {
    files[".flags.json"] = oldFlags();
    const stripped = pulse.definition.replaceAll(
      "transform-box: fill-box;",
      "",
    );
    files["user-animations.json"] = [
      { name: "pulse", definition: stripped },
      {
        name: "spin",
        definition: "@keyframes spin { from {transform: rotate(1deg)} }",
      }, // user-edited
    ];
    await precheck();
    const [p, s] = files["user-animations.json"];
    expect(p.definition).toBe(pulse.definition);
    expect(s.definition).toBe(
      "@keyframes spin { from {transform: rotate(1deg)} }",
    );
  });

  it("is idempotent and sets all flags", async () => {
    files[".flags.json"] = oldFlags();
    files["user-profiles.json"] = { default: { jpg_quality: 70 } };
    await precheck();
    const after = structuredClone(files);
    await precheck();
    expect(files).toEqual(after);
    expect(files[".flags.json"]["1.0.10"]).toEqual({
      renamedJpgQuality: true,
      migratedWebpDefault: true,
      addedTransformBox: true,
    });
  });

  it("survives a missing profiles/animations file", async () => {
    files[".flags.json"] = oldFlags();
    await expect(precheck()).resolves.toBeUndefined();
  });
});

describe("precheck migrations keep data and don't block", () => {
  it("1.0.2 updates only the default profile and keeps the others", async () => {
    files[".flags.json"] = {
      ...oldFlags(),
      "1.0.2": { fixedToDynamicResponsiveness: false },
    };
    files["user-profiles.json"] = {
      default: { responsiveness: "fixed" },
      work: { responsiveness: "fixed", image_format: "png" },
    };
    await precheck();
    expect(files["user-profiles.json"].default.responsiveness).toBe("dynamic");
    expect(files["user-profiles.json"].work).toEqual({
      responsiveness: "fixed",
      image_format: "png",
    });
  });

  it("an animation without a definition doesn't block later flags", async () => {
    const flags: Record<string, unknown> = oldFlags();
    delete flags["1.0.6"];
    files[".flags.json"] = flags;
    files["user-animations.json"] = [{ name: "custom" }];
    await precheck();
    expect(files[".flags.json"]["1.0.6"].fixedAnimations).toBe(true);
    expect(files[".flags.json"]["1.0.10"].addedTransformBox).toBe(true);
  });

  it("a null version from the document doesn't throw", async () => {
    files[".flags.json"] = oldFlags();
    vi.mocked(evalTS).mockResolvedValue(null);
    await expect(precheck()).resolves.toBeUndefined();
  });
});
