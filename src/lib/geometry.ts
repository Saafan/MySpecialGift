/**
 * Product print geometry — the single source of truth.
 *
 * V1 had two conflicting geometry models (the seed said the cup canvas was
 * 800x400; the code said 1115x380) and the 2D-3D contract lived only in
 * comments. V2 keeps every geometric constant in this one module; the database
 * references categories by slug and the 3D scene derives its print band from
 * the same values. `src/lib/geometry.test.ts` asserts the mug invariant.
 */

export type ProductCategory = "cup" | "t-shirt" | "sticker" | "badge";

export interface ArtboardSize {
  width: number;
  height: number;
}

/**
 * Mug print-band geometry. Shared by the artboard (2D) and `buildMug` (3D).
 *
 * - bandBottom/bandTop: vertical extent of the printable band on the mug wall
 *   (above the base curve, below the rim).
 * - handleGapDeg: angular gap left un-printed around the handle so artwork
 *   never wraps onto it.
 * - bandAvgRadius: average radius of the tapered print band cone.
 *
 * The printable arc length is (1 - handleGapDeg/360) x 2*pi*bandAvgRadius and the
 * band height is bandTop - bandBottom. Their ratio (~2.934) MUST equal the cup
 * artboard aspect ratio below, or artwork stretches on the 3D mug.
 */
export const MUG_3D_PRINT = {
  bandBottom: 0.34,
  bandTop: 1.78,
  handleGapDeg: 76,
  bandAvgRadius: 0.852,
} as const;

export function mugBandAspectRatio(): number {
  const wrapFraction = 1 - MUG_3D_PRINT.handleGapDeg / 360;
  const arcLength = wrapFraction * 2 * Math.PI * MUG_3D_PRINT.bandAvgRadius;
  const bandHeight = MUG_3D_PRINT.bandTop - MUG_3D_PRINT.bandBottom;
  return arcLength / bandHeight;
}

/**
 * Print-area aspect ratios per product category:
 * - cup: wrap band, wider than tall (aspect derived from the 3D mug — see above)
 * - t-shirt: portrait chest print
 * - sticker / badge: square
 */
export const ARTBOARD_SIZES: Record<ProductCategory, ArtboardSize> = {
  cup: { width: 1115, height: 380 },
  "t-shirt": { width: 600, height: 760 },
  sticker: { width: 640, height: 640 },
  badge: { width: 640, height: 640 },
};

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  cup: "Mug",
  "t-shirt": "T-Shirt",
  sticker: "Sticker",
  badge: "Badge",
};

const CATEGORY_ALIASES: Record<string, ProductCategory> = {
  cup: "cup",
  cups: "cup",
  mug: "cup",
  mugs: "cup",
  "t-shirt": "t-shirt",
  "t-shirts": "t-shirt",
  tshirt: "t-shirt",
  tee: "t-shirt",
  sticker: "sticker",
  stickers: "sticker",
  badge: "badge",
  badges: "badge",
};

export function resolveCategory(value: string | null | undefined): ProductCategory | null {
  if (!value) return null;
  return CATEGORY_ALIASES[value.toLowerCase()] ?? null;
}

export function isProductCategory(value: string): value is ProductCategory {
  return value in ARTBOARD_SIZES;
}

/* ------------------------------------------------------------------ */
/* Print-size limits                                                    */
/* ------------------------------------------------------------------ */

export interface PrintLimits {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
}

const MIN_SCALE = 0.25;

export function getPrintLimits(category: ProductCategory): PrintLimits {
  const max = ARTBOARD_SIZES[category];
  return {
    maxWidth: max.width,
    maxHeight: max.height,
    minWidth: Math.round(max.width * MIN_SCALE),
    minHeight: Math.round(max.height * MIN_SCALE),
  };
}

export function getDefaultPrintSize(category: ProductCategory): ArtboardSize {
  const max = ARTBOARD_SIZES[category];
  return { width: max.width, height: max.height };
}

export function clampPrintSize(
  category: ProductCategory,
  width: number,
  height: number,
): ArtboardSize {
  const limits = getPrintLimits(category);
  return {
    width: Math.min(limits.maxWidth, Math.max(limits.minWidth, Math.round(width))),
    height: Math.min(limits.maxHeight, Math.max(limits.minHeight, Math.round(height))),
  };
}
