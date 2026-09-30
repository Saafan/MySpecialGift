import { describe, expect, it } from "vitest";
import {
  formatSelection,
  hasSizeUpcharge,
  resolveUnitPriceCents,
  sanitizeSelection,
} from "./product-options";

const canvas = {
  sizes: [
    { id: "30x40", label: "30 cm × 40 cm", extraCents: 0 },
    { id: "40x50", label: "40 cm × 50 cm", extraCents: 5000 },
    { id: "50x60", label: "50 cm × 60 cm", extraCents: 10000 },
  ],
};

describe("product option pricing", () => {
  it("charges the base price for the default canvas size", () => {
    expect(resolveUnitPriceCents(29900, canvas, {})).toBe(29900);
  });

  it("adds the size extra and ignores a forged amount", () => {
    expect(resolveUnitPriceCents(29900, canvas, { sizeId: "50x60", extraCents: 1 })).toBe(39900);
  });

  it("falls back to the base size for an unknown id", () => {
    expect(sanitizeSelection(canvas, { sizeId: "nope" }).sizeId).toBe("30x40");
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
    expect(formatSelection(options, { sizeId: "40x50", choiceId: "mom" })).toBe(
      "40 cm × 50 cm · Mom",
    );
  });
});
