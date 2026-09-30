import { describe, expect, it } from "vitest";
import {
  ARTBOARD_SIZES,
  clampPrintSize,
  getPrintLimits,
  mugBandAspectRatio,
  resolveCategory,
} from "./geometry";

describe("mug 2D-3D contract", () => {
  it("cup artboard aspect ratio matches the 3D print band", () => {
    const artboard = ARTBOARD_SIZES.cup.width / ARTBOARD_SIZES.cup.height;
    const band = mugBandAspectRatio();
    expect(Math.abs(artboard - band) / band).toBeLessThan(0.005);
  });

  it("gives the thermal bottle the same wrap as the mug", () => {
    expect(ARTBOARD_SIZES.bottle).toEqual(ARTBOARD_SIZES.cup);
  });
});

describe("print size clamping", () => {
  it("clamps to [25%, 100%] of the category maximum", () => {
    const limits = getPrintLimits("cup");
    expect(limits.minWidth).toBe(Math.round(ARTBOARD_SIZES.cup.width * 0.25));
    expect(clampPrintSize("cup", 10_000, 10_000)).toEqual(ARTBOARD_SIZES.cup);
    expect(clampPrintSize("cup", 1, 1)).toEqual({
      width: limits.minWidth,
      height: limits.minHeight,
    });
  });

  it("rounds fractional sizes", () => {
    expect(clampPrintSize("sticker", 500.6, 499.4)).toEqual({ width: 501, height: 499 });
  });
});

describe("category aliases", () => {
  it("accepts the full alias vocabulary", () => {
    for (const alias of ["mug", "mugs", "cup", "cups"]) {
      expect(resolveCategory(alias)).toBe("cup");
    }
    for (const alias of ["tee", "tshirt", "t-shirt", "t-shirts"]) {
      expect(resolveCategory(alias)).toBe("t-shirt");
    }
    expect(resolveCategory("STICKERS")).toBe("sticker");
    expect(resolveCategory("badge")).toBe("badge");
    expect(resolveCategory("hat")).toBeNull();
    expect(resolveCategory(null)).toBeNull();
  });
});
