import { beforeEach, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { get } from "svelte/store";
import { triggerWave } from "../../stores";
import { defaultStyle } from "../../lib/distortion-waves/model";
import Wave from "../Wave.svelte";

const { play, update } = vi.hoisted(() => ({
  play: vi.fn(),
  update: vi.fn(),
}));

vi.mock("../../lib/distortion-waves/controller", () => ({
  WaveController: class {
    play = play;
    update = update;
    destroy = vi.fn();
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  triggerWave.set(null);
});

it("uses Home tuning for a radial tab-bar burst, then restores the Home shape", async () => {
  const { container } = render(Wave, {
    children: createRawSnippet(() => ({
      render: () =>
        '<div><button data-wave-type="center">Tab run</button><button>Home run</button></div>',
    })),
  });
  const [tabButton, homeButton] = container.querySelectorAll("button");
  triggerWave.set(tabButton);

  await waitFor(() => {
    expect(update).toHaveBeenLastCalledWith({
      type: "center",
      waveStyle: defaultStyle("vertical"),
      palette: expect.any(String),
    });
    expect(play).toHaveBeenCalledExactlyOnceWith({
      source: tabButton,
      focus: null,
    });
    expect(get(triggerWave)).toBeNull();
  });

  triggerWave.set(homeButton);
  await waitFor(() => {
    expect(update).toHaveBeenLastCalledWith({
      type: "vertical",
      waveStyle: defaultStyle("vertical"),
      palette: expect.any(String),
    });
    expect(play).toHaveBeenLastCalledWith({ source: homeButton });
  });
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
