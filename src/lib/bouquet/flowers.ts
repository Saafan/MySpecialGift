/**
 * The five satin blooms a bouquet can be built from.
 *
 * `code` is the single character the share-link codec writes per stem, so it
 * must stay unique and must never change once a link has been sent to someone
 * (`config.test.ts` guards the uniqueness half of that).
 *
 * Colour *order* is the other half of that codec: the link stores an index,
 * not the id. Existing indices stay put (rose 0 = red, tulip 0 = white, …,
 * sunflower 0 = marigold). New colours are appended. The picker shows the
 * five satin colours in a fixed order via `selectableColors`.
 *
 * A satin photo is `public/bouquet/<flower>-<color>.webp` (or `.png` on a
 * white background, which the page cuts out). Dropping the file is enough —
 * nothing in this catalogue has to be edited. `image` is the older natural
 * portrait, used only while that flower's satin photo is still missing.
 */

export type FlowerId = "rose" | "tulip" | "gerbera" | "chrysanthemum" | "sunflower";

export interface FlowerColor {
  id: string;
  name: string;
  hex: string;
  /** Decodes from old links, but is not offered for new bouquets. */
  legacy?: boolean;
}

export interface FlowerType {
  id: FlowerId;
  name: string;
  tagline: string;
  /** Price of one stem, in piastres. */
  priceCents: number;
  code: string;
  /** Natural-flower portrait. Fallback for the palette until a satin photo exists. */
  image: string;
  colors: FlowerColor[];
}

/** Picker order. Not the share-link index order — that lives on each flower. */
export const SATIN_COLOR_IDS = ["red", "pink", "white", "cyan", "lilac"] as const;

const SATIN: Record<(typeof SATIN_COLOR_IDS)[number], FlowerColor> = {
  // Shared swatches. Rose, tulip and gerbera satin all sit on these; a
  // later flower can still move one if its fabric disagrees.
  red: { id: "red", name: "Red", hex: "#c82538" },
  pink: { id: "pink", name: "Pink", hex: "#f68ba4" },
  white: { id: "white", name: "White", hex: "#e3dcd6" },
  cyan: { id: "cyan", name: "Cyan", hex: "#36cbeb" },
  lilac: { id: "lilac", name: "Lilac", hex: "#c8a7ea" },
};

function satin(...ids: (typeof SATIN_COLOR_IDS)[number][]): FlowerColor[] {
  return ids.map((id) => ({ ...SATIN[id] }));
}

export const FLOWER_TYPES: FlowerType[] = [
  {
    id: "rose",
    name: "Rose",
    tagline: "Rolled crepe petals, tight spiral centre",
    priceCents: 9500,
    code: "r",
    image: "/bouquet/rose.png",
    // Index 0 red and 1 pink match links shared before the satin palette.
    colors: satin("red", "pink", "white", "cyan", "lilac"),
  },
  {
    id: "tulip",
    name: "Tulip",
    tagline: "Clean cupped petals, quietly cheerful",
    priceCents: 8500,
    code: "t",
    image: "/bouquet/tulip.png",
    colors: satin("white", "red", "pink", "cyan", "lilac"),
  },
  {
    id: "gerbera",
    name: "Gerbera",
    tagline: "Wide open petals around a dark eye",
    priceCents: 6500,
    code: "d",
    image: "/bouquet/gerbera.png",
    colors: satin("pink", "red", "white", "cyan", "lilac"),
  },
  {
    id: "chrysanthemum",
    name: "Chrysanthemum",
    tagline: "A dense ball of ruffled petals",
    priceCents: 11000,
    code: "p",
    image: "/bouquet/chrysanthemum.png",
    colors: satin("white", "red", "pink", "cyan", "lilac"),
  },
  {
    id: "sunflower",
    name: "Sunflower",
    tagline: "Big, bright and slightly unserious",
    priceCents: 9000,
    code: "s",
    image: "/bouquet/sunflower.png",
    colors: [
      // Index 0 stays marigold so an old sunflower link still opens.
      { id: "marigold", name: "Marigold", hex: "#eab838", legacy: true },
      ...satin("red", "pink", "white", "cyan", "lilac"),
    ],
  },
];

const SATIN_RANK = new Map<string, number>(SATIN_COLOR_IDS.map((id, index) => [id, index]));

/** Colours a customer can paint with, in picker order. Legacy ids are omitted. */
export function selectableColors(flower: FlowerType): FlowerColor[] {
  return flower.colors
    .filter((color) => !color.legacy)
    .slice()
    .sort((a, b) => (SATIN_RANK.get(a.id) ?? 99) - (SATIN_RANK.get(b.id) ?? 99));
}

export function findFlower(id: string | undefined): FlowerType {
  return FLOWER_TYPES.find((flower) => flower.id === id) ?? FLOWER_TYPES[0];
}

export function findFlowerColor(flower: FlowerType, colorId: string | undefined): FlowerColor {
  const match = flower.colors.find((color) => color.id === colorId);
  if (match) return match;
  return selectableColors(flower)[0] ?? flower.colors[0];
}
