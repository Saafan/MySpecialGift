import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NumberInput } from "./number-input";

/**
 * Guards against V1's BUG-P01 family — the most consequential bug in the
 * project's history: inspector inputs that revert, clobber typing, or commit
 * partial values while the user is still typing.
 */
describe("NumberInput", () => {
  it("commits once on blur, not per keystroke", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<NumberInput label="X" value={50} onCommit={onCommit} />);

    const input = screen.getByLabelText("X");
    await user.clear(input);
    await user.type(input, "100");
    // V1 committed while typing: X=1, then X=10, then X=100.
    expect(onCommit).not.toHaveBeenCalled();

    await user.tab();
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(100);
  });

  it("commits on Enter", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<NumberInput label="Y" value={10} onCommit={onCommit} />);

    const input = screen.getByLabelText("Y");
    await user.clear(input);
    await user.type(input, "42{Enter}");
    expect(onCommit).toHaveBeenCalledWith(42);
  });

  it("restores the previous value instead of committing 0 for an empty field", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<NumberInput label="Width" value={80} onCommit={onCommit} />);

    const input = screen.getByLabelText("Width");
    await user.clear(input);
    await user.tab();

    // V1 coerced empty to 0 and snapped objects to the origin.
    expect(onCommit).not.toHaveBeenCalled();
    expect(input).toHaveValue(80);
  });

  it("does not clobber typing when the external value changes mid-edit", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const { rerender } = render(<NumberInput label="X" value={50} onCommit={onCommit} />);

    const input = screen.getByLabelText("X");
    await user.clear(input);
    await user.type(input, "7");

    // A canvas drag updates the external value while the field is focused.
    rerender(<NumberInput label="X" value={99} onCommit={onCommit} />);
    expect(input).toHaveValue(7);
  });

  it("syncs from the canvas when not focused", () => {
    const onCommit = vi.fn();
    const { rerender } = render(<NumberInput label="X" value={50} onCommit={onCommit} />);
    rerender(<NumberInput label="X" value={120} onCommit={onCommit} />);
    expect(screen.getByLabelText("X")).toHaveValue(120);
  });

  it("clamps to min/max on commit", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<NumberInput label="Size" value={20} min={6} max={400} onCommit={onCommit} />);

    const input = screen.getByLabelText("Size");
    await user.clear(input);
    await user.type(input, "9999{Enter}");
    expect(onCommit).toHaveBeenCalledWith(400);
  });
});
