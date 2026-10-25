import type { FlowerId } from "./flowers";

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
  /** Natural-flower portraits still on disk, keyed by flower id. */
  legacy: Partial<Record<FlowerId, string>>;
}

export const EMPTY_BOUQUET_ART: BouquetArt = { satin: {}, legacy: {} };

export function satinKey(flowerId: string, colorId: string): string {
  return `${flowerId}:${colorId}`;
}
