import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExportUnresponsive, withWatchdog } from "../exportControl";

describe("withWatchdog", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("passes the result through when the work finishes in time", async () => {
    const work = withWatchdog(Promise.resolve("done"), 1000);
    await expect(work).resolves.toBe("done");
    expect(vi.getTimerCount()).toBe(0); // the timer was cleared
  });

  it("passes the work's own error through", async () => {
    await expect(
      withWatchdog(Promise.reject(new Error("boom")), 1000),
    ).rejects.toThrow("boom");
  });

  it("rejects when the work never finishes", async () => {
    const work = withWatchdog(new Promise(() => {}), 60_000);
    const caught = work.catch((e) => e);
    await vi.advanceTimersByTimeAsync(60_000);
    const error = (await caught) as Error;
    expect(error).toBeInstanceOf(ExportUnresponsive);
    expect(error.message).toMatch(/didn't respond for 1 minutes/);
  });
});
