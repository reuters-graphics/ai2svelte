import { beforeEach, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { get } from "svelte/store";
import { triggerWave } from "../../stores";
import Wave from "../Wave.svelte";

const { play } = vi.hoisted(() => ({ play: vi.fn() }));

vi.mock("../../lib/distortion-waves/controller", () => ({
  WaveController: class {
    play = play;
    update = vi.fn();
    destroy = vi.fn();
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  triggerWave.set(null);
});

it("plays from the supplied button and clears the pending wave", async () => {
  render(Wave, {
    children: createRawSnippet(() => ({
      render: () => "<button>Run</button>",
    })),
  });
  const source = document.querySelector("button");
  expect(source).not.toBeNull();
  triggerWave.set(source);

  await waitFor(() => {
    expect(play).toHaveBeenCalledExactlyOnceWith({ source });
    expect(get(triggerWave)).toBeNull();
  });
});
