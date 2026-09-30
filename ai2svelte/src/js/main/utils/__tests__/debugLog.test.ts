import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as realFs from "node:fs";
import * as realPath from "node:path";
import os from "node:os";

// outside CEP lib/cep/node exports empty objects; give debugLog real Node modules
vi.mock("../../../lib/cep/node", () => ({ fs: realFs, path: realPath }));

let tmp: string;

// fresh copies of debugLog (resets its session state) and of the bolt mock it uses
async function freshModule() {
  vi.resetModules();
  const bolt = await import("../../../lib/utils/bolt");
  vi.mocked(bolt.csi.getSystemPath).mockReturnValue(tmp);
  return { ...(await import("../debugLog")), evalTS: vi.mocked(bolt.evalTS) };
}

function readLines(dir: string) {
  const [file] = realFs.readdirSync(dir);
  return realFs
    .readFileSync(realPath.join(dir, file), "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
}

beforeEach(() => {
  tmp = realFs.mkdtempSync(realPath.join(os.tmpdir(), "debuglog-"));
  vi.stubGlobal("cep", {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  realFs.rmSync(tmp, { recursive: true, force: true });
});

describe("debugLog", () => {
  it("writes a session header then one JSON line per event", async () => {
    const { logEvent, debugDir } = await freshModule();
    logEvent("call", { id: 1, fn: "runAi2Svelte", args: [{ a: 1 }] });
    logEvent("panel-error", new Error("boom"));

    const lines = readLines(realPath.join(debugDir(), "sessions"));
    expect(lines.map((l) => l.type)).toEqual(["session", "call", "panel-error"]);
    expect(lines.map((l) => l.seq)).toEqual([1, 2, 3]);
    expect(lines[1].data.fn).toBe("runAi2Svelte");
    expect(lines[2].data.message).toBe("boom");
  });

  it("starts a new session file if the debug folder is deleted mid-session", async () => {
    const { logEvent, debugDir } = await freshModule();
    logEvent("call", { id: 1 });
    realFs.rmSync(debugDir(), { recursive: true });
    logEvent("call", { id: 2 });

    const lines = readLines(realPath.join(debugDir(), "sessions"));
    expect(lines.map((l) => l.type)).toEqual(["session", "call"]);
    expect(lines[1].data.id).toBe(2);
  });

  it("does nothing outside CEP", async () => {
    vi.stubGlobal("cep", undefined);
    const { logEvent, debugDir } = await freshModule();
    logEvent("call", {});
    expect(realFs.existsSync(debugDir())).toBe(false);
  });

  it("pruneDir keeps only the newest N files by name", async () => {
    const { pruneDir } = await freshModule();
    ["2026-01-03", "2026-01-01", "2026-01-02"].forEach((n) =>
      realFs.writeFileSync(realPath.join(tmp, n), ""),
    );
    pruneDir(tmp, 2);
    expect(realFs.readdirSync(tmp).sort()).toEqual(["2026-01-02", "2026-01-03"]);
  });

  it("withSnapshot logs the snapshot and still runs when snapshotting fails", async () => {
    const { withSnapshot, debugDir, evalTS } = await freshModule();
    evalTS.mockResolvedValueOnce({ path: "/x/a.ai", saved: true, name: "a.ai" });
    expect(await withSnapshot(async () => "ran")).toBe("ran");

    evalTS.mockRejectedValueOnce(new Error("no document"));
    expect(await withSnapshot(async () => "ran again")).toBe("ran again");

    const types = readLines(realPath.join(debugDir(), "sessions")).map((l) => l.type);
    expect(types).toEqual(["session", "snapshot", "snapshot-failed"]);
  });

  it("withSnapshot keeps only the newest snapshot per .ai file", async () => {
    const { withSnapshot, debugDir, evalTS } = await freshModule();
    const dir = realPath.join(debugDir(), "snapshots");
    realFs.mkdirSync(dir, { recursive: true });
    const old = "2026-01-01T00-00-00-000Z-demo.ai";
    const otherDoc = "2026-01-01T00-00-01-000Z-my-demo.ai"; // name ends like demo.ai
    const latest = "2026-01-02T00-00-00-000Z-demo.ai";
    [old, otherDoc, latest].forEach((n) => realFs.writeFileSync(realPath.join(dir, n), ""));
    evalTS.mockResolvedValueOnce({ path: realPath.join(dir, latest), saved: true, name: "demo.ai" });

    await withSnapshot(async () => {});
    expect(realFs.readdirSync(dir).sort()).toEqual([otherDoc, latest]);
  });

  it("exportDebugReport copies only the sessions and snapshots of one file", async () => {
    const { findDebugData, exportDebugReport, debugDir } = await freshModule();
    const dir = debugDir();
    const snap = (file: string, source?: string) =>
      JSON.stringify({ type: "snapshot", data: { path: `/x/${file}`, name: "demo.ai", source } });
    realFs.mkdirSync(realPath.join(dir, "sessions"), { recursive: true });
    realFs.mkdirSync(realPath.join(dir, "snapshots"));
    realFs.writeFileSync(realPath.join(dir, "sessions", "a.jsonl"), snap("s1-demo.ai", "/work/demo.ai") + "\n");
    realFs.writeFileSync(realPath.join(dir, "sessions", "b.jsonl"), snap("s2-demo.ai", "/other/demo.ai") + "\n"); // same name, other folder
    realFs.writeFileSync(realPath.join(dir, "sessions", "c.jsonl"), snap("s3-demo.ai") + "\n"); // old event, no source
    realFs.writeFileSync(realPath.join(dir, "sessions", "d.jsonl"), '{"type":"call","data":{}}\n');
    ["s1-demo.ai", "s2-demo.ai"].forEach((n) => realFs.writeFileSync(realPath.join(dir, "snapshots", n), ""));

    const data = findDebugData("/work/demo.ai");
    expect(data).toEqual({ sessions: ["a.jsonl", "c.jsonl"], snapshots: ["s1-demo.ai", "s3-demo.ai"] });
    expect(findDebugData("/work/none.ai")).toBeNull();

    const out = realFs.mkdtempSync(realPath.join(os.tmpdir(), "debugout-"));
    const dest = exportDebugReport(out, data!);
    expect(realFs.readdirSync(realPath.join(dest, "sessions")).sort()).toEqual(["a.jsonl", "c.jsonl"]);
    expect(realFs.readdirSync(realPath.join(dest, "snapshots"))).toEqual(["s1-demo.ai"]); // s3 was pruned
    realFs.rmSync(out, { recursive: true, force: true });
  });
});
