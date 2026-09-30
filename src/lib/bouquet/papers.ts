/**
 * Wrapping papers offered by the bouquet customizer.
 *
 * A stock is one sheet colour. Folds, the inner lip and the paper knot are
 * derived in `paperTones`, so the cone stays consistent for every colour.
 */

import { shade } from "./color";

export interface PaperStock {
  id: string;
  name: string;
  /** Flat sheet colour — the one the customer sees on the swatch. */
  hex: string;
  /** Satin ribbon tied at the neck. */
  ribbonHex: string;
}

export const PAPER_STOCKS: PaperStock[] = [
  { id: "kraft", name: "Kraft", hex: "#bb8a55", ribbonHex: "#f3ebdf" },
  { id: "blush", name: "Blush", hex: "#efbfc3", ribbonHex: "#b5727a" },
  { id: "ivory", name: "Ivory", hex: "#f2e8d7", ribbonHex: "#c9a96a" },
  { id: "sage", name: "Sage", hex: "#aec09f", ribbonHex: "#5d7357" },
  { id: "dusk", name: "Dusk blue", hex: "#a3b8cb", ribbonHex: "#54718a" },
  { id: "lilac", name: "Lilac", hex: "#bfa8cf", ribbonHex: "#6f5680" },
  { id: "ember", name: "Ember", hex: "#d26f4a", ribbonHex: "#f3ebdf" },
  { id: "charcoal", name: "Charcoal", hex: "#3d3a38", ribbonHex: "#c9a96a" },
];

export const DEFAULT_PAPER_ID = "kraft";

export interface PaperTones {
  /** Front sleeve. */
  sheet: string;
  /** Collar fanning out behind the blooms — catches more light. */
  fan: string;
  /** Creases running down the cone. */
  fold: string;
  /** Folded-over cuff along the top edge. */
  cuff: string;
  /** Contact shadow where the sleeve meets the blooms. */
  shadow: string;
  ribbon: string;
  ribbonShadow: string;
}

export function paperTones(paper: PaperStock): PaperTones {
  return {
    sheet: paper.hex,
    fan: shade(paper.hex, 0.2),
    fold: shade(paper.hex, -0.15),
    cuff: shade(paper.hex, 0.32),
    shadow: shade(paper.hex, -0.34),
    ribbon: paper.ribbonHex,
    ribbonShadow: shade(paper.ribbonHex, -0.24),
  };
}

export function findPaper(id: string | undefined): PaperStock {
  return PAPER_STOCKS.find((paper) => paper.id === id) ?? PAPER_STOCKS[0];
}
