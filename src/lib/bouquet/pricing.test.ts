import { describe, expect, it } from "vitest";
import { defaultBouquet, resizeBouquet, type BouquetConfig } from "./config";
import { FLOWER_TYPES } from "./flowers";
import { BOUQUET_SIZES } from "./layout";
import { WRAP_CENTS, quoteBouquet, startingPriceCents } from "./pricing";

describe("bouquet quotes", () => {
  it("charges the wrap once plus every stem", () => {
    const config: BouquetConfig = {
      size: 10,
      paperId: "kraft",
      stems: [
        { flowerId: "rose", colorId: "red" },
        { flowerId: "rose", colorId: "pink" },
        { flowerId: "gerbera", colorId: "pink" },
        { flowerId: "gerbera", colorId: "pink" },
        { flowerId: "chrysanthemum", colorId: "white" },
      ],
    };

    const quote = quoteBouquet(config);
    expect(quote.wrapCents).toBe(WRAP_CENTS[10]);
    expect(quote.bloomsCents).toBe(9_500 * 2 + 6_500 * 2 + 11_000);
    expect(quote.totalCents).toBe(quote.wrapCents + quote.bloomsCents);
  });

  it("stays in integer piastres at every size", () => {
    for (const size of BOUQUET_SIZES) {
      const quote = quoteBouquet(resizeBouquet(defaultBouquet(), size));
      expect(Number.isInteger(quote.totalCents)).toBe(true);
      expect(quote.lines.reduce((sum, line) => sum + line.quantity, 0)).toBe(size);
    }
  });

  it("lists lines in catalogue order, not paint order", () => {
    const quote = quoteBouquet({
      size: 10,
      paperId: "kraft",
      stems: [
        { flowerId: "sunflower", colorId: "marigold" },
        { flowerId: "rose", colorId: "blush" },
        { flowerId: "sunflower", colorId: "marigold" },
        { flowerId: "gerbera", colorId: "pink" },
        { flowerId: "rose", colorId: "blush" },
      ],
    });
    const order = quote.lines.map((line) => line.label);
    expect(order).toEqual(["Rose stems", "Gerbera stems", "Sunflower stems"]);
  });

  it("quotes the cheapest possible bouquet as the 'from' price", () => {
    const cheapest = Math.min(...FLOWER_TYPES.map((flower) => flower.priceCents));
    for (const size of BOUQUET_SIZES) {
      expect(startingPriceCents(size)).toBe(WRAP_CENTS[size] + cheapest * size);
    }
  });
});
