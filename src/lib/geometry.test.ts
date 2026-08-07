import { describe, expect, it } from "vitest";
import {
  ARTBOARD_SIZES,
  clampPrintSize,
  getPrintLimits,
  mugBandAspectRatio,
  resolveCategory,
} from "./geometry";

describe("mug 2D-3D contract", () => {
  // V1's most valuable undocumented invariant: the cup artboard aspect ratio must
  // equal the 3D mug's printable band aspect (arc length / band height), or artwork
  // renders visibly stretched. In V1 this lived only in comments across two files.
  it("cup artboard aspect ratio matches the 3D print band", () => {
    const artboard = ARTBOARD_SIZES.cup.width / ARTBOARD_SIZES.cup.height;
    const band = mugBandAspectRatio();
    expect(Math.abs(artboard - band) / band).toBeLessThan(0.005);
  });
});

describe("print size clamping", () => {
  it("clamps to [25%, 100%] of the category maximum", () => {
    const limits = getPrintLimits("cup");
    expect(limits.minWidth).toBe(Math.round(1115 * 0.25));
    expect(clampPrintSize("cup", 10_000, 10_000)).toEqual({ width: 1115, height: 380 });
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
