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
 *
 * The printable arc length is (1 - handleGapDeg/360) x 2*pi*avgBandRadius and
 * the band height is bandTop - bandBottom. Their ratio (~2.934) MUST equal the
 * cup artboard aspect ratio below, or artwork stretches on the 3D mug.
 */
export const MUG_3D_PRINT = {
  bandBottom: 0.34,
  bandTop: 1.78,
  handleGapDeg: 76,
} as const;

/**
 * Outer-wall radius of the mug body at a given height. Must match the lathe
 * profile in `buildMugProfile` (src/lib/editor/product-3d.ts).
 */
const MUG_WALL_CONTROL: [number, number][] = [
  [0.06, 0.8],
  [1.0, 0.845],
  [1.95, 0.87],
  [2.02, 0.875],
];

/**
 * The print band sits slightly proud of the wall: the band is a straight cone
 * while the body bulges outward at mid-height, and this offset keeps the band
 * clear of that bulge so the body never z-fights through the artwork.
 */
export const MUG_BAND_EPS = 0.013;

export function mugWallRadius(y: number): number {
  const pts = MUG_WALL_CONTROL;
  if (y <= pts[0][0]) return pts[0][1];
  if (y >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [y0, r0] = pts[i];
    const [y1, r1] = pts[i + 1];
    if (y >= y0 && y <= y1) {
      const t = (y - y0) / (y1 - y0);
      return r0 + t * (r1 - r0);
    }
  }
  return pts[pts.length - 1][1];
}

/** Radii of the tapered print-band cone, derived from the wall profile. */
export function mugBandRadii() {
  const bottom = mugWallRadius(MUG_3D_PRINT.bandBottom) + MUG_BAND_EPS;
  const top = mugWallRadius(MUG_3D_PRINT.bandTop) + MUG_BAND_EPS;
  return { bottom, top, avg: (bottom + top) / 2 };
}

export function mugBandAspectRatio(): number {
  const wrapFraction = 1 - MUG_3D_PRINT.handleGapDeg / 360;
  const arcLength = wrapFraction * 2 * Math.PI * mugBandRadii().avg;
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
