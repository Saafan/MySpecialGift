/**
 * The bouquet a customer is building, plus the codec that survives a page
 * reload or a link sent to a friend.
 *
 * Nothing about a bouquet is stored server-side yet, so the share link *is*
 * the record: it goes into the WhatsApp order message, which means the shop
 * can reopen the exact arrangement that was ordered.
 */

import { FLOWER_TYPES, findFlower, findFlowerColor, type FlowerId } from "./flowers";
import { DEFAULT_PAPER_ID, PAPER_STOCKS, findPaper } from "./papers";
import { isBouquetSize, shapeForSize, type BouquetSize } from "./layout";

export interface Stem {
  flowerId: FlowerId;
  colorId: string;
}

export interface BouquetConfig {
  size: BouquetSize;
  paperId: string;
  /** Exactly `size` entries, ordered top-left to bottom of the arrangement. */
  stems: Stem[];
}

const RED_ROSE: Stem = { flowerId: "rose", colorId: "red" };

/** House arrangement: every stem a red rose. */
export function arrangementFor(size: BouquetSize): Stem[] {
  return Array.from({ length: size }, () => ({ ...RED_ROSE }));
}

function isHouseArrangement(stems: Stem[]): boolean {
  return stems.every((stem) => stem.flowerId === "rose" && stem.colorId === "red");
}

export const DEFAULT_SIZE: BouquetSize = 10;

export function defaultBouquet(): BouquetConfig {
  return {
    size: DEFAULT_SIZE,
    paperId: DEFAULT_PAPER_ID,
    stems: arrangementFor(DEFAULT_SIZE),
  };
}

/**
 * Change the arrangement size. An untouched red-rose bouquet stays all red
 * roses. A hand-painted one keeps its stems and fills extra places with red roses.
 */
export function resizeBouquet(config: BouquetConfig, size: BouquetSize): BouquetConfig {
  if (size === config.size) return config;
  if (isHouseArrangement(config.stems)) {
    return { ...config, size, stems: arrangementFor(size) };
  }
  const stems = config.stems.slice(0, size).map((stem) => ({ ...stem }));
  while (stems.length < size) stems.push({ ...RED_ROSE });
  return { ...config, size, stems };
}

/** Coerce anything — a decoded link, a stale draft — into a drawable bouquet. */
export function normaliseBouquet(config: BouquetConfig): BouquetConfig {
  const size = isBouquetSize(config.size) ? config.size : DEFAULT_SIZE;
  const house = arrangementFor(size);
  const stems = Array.from({ length: size }, (_, index) => {
    const candidate = config.stems[index] ?? house[index];
    const flower = findFlower(candidate.flowerId);
    return { flowerId: flower.id, colorId: findFlowerColor(flower, candidate.colorId).id };
  });
  return { size, paperId: findPaper(config.paperId).id, stems };
}

/* ------------------------------------------------------------------ */
/* Share codec                                                          */
/* ------------------------------------------------------------------ */

/**
 * `<size>-<paper>-<stems>`, two characters per stem: the flower's stable code
 * letter and its colour index. Kept short enough to paste into a chat, and
 * readable enough to debug: `10-kraft-p0r0d0r2s0d0p2r0t0d1`.
 */
export const SHARE_PARAM = "b";

export function encodeBouquet(config: BouquetConfig): string {
  const stems = config.stems
    .map((stem) => {
      const flower = findFlower(stem.flowerId);
      const colorIndex = flower.colors.findIndex((color) => color.id === stem.colorId);
      return `${flower.code}${Math.max(0, colorIndex)}`;
    })
    .join("");
  return `${config.size}-${findPaper(config.paperId).id}-${stems}`;
}

export function decodeBouquet(value: string | null | undefined): BouquetConfig | null {
  if (!value) return null;

  const [rawSize, rawPaper, rawStems = ""] = value.split("-");
  const size = Number(rawSize);
  if (!isBouquetSize(size)) return null;
  if (!PAPER_STOCKS.some((paper) => paper.id === rawPaper)) return null;
  if (rawStems.length !== size * 2) return null;

  const stems: Stem[] = [];
  for (let i = 0; i < rawStems.length; i += 2) {
    const flower = FLOWER_TYPES.find((candidate) => candidate.code === rawStems[i]);
    const colorIndex = Number(rawStems[i + 1]);
    if (!flower || !Number.isInteger(colorIndex) || !flower.colors[colorIndex]) return null;
    stems.push({ flowerId: flower.id, colorId: flower.colors[colorIndex].id });
  }

  return { size, paperId: rawPaper, stems };
}

/* ------------------------------------------------------------------ */
/* Human-readable summary                                               */
/* ------------------------------------------------------------------ */

export interface BloomTally {
  flowerId: FlowerId;
  colorId: string;
  label: string;
  hex: string;
  quantity: number;
}

/** Stems grouped by flower *and* colour, in catalogue order. */
export function tallyBlooms(config: BouquetConfig): BloomTally[] {
  const tallies: BloomTally[] = [];
  for (const flower of FLOWER_TYPES) {
    for (const color of flower.colors) {
      const quantity = config.stems.filter(
        (stem) => stem.flowerId === flower.id && stem.colorId === color.id,
      ).length;
      if (quantity === 0) continue;
      tallies.push({
        flowerId: flower.id,
        colorId: color.id,
        label: `${color.name} ${flower.name.toLowerCase()}`,
        hex: color.hex,
        quantity,
      });
    }
  }
  return tallies;
}

/** One-line description used in the order message. */
export function describeBouquet(config: BouquetConfig): string {
  const blooms = tallyBlooms(config)
    .map((tally) => `${tally.quantity} × ${tally.label}`)
    .join(", ");
  const shape = shapeForSize(config.size);
  return `${config.size}-stem ${shape} bouquet in ${findPaper(config.paperId).name.toLowerCase()} paper — ${blooms}`;
}
