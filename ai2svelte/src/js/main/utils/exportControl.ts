// The engine stops itself after 10 minutes (see checkAbort in ai2svelte.js).
// This is the panel's backstop for when Illustrator never answers at all (a
// hang inside one Illustrator call can't be stopped from either side): it frees
// the panel after 15 minutes.
export const EXPORT_WATCHDOG_MS = 15 * 60 * 1000;

export class ExportUnresponsive extends Error {
  constructor(minutes: number) {
    super(
      `Illustrator didn't respond for ${minutes} minutes. Check for an open dialog in Illustrator; if it's frozen, restart it.`,
    );
  }
}

// Rejects with ExportUnresponsive if `work` takes longer than `ms`. The work
// itself keeps running (it can't be stopped).
export function withWatchdog<T>(
  work: Promise<T>,
  ms: number = EXPORT_WATCHDOG_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new ExportUnresponsive(Math.round(ms / 60000))),
      ms,
    );
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}
