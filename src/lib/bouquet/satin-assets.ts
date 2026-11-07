/**
 * Which satin photos are actually in `public/bouquet`.
 *
 * The catalogue does not list files. A photo is used when its name is
 * `<flower>-<color>.webp` (already transparent) or `<flower>-<color>.png`
 * (white background, cut out at draw time). Adding a colour is dropping
 * the file in and refreshing.
 */

import fs from "node:fs";
import path from "node:path";
import { FLOWER_TYPES } from "./flowers";
import { satinKey, type BouquetArt, type SatinAsset } from "./satin";

const FLOWER_IDS = new Set<string>(FLOWER_TYPES.map((flower) => flower.id));

export function listBouquetArt(dir = path.join(process.cwd(), "public", "bouquet")): BouquetArt {
  let names: string[] = [];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return { satin: {} };
  }
  const have = new Set(names);

  const satin: Record<string, SatinAsset> = {};
  for (const flower of FLOWER_TYPES) {
    for (const color of flower.colors) {
      if (color.legacy) continue;
      const webp = `${flower.id}-${color.id}.webp`;
      const png = `${flower.id}-${color.id}.png`;
      if (have.has(webp)) {
        satin[satinKey(flower.id, color.id)] = { src: `/bouquet/${webp}`, knockout: false };
      } else if (have.has(png)) {
        satin[satinKey(flower.id, color.id)] = { src: `/bouquet/${png}`, knockout: true };
      }
    }
  }

  // A loose scan as well, so a correctly named file is picked up even if a
  // colour id is only present on disk. Unknown flowers are ignored.
  for (const name of names) {
    const match = /^(rose|tulip|gerbera|chrysanthemum)-(red|pink|white|cyan|lilac)\.(webp|png)$/i.exec(
      name,
    );
    if (!match) continue;
    const flowerId = match[1].toLowerCase();
    const colorId = match[2].toLowerCase();
    if (!FLOWER_IDS.has(flowerId)) continue;
    const key = satinKey(flowerId, colorId);
    if (satin[key]?.src.endsWith(".webp")) continue;
    const ext = match[3].toLowerCase();
    if (ext === "webp" || !satin[key]) {
      satin[key] = { src: `/bouquet/${name}`, knockout: ext === "png" };
    }
  }

  return { satin };
}
