import type { ProductCategory } from "@/lib/geometry";
import { buildGlassMug, buildMug, buildThermalBottle } from "./drinkware";
import {
  buildBadge,
  buildCanvas,
  buildChocolateBox,
  buildCoaster,
  buildNfcCard,
  buildPhoneCase,
  buildPuzzle,
  buildSticker,
} from "./flat-goods";
import { buildPillow, buildTShirt, buildToteBag } from "./textiles";
import type { ModelContext, ProductModel } from "./kit";

export { buildContactShadows } from "./kit";
export type { ContactShadow, ModelContext, ProductModel, QualityTier } from "./kit";

export const GLASS_MUG_SLUG = "round-glass-mug";

export function buildProductModel(
  ctx: ModelContext,
  category: ProductCategory,
  productSlug?: string,
): ProductModel {
  switch (category) {
    case "cup":
      if (productSlug === GLASS_MUG_SLUG) return buildGlassMug(ctx);
      return buildMug(ctx);
    case "bottle":
      return buildThermalBottle(ctx);
    case "t-shirt":
      return buildTShirt(ctx);
    case "bag":
      return buildToteBag(ctx);
    case "pillow":
      return buildPillow(ctx);
    case "canvas":
      return buildCanvas(ctx);
    case "coaster":
      return buildCoaster(ctx);
    case "chocolate":
      return buildChocolateBox(ctx);
    case "phone":
      return buildPhoneCase(ctx);
    case "puzzle":
      return buildPuzzle(ctx);
    case "nfc":
      return buildNfcCard(ctx);
    case "sticker":
      return buildSticker(ctx);
    case "badge":
      return buildBadge(ctx);
  }
}

export interface PrintCapture {
  format: "png" | "jpeg";
  /**
   * Treat the artboard's default white fill as "no ink": glass, a coloured
   * bottle, a tee and a tote show their own surface around the artwork, the
   * way these products are actually printed.
   */
  clearBackground: boolean;
}

export function printCaptureFor(category: ProductCategory, productSlug?: string): PrintCapture {
  if (category === "sticker" || category === "badge") return { format: "png", clearBackground: false };
  if (
    category === "bottle" ||
    category === "t-shirt" ||
    category === "bag" ||
    (category === "cup" && productSlug === GLASS_MUG_SLUG)
  ) {
    return { format: "png", clearBackground: true };
  }
  // JPEG for opaque prints: no PNG fringe to read as a hairline on the surface.
  return { format: "jpeg", clearBackground: false };
}
