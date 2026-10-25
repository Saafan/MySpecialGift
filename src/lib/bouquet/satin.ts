/** One satin photo the page can paint with. */
export interface SatinAsset {
  src: string;
  /**
   * The file still has its white studio backdrop. The browser cuts that out
   * before drawing. Optimised `.webp` files are already transparent.
   */
  knockout: boolean;
}

export interface BouquetArt {
  /** Keyed by `${flowerId}:${colorId}`. */
  satin: Record<string, SatinAsset>;
}

export const EMPTY_BOUQUET_ART: BouquetArt = { satin: {} };

export function satinKey(flowerId: string, colorId: string): string {
  return `${flowerId}:${colorId}`;
}
