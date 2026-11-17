import { describe, it, expect, vi, beforeEach } from "vitest";

const evalScript = vi.hoisted(() => vi.fn());

vi.mock("../../cep/csinterface", () => ({
  default: class {
    evalScript = evalScript;
  },
  CSEvent: class {},
}));
vi.mock("../../cep/vulcan", () => ({
  default: class {},
  VulcanMessage: class {},
}));
vi.mock("../../cep/node", () => ({ fs: {} }));
vi.mock("../init-cep", () => ({ initializeCEP: vi.fn() }));
vi.mock("../../../main/utils/debugLog", () => ({
  logCall: vi.fn(),
  logDone: vi.fn(),
}));

import { evalTS } from "../bolt";

// Make the host answer the next evalScript call with `res`.
const hostReturns = (res: string) =>
  evalScript.mockImplementationOnce((_s: string, cb: (r: string) => void) =>
    cb(res),
  );
const call = () => (evalTS as (fn: string) => Promise<unknown>)("anything");

describe("evalTS result handling", () => {
  beforeEach(() => evalScript.mockReset());

  it("resolves a result whose name contains 'error'", async () => {
    hostReturns(JSON.stringify({ name: "errors-by-state.ai" }));
    await expect(call()).resolves.toEqual({ name: "errors-by-state.ai" });
  });

  it("resolves a null result", async () => {
    hostReturns("null");
    await expect(call()).resolves.toBeNull();
  });

  it("rejects with the unwrapped __esError", async () => {
    hostReturns(JSON.stringify({ __esError: { message: "x" } }));
    await expect(call()).rejects.toEqual({ message: "x" });
  });
});
