import { describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/svelte";

const addEventListener = vi.fn();
vi.mock("../../../../../public/BoltHostAdapter.js", () => ({
  AIEvent: { ART_SELECTION_CHANGED: "artSelectionChanged" },
  AIEventAdapter: { getInstance: () => ({ addEventListener }) },
}));

vi.mock("../../../../lib/cep/node", async (orig) => ({
  ...(await orig<object>()),
  os: { platform: () => "linux" },
}));

import Styles from "../Styles.svelte";

describe("Styles selection listener", () => {
  it("registers one ART_SELECTION_CHANGED listener across remounts", async () => {
    Object.assign(window, { cep: {} });
    for (let i = 0; i < 3; i++) {
      const view = render(Styles);
      await waitFor(() => expect(addEventListener).toHaveBeenCalled());
      view.unmount();
    }
    expect(addEventListener).toHaveBeenCalledTimes(1);
  });
});
