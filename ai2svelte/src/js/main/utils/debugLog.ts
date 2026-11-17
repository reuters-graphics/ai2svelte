// Local debug log: every evalTS call lands in userData/<id>/debug/sessions/*.jsonl,
// and each export (runAi2Svelte) gets a copy of the .ai file in debug/snapshots/ first.
// Replay a bundle with `pnpm replay "<folder>"` (scripts/replay/replay.mjs).
// Nothing leaves the machine unless the user exports and sends the folder.
import { fs, path } from "../../lib/cep/node";
// circular with bolt.ts (it imports logEvent) — safe because both are only
// touched inside functions, never at module load
import { csi, evalTS } from "../../lib/utils/bolt";
import { ns, version } from "../../../shared/shared";

const MAX_SESSIONS = 5; // per .ai file with a kept snapshot, plus 5 with none
const MAX_SNAPSHOTS = 3; // one per .ai file, so at most 3 files

let sessionFile = "";
let seq = 0;

export function debugDir(): string {
  return path.join(csi.getSystemPath("userData"), ns, "debug");
}

// File names start with a timestamp, so name order is age order.
export function pruneDir(dir: string, keep: number): void {
  const names = fs.readdirSync(dir).sort();
  names
    .slice(0, Math.max(0, names.length - keep))
    .forEach((name) => fs.unlinkSync(path.join(dir, name)));
}

// The snapshot events of one session file (unreadable lines are skipped).
type SnapshotData = { path: string; name?: string; source?: string };
function snapshotEvents(file: string): SnapshotData[] {
  const out: SnapshotData[] = [];
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line.includes('"type":"snapshot"')) continue;
    try {
      const event = JSON.parse(line);
      if (event.type === "snapshot" && event.data?.path) out.push(event.data);
    } catch {
      // half-written line
    }
  }
  return out;
}

// Sessions are grouped by the .ai file (name) they exported. Each file that
// still has a snapshot keeps its newest `perFile` sessions, and so does one extra
// group for sessions with no snapshot (never exported, or its file's snapshot is
// gone): they still carry errors and call logs. So at most (MAX_SNAPSHOTS + 1) *
// perFile sessions. The running session is never deleted. Run after snapshots
// are pruned.
function pruneSessions(perFile: number): void {
  const dir = path.join(debugDir(), "sessions");
  const snapDir = path.join(debugDir(), "snapshots");
  const files = new Set(
    (fs.existsSync(snapDir) ? fs.readdirSync(snapDir) : []).map((n) =>
      n.slice(STAMP_LENGTH + 1),
    ),
  );
  const current = sessionFile && path.basename(sessionFile);
  const count: Record<string, number> = {};
  for (const name of fs.readdirSync(dir).sort().reverse()) {
    const linked = snapshotEvents(path.join(dir, name))
      .map((s) => s.name ?? "")
      .filter((n) => files.has(n));
    const docs = linked.length ? linked : [""];
    if (docs.some((d) => (count[d] || 0) < perFile) || name === current)
      docs.forEach((d) => (count[d] = (count[d] || 0) + 1));
    else fs.unlinkSync(path.join(dir, name));
  }
}

// "2026-09-30T07-14-20-688Z"; snapshot names are `${stamp}-${doc name}`
const STAMP_LENGTH = 24;

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function toPlain(value: unknown): unknown {
  return value instanceof Error
    ? { name: value.name, message: value.message, stack: value.stack }
    : value;
}

// sync so the line is on disk even if the panel dies right after
function writeLine(type: string, data?: unknown): void {
  fs.appendFileSync(
    sessionFile,
    JSON.stringify({ t: Date.now(), seq: ++seq, type, data: toPlain(data) }) +
      "\n",
  );
}

export function logEvent(type: string, data?: unknown): void {
  if (!window.cep) return;
  try {
    // also restart when the file vanished (debug folder deleted while the
    // panel stayed loaded — CEP keeps module state across close/reopen)
    if (!sessionFile || !fs.existsSync(sessionFile)) {
      const dir = path.join(debugDir(), "sessions");
      fs.mkdirSync(dir, { recursive: true });
      pruneSessions(MAX_SESSIONS - 1);
      sessionFile = path.join(dir, stamp() + ".jsonl");
      writeLine("session", {
        version,
        host: csi.hostEnvironment?.appVersion,
        userAgent: navigator.userAgent,
      });
    }
    writeLine(type, data);
  } catch (e) {
    console.error("[ai2svelte] debug log write failed:", e);
  }
}

// Polled every few seconds, so ~98% of all calls: logged only when slow or
// failing, and a repeating identical error is logged once.
const QUIET_FNS = ["getVariable", "getDocumentName", "getActiveDocumentsNames"];
const SLOW_MS = 1000;
const quietErrors = new Map<string, { message: string; count: number }>();

export function logCall(id: number, fn: string, args: unknown[]): void {
  if (!QUIET_FNS.includes(fn)) logEvent("call", { id, fn, args });
}

