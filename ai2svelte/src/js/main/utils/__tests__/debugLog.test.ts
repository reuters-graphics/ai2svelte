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
    expect(lines.map((l) => l.type)).toEqual([
      "session",
      "call",
      "panel-error",
    ]);
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
    expect(realFs.readdirSync(tmp).sort()).toEqual([
      "2026-01-02",
      "2026-01-03",
    ]);
  });

  it("starts a new session file once the current one is over 5 MB", async () => {
    const { logEvent, debugDir } = await freshModule();
    const dir = realPath.join(debugDir(), "sessions");
    logEvent("call", { id: 0 });
    const [first] = realFs.readdirSync(dir);
    realFs.appendFileSync(
      realPath.join(dir, first),
      "x".repeat(5 * 1024 * 1024),
    );
    await new Promise((r) => setTimeout(r, 5)); // distinct timestamp name
    for (let i = 1; i <= 100; i++) logEvent("call", { id: i });
    expect(realFs.readdirSync(dir)).toHaveLength(2);
  });

  it("prunes files older than 30 days, keeps recent and unparseable names", async () => {
    const { pruneDir } = await freshModule();
    const recent = new Date().toISOString().replace(/[:.]/g, "-");
    const old = "2020-01-01T00-00-00-000Z-a.ai";
    [old, recent + "-b.ai", "notes.txt"].forEach((n) =>
      realFs.writeFileSync(realPath.join(tmp, n), ""),
    );
    pruneDir(tmp, 10);
    expect(realFs.readdirSync(tmp).sort()).toEqual(
      ["notes.txt", recent + "-b.ai"].sort(),
    );
  });

  it("withSnapshot logs the snapshot and still runs when snapshotting fails", async () => {
    const { withSnapshot, debugDir, evalTS } = await freshModule();
    evalTS.mockResolvedValueOnce({
      path: "/x/a.ai",
      saved: true,
      name: "a.ai",
    });
    expect(await withSnapshot(async () => "ran")).toBe("ran");

    evalTS.mockRejectedValueOnce(new Error("no document"));
    expect(await withSnapshot(async () => "ran again")).toBe("ran again");

    const types = readLines(realPath.join(debugDir(), "sessions")).map(
      (l) => l.type,
    );
    expect(types).toEqual(["session", "snapshot", "snapshot-failed"]);
  });

  it("withSnapshot keeps only the newest snapshot per .ai file", async () => {
    const { withSnapshot, debugDir, evalTS } = await freshModule();
    const dir = realPath.join(debugDir(), "snapshots");
    realFs.mkdirSync(dir, { recursive: true });
    const old = "2099-01-01T00-00-00-000Z-demo.ai";
    const otherDoc = "2099-01-01T00-00-01-000Z-my-demo.ai"; // name ends like demo.ai
    const latest = "2099-01-02T00-00-00-000Z-demo.ai";
    [old, otherDoc, latest].forEach((n) =>
      realFs.writeFileSync(realPath.join(dir, n), ""),
    );
    evalTS.mockResolvedValueOnce({
      path: realPath.join(dir, latest),
      saved: true,
      name: "demo.ai",
    });

    await withSnapshot(async () => {});
    expect(realFs.readdirSync(dir).sort()).toEqual([otherDoc, latest]);
  });

  it("withSnapshot keeps the newest 5 sessions per file with a snapshot, plus 5 with none", async () => {
    const { withSnapshot, debugDir, evalTS } = await freshModule();
    const sdir = realPath.join(debugDir(), "sessions");
    const ndir = realPath.join(debugDir(), "snapshots");
    realFs.mkdirSync(sdir, { recursive: true });
    realFs.mkdirSync(ndir);
    const ev = (doc: string) =>
      JSON.stringify({
        type: "snapshot",
        data: { path: `/gone/old-${doc}`, name: doc },
      }) + "\n";
    // 7 sessions of a.ai, 1 of b.ai (no snapshot left), 1 that never exported
    for (let i = 1; i <= 7; i++)
      realFs.writeFileSync(
        realPath.join(sdir, `2026-01-0${i}.jsonl`),
        ev("a.ai"),
      );
    realFs.writeFileSync(realPath.join(sdir, "2026-01-08.jsonl"), ev("b.ai"));
    realFs.writeFileSync(
      realPath.join(sdir, "2026-01-09.jsonl"),
      '{"type":"call"}\n',
    );
    const latest = "2099-02-01T00-00-00-000Z-a.ai";
    realFs.writeFileSync(realPath.join(ndir, latest), "");
    evalTS.mockResolvedValueOnce({
      path: realPath.join(ndir, latest),
      saved: true,
      name: "a.ai",
    });
    await withSnapshot(async () => {});

    // newest 4 old a.ai sessions + the running one (also a.ai) = 5
    const left = realFs.readdirSync(sdir).sort();
    expect(left.slice(0, 4)).toEqual([
      "2026-01-04.jsonl",
      "2026-01-05.jsonl",
      "2026-01-06.jsonl",
      "2026-01-07.jsonl",
    ]);
    // b.ai and never-exported sessions fall in the "no snapshot" group
    expect(left.slice(4, 6)).toEqual(["2026-01-08.jsonl", "2026-01-09.jsonl"]);
    expect(left).toHaveLength(7);
  });

  it("logs polls only when they are slow or fail, and an identical error once", async () => {
    const { logCall, logDone, logEvent, debugDir } = await freshModule();
    const poll = (ms: number, error?: unknown) => {
      logCall(1, "getDocumentName", []);
      logDone(1, "getDocumentName", [], ms, error);
    };
    logEvent("session-start");
    poll(5); // fast ok: nothing
    poll(5, { message: "No such element" }); // first error: logged
    poll(5, { message: "No such element" }); // repeat: counted
    poll(5, { message: "No such element" });
    poll(2000); // slow ok: logged, and ends the streak
    logCall(2, "runAi2Svelte", []); // not quiet: always logged
    logDone(2, "runAi2Svelte", [], 5);

    const lines = readLines(realPath.join(debugDir(), "sessions"));
    expect(lines.map((l) => l.type)).toEqual([
      "session",
      "session-start",
      "call",
      "error",
      "repeat",
      "call",
      "result",
      "call",
      "result",
    ]);
    expect(lines[4].data.count).toBe(2);
  });

  it("logs only the first, last and every 5th export progress call", async () => {
    const { logCall, logDone, debugDir, logEvent } = await freshModule();
    logEvent("session-start");
    for (let i = 1; i <= 12; i++) {
      logCall(i, "updateExportProgress", [i, 12, "x"]);
      logDone(i, "updateExportProgress", [i, 12, "x"], 5);
    }
    const done = readLines(realPath.join(debugDir(), "sessions"))
      .filter((l) => l.type === "call")
      .map((l) => l.data.args[0]);
    expect(done).toEqual([1, 5, 10, 12]);
  });

  it("exportDebugReport copies only the sessions and snapshots of one file", async () => {
    const { findDebugData, exportDebugReport, debugDir } = await freshModule();
    const dir = debugDir();
    const snap = (file: string, source?: string) =>
      JSON.stringify({
        type: "snapshot",
        data: { path: `/x/${file}`, name: "demo.ai", source },
      });
    realFs.mkdirSync(realPath.join(dir, "sessions"), { recursive: true });
    realFs.mkdirSync(realPath.join(dir, "snapshots"));
    realFs.writeFileSync(
      realPath.join(dir, "sessions", "a.jsonl"),
      snap("s1-demo.ai", "/work/demo.ai") + "\n",
    );
    realFs.writeFileSync(
      realPath.join(dir, "sessions", "b.jsonl"),
      snap("s2-demo.ai", "/other/demo.ai") + "\n",
    ); // same name, other folder
    realFs.writeFileSync(
      realPath.join(dir, "sessions", "c.jsonl"),
      snap("s3-demo.ai") + "\n",
    ); // old event, no source
    realFs.writeFileSync(
      realPath.join(dir, "sessions", "d.jsonl"),
      '{"type":"call","data":{}}\n',
    );
    ["s1-demo.ai", "s2-demo.ai"].forEach((n) =>
      realFs.writeFileSync(realPath.join(dir, "snapshots", n), ""),
    );

    const data = findDebugData("/work/demo.ai");
    expect(data).toEqual({
      sessions: ["a.jsonl", "c.jsonl"],
      snapshots: ["s1-demo.ai", "s3-demo.ai"],
    });
    expect(findDebugData("/work/none.ai")).toBeNull();

    const out = realFs.mkdtempSync(realPath.join(os.tmpdir(), "debugout-"));
    const dest = exportDebugReport(out, data!);
    expect(realFs.readdirSync(realPath.join(dest, "sessions")).sort()).toEqual([
      "a.jsonl",
      "c.jsonl",
    ]);
    expect(realFs.readdirSync(realPath.join(dest, "snapshots"))).toEqual([
      "s1-demo.ai",
    ]); // s3 was pruned
    // c.jsonl's snapshot (s3) was pruned: flagged; a.jsonl (s1) is replayable
    expect(
      realFs.readFileSync(realPath.join(dest, "notes.txt"), "utf8"),
    ).toMatch(/c\.jsonl/);
    expect(
      realFs.readFileSync(realPath.join(dest, "notes.txt"), "utf8"),
    ).not.toMatch(/a\.jsonl/);
    realFs.rmSync(out, { recursive: true, force: true });
  });
});
