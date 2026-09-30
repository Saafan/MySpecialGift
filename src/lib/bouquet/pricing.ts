/**
 * Bouquet pricing — the only place a bouquet's cost is worked out.
 *
 * The customizer renders what this returns so the number moves as the customer
 * builds. It is deliberately a pure, shared module rather than client-side
 * arithmetic: when bouquets get a checkout path, the server re-quotes from here
 * and the client's total stays a display value, never an input (see
 * `Docs/invariants.md` — money is integer piastres and never client-supplied).
 */

import type { BouquetConfig } from "./config";
import { FLOWER_TYPES, findFlower } from "./flowers";
import type { BouquetSize } from "./layout";

/** Wrap and hand-tying, by arrangement size. Same rate the old sizes used: 60 EGP plus 12 EGP a stem. */
export const WRAP_CENTS: Record<BouquetSize, number> = {
  10: 18_000,
  15: 24_000,
  20: 30_000,
  16: 25_200,
  24: 34_800,
  32: 44_400,
};

export interface QuoteLine {
  label: string;
  quantity: number;
  unitCents: number;
  totalCents: number;
}

export interface BouquetQuote {
  wrapCents: number;
  bloomsCents: number;
  totalCents: number;
  lines: QuoteLine[];
}

export function quoteBouquet(config: BouquetConfig): BouquetQuote {
  const counts = new Map<string, number>();
  for (const stem of config.stems) {
    counts.set(stem.flowerId, (counts.get(stem.flowerId) ?? 0) + 1);
  }

  // Iterate the catalogue, not the map, so the summary order never jumps
  // around as stems are repainted.
  const lines: QuoteLine[] = [];
  for (const flower of FLOWER_TYPES) {
    const quantity = counts.get(flower.id) ?? 0;
    if (quantity === 0) continue;
    lines.push({
      label: `${flower.name} stems`,
      quantity,
      unitCents: flower.priceCents,
      totalCents: flower.priceCents * quantity,
    });
  }

  const bloomsCents = lines.reduce((sum, line) => sum + line.totalCents, 0);
  const wrapCents = WRAP_CENTS[config.size];

  return {
    wrapCents,
    bloomsCents,
    totalCents: bloomsCents + wrapCents,
    lines,
  };
}

/** Cheapest a given size can be — powers the "from …" hint in the size picker. */
export function startingPriceCents(size: BouquetSize): number {
  const cheapest = Math.min(...FLOWER_TYPES.map((flower) => flower.priceCents));
  return WRAP_CENTS[size] + cheapest * size;
}

export function stemPriceCents(flowerId: string): number {
  return findFlower(flowerId).priceCents;
}
