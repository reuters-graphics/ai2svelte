// Local debug log: every evalTS call lands in userData/<id>/debug/sessions/*.jsonl,
// and each export (runAi2Svelte) gets a copy of the .ai file in debug/snapshots/ first.
// Replay a bundle with `pnpm replay "<folder>"` (scripts/replay/replay.mjs).
// Nothing leaves the machine unless the user exports and sends the folder.
import { fs, path } from "../../lib/cep/node";
// circular with bolt.ts (it imports logEvent) — safe because both are only
// touched inside functions, never at module load
import { csi, evalTS } from "../../lib/utils/bolt";
import { ns, version } from "../../../shared/shared";

const MAX_SESSIONS = 10;
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
      pruneDir(dir, MAX_SESSIONS - 1);
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
          .filter((n) => n !== latest && n.slice(STAMP_LENGTH + 1) === snap.name)
          .forEach((n) => fs.unlinkSync(path.join(dir, n)));
      }
      pruneDir(dir, MAX_SNAPSHOTS);
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
    const lines = fs
      .readFileSync(path.join(sessionsDir, name), "utf8")
      .split("\n");
    for (const line of lines) {
      if (!line.includes('"type":"snapshot"')) continue;
      const event = JSON.parse(line);
      const snap = event.type === "snapshot" && event.data;
      // older snapshots have no source, so match those by file name
      const sameFile = snap?.source
        ? snap.source === docPath
        : snap?.name === path.basename(docPath);
      if (snap?.path && sameFile) {
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
      if (fs.existsSync(from)) fs.copyFileSync(from, path.join(dest, sub, name));
    }
  };
  copy("sessions", data.sessions);
  copy("snapshots", data.snapshots);
  return dest;
}
