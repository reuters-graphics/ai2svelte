import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import CMTextArea from "../CMTextArea.svelte";

const emptyRectList = Object.assign(new Array<DOMRect>(), {
  item: (_index: number) => null,
});
Range.prototype.getClientRects = () => emptyRectList;
Range.prototype.getBoundingClientRect = () => new DOMRect();

describe("CMTextArea", () => {
  it("shows a setting's default in its autocomplete info", async () => {
    const user = userEvent.setup();
    const { container } = render(CMTextArea, {
      textValue: "",
      type: "yaml",
      autoCompletionTokens: [
        {
          label: "namespace",
          type: "variable",
          info: "Prefix for HTML elements.",
          default: "g-",
        },
      ],
    });

    await user.type(container.querySelector(".cm-content")!, "namespace");

    expect(await screen.findByText(/Default: g-/)).toBeInTheDocument();
  });
});