// `error` is set when the call failed. For a quiet fn the "call" line is
// written here, after the fact, so the log shows only the calls that matter.
export function logDone(
  id: number,
  fn: string,
  args: unknown[],
  ms: number,
  error?: unknown,
): void {
  if (QUIET_FNS.includes(fn)) {
    const slow = ms >= SLOW_MS;
    const prev = quietErrors.get(fn);
    const message =
      error === undefined
        ? ""
        : String((error as { message?: unknown })?.message ?? error);
    if (error === undefined) {
      // ponytail: the repeat count is only written once the fn recovers
      if (prev?.count)
        logEvent("repeat", { fn, message: prev.message, count: prev.count });
      quietErrors.delete(fn);
      if (!slow) return;
    } else if (prev?.message === message) {
      if (!slow) {
        prev.count++;
        return;
      }
    } else quietErrors.set(fn, { message, count: 0 });
    logEvent("call", { id, fn, args });
  }
  logEvent(
    error === undefined ? "result" : "error",
    error === undefined ? { id, ms } : { id, ms, error },
  );
}

export function initDebugLog(): void {
  window.addEventListener("error", (e) =>
    logEvent("panel-error", {
      message: e.message,
      source: e.filename,
      line: e.lineno,
      stack: e.error?.stack,
    }),
  );
  window.addEventListener("unhandledrejection", (e) =>
    logEvent("panel-error", { rejection: toPlain(e.reason) }),
  );
}

// Saves the active .ai file if it has unsaved edits, then copies it, before
// running `run` -- so the copy is exactly the artwork `run` sees.
// A failed snapshot is logged and never blocks the user's action.
export async function withSnapshot<T>(run: () => Promise<T>): Promise<T> {
  if (window.cep) {
    try {
      const dir = path.join(debugDir(), "snapshots");
      fs.mkdirSync(dir, { recursive: true });
      const snap = await evalTS(
        "saveAndSnapshotDocument",
        path.join(dir, stamp() + "-"),
      );
      logEvent("snapshot", snap);
      // replay only uses a file's newest snapshot, so drop its older copies
      if (snap?.path) {
        const latest = path.basename(snap.path);
        fs.readdirSync(dir)
          .filter(
            (n) => n !== latest && n.slice(STAMP_LENGTH + 1) === snap.name,
          )
          .forEach((n) => fs.unlinkSync(path.join(dir, n)));
      }
      pruneDir(dir, MAX_SNAPSHOTS);
      pruneSessions(MAX_SESSIONS);
    } catch (e) {
      logEvent("snapshot-failed", toPlain(e));
    }
  }
  return run();
}

// Finds the log data tied to one .ai file. A session is tied to a file by the
// snapshot events it contains. Returns null if nothing is tied to it yet.
export function findDebugData(
  docPath: string,
): { sessions: string[]; snapshots: string[] } | null {
  const sessionsDir = path.join(debugDir(), "sessions");
  if (!fs.existsSync(sessionsDir)) return null;
  const sessions: string[] = [];
  const snapshots: string[] = [];
  for (const name of fs.readdirSync(sessionsDir)) {
    let linked = false;
    for (const snap of snapshotEvents(path.join(sessionsDir, name))) {
      // older snapshots have no source, so match those by file name
      const sameFile = snap.source
        ? snap.source === docPath
        : snap.name === path.basename(docPath);
      if (sameFile) {
        linked = true;
        snapshots.push(path.basename(snap.path));
      }
    }
    if (linked) sessions.push(name);
  }
  return sessions.length ? { sessions, snapshots } : null;
}

// Copies one file's sessions and snapshots (from findDebugData) into a new
// folder in `parent` and returns its path. Whole session files are copied, so
// they can include calls made on other documents during the same session.
export function exportDebugReport(
  parent: string,
  data: { sessions: string[]; snapshots: string[] },
): string {
  const dest = path.join(parent, "ai2svelte-debug-" + stamp());
  const copy = (sub: string, names: string[]) => {
    fs.mkdirSync(path.join(dest, sub), { recursive: true });
    for (const name of names) {
      const from = path.join(debugDir(), sub, name);
      // snapshots can already be pruned (one per file, three files)
      if (fs.existsSync(from))
        fs.copyFileSync(from, path.join(dest, sub, name));
    }
  };
  copy("sessions", data.sessions);
  copy("snapshots", data.snapshots);
  // sessions whose own snapshot was pruned can be read but not replayed
  const noSnapshot = data.sessions.filter(
    (name) =>
      !snapshotEvents(path.join(debugDir(), "sessions", name)).some((s) =>
        fs.existsSync(path.join(dest, "snapshots", path.basename(s.path))),
      ),
  );
  if (noSnapshot.length)
    fs.writeFileSync(
      path.join(dest, "notes.txt"),
      "These sessions have no snapshot of their own (the .ai file was exported\n" +
        "again later), so they show what happened but cannot be replayed:\n" +
        noSnapshot.join("\n") +
        "\n",
    );
  return dest;
}
