import { describe, expect, it } from "vitest";
import {
  formatSelection,
  hasSizeUpcharge,
  resolveUnitPriceCents,
  sanitizeSelection,
} from "./product-options";

const canvas = {
  sizes: [
    { id: "30x17", label: "30 cm × 17 cm", extraCents: 0 },
    { id: "40x22.5", label: "40 cm × 22.5 cm", extraCents: 10000 },
    { id: "50x28", label: "50 cm × 28 cm", extraCents: 20000 },
    { id: "120x68", label: "120 cm × 68 cm", extraCents: 50000 },
  ],
};

describe("product option pricing", () => {
  it("charges the base price for the default canvas size", () => {
    expect(resolveUnitPriceCents(29900, canvas, {})).toBe(29900);
  });

  it("adds the size extra and ignores a forged amount", () => {
    expect(resolveUnitPriceCents(29900, canvas, { sizeId: "120x68", extraCents: 1 })).toBe(79900);
  });

  it("falls back to the base size for an unknown id", () => {
    expect(sanitizeSelection(canvas, { sizeId: "nope" }).sizeId).toBe("30x17");
  });

  it("flags catalogues that have a paid size step", () => {
    expect(hasSizeUpcharge(canvas)).toBe(true);
    expect(hasSizeUpcharge({ choices: [{ id: "black", name: "Black" }] })).toBe(false);
  });

  it("labels the chosen size and person", () => {
    const options = {
      ...canvas,
      choices: [{ id: "mom", name: "Mom" }],
    };
    expect(formatSelection(options, { sizeId: "40x22.5", choiceId: "mom" })).toBe(
      "40 cm × 22.5 cm · Mom",
    );
  });
});
