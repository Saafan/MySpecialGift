import { describe, expect, it } from "vitest";
import {
  arrangementFor,
  decodeBouquet,
  defaultBouquet,
  encodeBouquet,
  normaliseBouquet,
  resizeBouquet,
  tallyBlooms,
  type BouquetConfig,
} from "./config";
import { FLOWER_TYPES, selectableColors } from "./flowers";
import { PAPER_STOCKS } from "./papers";
import { BOUQUET_SIZES } from "./layout";

describe("share codec assumptions", () => {
  it("gives every flower a unique code letter", () => {
    const codes = FLOWER_TYPES.map((flower) => flower.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("keeps colour counts to a single digit", () => {
    for (const flower of FLOWER_TYPES) {
      expect(flower.colors.length).toBeLessThanOrEqual(10);
      expect(flower.colors.length).toBeGreaterThan(0);
    }
  });

  it("offers the same five satin colours on every flower", () => {
    for (const flower of FLOWER_TYPES) {
      expect(selectableColors(flower).map((color) => color.id)).toEqual([
        "red",
        "pink",
        "white",
        "cyan",
        "lilac",
      ]);
    }
  });
});

describe("share links", () => {
  it("round-trips every size and every paper", () => {
    for (const size of BOUQUET_SIZES) {
      for (const paper of PAPER_STOCKS) {
        const config = { ...resizeBouquet(defaultBouquet(), size), paperId: paper.id };
        expect(decodeBouquet(encodeBouquet(config))).toEqual(config);
      }
    }
  });

  it("still opens colour indexes from links shared before the satin palette", () => {
    const decoded = decodeBouquet("10-kraft-r0r1t0d0p0s0r0r0r0r0");
    expect(decoded?.stems.slice(0, 6)).toEqual([
      { flowerId: "rose", colorId: "red" },
      { flowerId: "rose", colorId: "pink" },
      { flowerId: "tulip", colorId: "white" },
      { flowerId: "gerbera", colorId: "pink" },
      { flowerId: "chrysanthemum", colorId: "white" },
      { flowerId: "sunflower", colorId: "marigold" },
    ]);
  });

  it("round-trips every colour, including ones only old links still use", () => {
    for (const flower of FLOWER_TYPES) {
      for (const color of flower.colors) {
        const config: BouquetConfig = {
          size: 10,
          paperId: "kraft",
          stems: Array.from({ length: 10 }, () => ({ flowerId: flower.id, colorId: color.id })),
        };
        expect(decodeBouquet(encodeBouquet(config))).toEqual(config);
      }
    }
  });

  it("round-trips a fully hand-painted bouquet", () => {
    const config: BouquetConfig = {
      size: 15,
      paperId: "charcoal",
      stems: Array.from({ length: 15 }, (_, i) => {
        const flower = FLOWER_TYPES[i % FLOWER_TYPES.length];
        return { flowerId: flower.id, colorId: flower.colors[i % flower.colors.length].id };
      }),
    };
    expect(decodeBouquet(encodeBouquet(config))).toEqual(config);
  });

  it("rejects anything malformed instead of drawing a broken bouquet", () => {
    const valid = encodeBouquet(defaultBouquet());
    expect(decodeBouquet(null)).toBeNull();
    expect(decodeBouquet("")).toBeNull();
    expect(decodeBouquet("nonsense")).toBeNull();
    // Unsupported size, unknown paper, wrong stem count, unknown flower code,
    // colour index out of range.
    expect(decodeBouquet("7-kraft-r0r0r0r0r0r0r0")).toBeNull();
    expect(decodeBouquet("5-velvet-r0r0r0r0r0")).toBeNull();
    expect(decodeBouquet("5-kraft-r0r0")).toBeNull();
    expect(decodeBouquet("5-kraft-z0z0z0z0z0")).toBeNull();
    expect(decodeBouquet("5-kraft-r9r0r0r0r0")).toBeNull();
    expect(decodeBouquet(valid)).not.toBeNull();
  });
});

describe("the house arrangement", () => {
  it("starts as a round bouquet of red roses", () => {
    const config = defaultBouquet();
    expect(config.size).toBe(10);
    expect(config.stems).toEqual(arrangementFor(10));
    expect(config.stems.every((stem) => stem.flowerId === "rose" && stem.colorId === "red")).toBe(
      true,
    );
  });
});

describe("resizing", () => {
  it("stays all red roses while the bouquet has not been painted", () => {
    const grown = resizeBouquet(defaultBouquet(), 20);
    expect(grown.stems).toEqual(arrangementFor(20));
  });

  it("keeps a hand-painted bouquet and fills new stems with red roses", () => {
    const start = defaultBouquet();
    const painted: BouquetConfig = {
      ...start,
      stems: start.stems.map(() => ({ flowerId: "chrysanthemum", colorId: "white" })),
    };

    const grown = resizeBouquet(painted, 15);
    expect(grown.stems).toHaveLength(15);
    expect(grown.stems.slice(0, 10)).toEqual(painted.stems);
    expect(grown.stems.slice(10)).toEqual(
      Array.from({ length: 5 }, () => ({ flowerId: "rose", colorId: "red" })),
    );

    const shrunk = resizeBouquet(grown, 10);
    expect(shrunk.stems).toEqual(painted.stems);
  });
});

describe("normalising untrusted input", () => {
  it("repairs unknown ids and stem counts", () => {
    const repaired = normaliseBouquet({
      size: 99,
      paperId: "velvet",
      stems: [{ flowerId: "orchid", colorId: "neon" }],
    } as unknown as BouquetConfig);

    expect(BOUQUET_SIZES).toContain(repaired.size);
    expect(repaired.stems).toHaveLength(repaired.size);
    expect(PAPER_STOCKS.some((paper) => paper.id === repaired.paperId)).toBe(true);
    for (const stem of repaired.stems) {
      const flower = FLOWER_TYPES.find((candidate) => candidate.id === stem.flowerId);
      expect(flower).toBeDefined();
      expect(flower?.colors.some((color) => color.id === stem.colorId)).toBe(true);
    }
  });
});

describe("bloom tally", () => {
  it("groups by flower and colour and counts every stem", () => {
    const config = defaultBouquet();
    const tallies = tallyBlooms(config);
    expect(tallies.reduce((sum, tally) => sum + tally.quantity, 0)).toBe(config.size);
    expect(new Set(tallies.map((t) => `${t.flowerId}-${t.colorId}`)).size).toBe(tallies.length);
  });
});
