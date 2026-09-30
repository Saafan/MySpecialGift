/**
 * The five paper blooms a bouquet can be built from.
 *
 * `code` is the single character the share-link codec writes per stem, so it
 * must stay unique and must never change once a link has been sent to someone
 * (`config.test.ts` guards the uniqueness half of that).
 */

export type FlowerId = "rose" | "tulip" | "gerbera" | "chrysanthemum" | "sunflower";

export interface FlowerColor {
  id: string;
  name: string;
  hex: string;
}

export interface FlowerType {
  id: FlowerId;
  name: string;
  tagline: string;
  /** Price of one stem, in piastres. */
  priceCents: number;
  code: string;
  /** Real bloom photo shown on the palette card. */
  image: string;
  colors: FlowerColor[];
}

export const FLOWER_TYPES: FlowerType[] = [
  {
    id: "rose",
    name: "Rose",
    tagline: "Rolled crepe petals, tight spiral centre",
    priceCents: 9500,
    code: "r",
    image: "/bouquet/rose.png",
    colors: [
      { id: "red", name: "Red", hex: "#c4313a" },
      { id: "pink", name: "Pink", hex: "#e989b0" },
    ],
  },
  {
    id: "tulip",
    name: "Tulip",
    tagline: "Clean cupped petals, quietly cheerful",
    priceCents: 8500,
    code: "t",
    image: "/bouquet/tulip.png",
    colors: [{ id: "white", name: "White", hex: "#f6f1e8" }],
  },
  {
    id: "gerbera",
    name: "Gerbera",
    tagline: "Wide open petals around a dark eye",
    priceCents: 6500,
    code: "d",
    image: "/bouquet/gerbera-pink.png",
    colors: [{ id: "pink", name: "Pink", hex: "#ff3d78" }],
  },
  {
    id: "chrysanthemum",
    name: "Chrysanthemum",
    tagline: "A dense ball of ruffled petals",
    priceCents: 11000,
    code: "p",
    image: "/bouquet/chrysanthemum.png",
    colors: [{ id: "white", name: "White", hex: "#f7f3ea" }],
  },
  {
    id: "sunflower",
    name: "Sunflower",
    tagline: "Big, bright and slightly unserious",
    priceCents: 9000,
    code: "s",
    image: "/bouquet/sunflower.png",
    colors: [{ id: "marigold", name: "Marigold", hex: "#eab838" }],
  },
];

export function findFlower(id: string | undefined): FlowerType {
  return FLOWER_TYPES.find((flower) => flower.id === id) ?? FLOWER_TYPES[0];
}

export function findFlowerColor(flower: FlowerType, colorId: string | undefined): FlowerColor {
  return flower.colors.find((color) => color.id === colorId) ?? flower.colors[0];
}
