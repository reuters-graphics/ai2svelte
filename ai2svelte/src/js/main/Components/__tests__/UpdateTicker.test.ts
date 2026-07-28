import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import UpdateTicker from "../UpdateTicker.svelte";

describe("UpdateTicker", () => {
  it("renders the update message with the version", () => {
    const { getByRole } = render(UpdateTicker, {
      url: "https://example.com/releases/latest",
      version: "v1.0.8",
    });
    expect(getByRole("button", { name: /download now/i }).textContent).toMatch(
      /v1\.0\.8 is now available\. Download now!/
    );
  });

  it("falls back to a generic message when no version is given", () => {
    const { getByRole } = render(UpdateTicker, {
      url: "https://example.com/releases/latest",
      version: null,
    });
    expect(getByRole("button", { name: /download now/i }).textContent).toMatch(
      /A new version is now available\. Download now!/
    );
  });

  it("calls onDismiss when the dismiss button is clicked", async () => {
    const onDismiss = vi.fn();
    render(UpdateTicker, {
      url: "https://example.com/releases/latest",
      version: "v1.0.8",
      onDismiss,
    });

    await userEvent.click(screen.getByLabelText("Dismiss update notice"));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
