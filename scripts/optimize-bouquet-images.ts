/**
 * Resize satin flower photos for the bouquet builder and knock out the white
 * studio backdrop.
 *
 * Drop `public/bouquet/<flower>-<color>.png` (rose-red.png, tulip-lilac.png, …)
 * and run:
 *
 *   npx tsx scripts/optimize-bouquet-images.ts
 *
 * Each photo becomes an 800px transparent WebP. The source PNG is removed
 * after that succeeds, so the page serves the WebP. Once every flower has
 * all five colours, the old natural-flower portraits are removed too.
 */
import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { knockOutWhite, opaqueBounds } from "../src/lib/bouquet/cutout";

const DIR = path.join(process.cwd(), "public", "bouquet");
const FLOWERS = ["rose", "tulip", "gerbera", "chrysanthemum", "sunflower"] as const;
const COLORS = ["red", "pink", "white", "cyan", "lilac"] as const;
const LEGACY = ["rose.png", "tulip.png", "gerbera.png", "gerbera-pink.png", "chrysanthemum.png", "sunflower.png"];
const SOURCE = /^(rose|tulip|gerbera|chrysanthemum|sunflower)-(red|pink|white|cyan|lilac)\.png$/i;

const MAX_EDGE = 800;
const PAD = 0.04;

async function optimize(file: string): Promise<void> {
  const match = SOURCE.exec(file);
  if (!match) return;
  const destName = `${match[1].toLowerCase()}-${match[2].toLowerCase()}.webp`;
  const src = path.join(DIR, file);
  const resized = await sharp(src)
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8ClampedArray(
    resized.data.buffer,
    resized.data.byteOffset,
    resized.data.byteLength,
  );
  const { width, height } = resized.info;
  knockOutWhite(pixels, width, height);
  const bounds = opaqueBounds(pixels, width, height);
  if (!bounds) throw new Error(`${file} has no flower pixels after removing the white background`);

  const side = Math.max(bounds.width, bounds.height);
  const pad = Math.max(1, Math.round(side * PAD));
  const left = Math.round(pad + (side - bounds.width) / 2);
  const top = Math.round(pad + (side - bounds.height) / 2);
  const square = side + pad * 2;

  const dest = path.join(DIR, destName);
  // sharp runs resize before extend when they share a pipeline, which would
  // leave the padding outside the 800px box. Trim first, then scale.
  const trimmed = await sharp(Buffer.from(pixels.buffer, pixels.byteOffset, pixels.byteLength), {
    raw: { width, height, channels: 4 },
  })
    .extract({ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height })
    .extend({
      left,
      top,
      right: square - left - bounds.width,
      bottom: square - top - bounds.height,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp(trimmed)
    .resize(MAX_EDGE, MAX_EDGE, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 82, alphaQuality: 95 })
    .toFile(dest);

  if (path.resolve(src) !== path.resolve(dest)) await rm(src);
  const stat = await sharp(dest).metadata();
  console.log(`${destName}: ${stat.width}×${stat.height}`);
}

async function main(): Promise<void> {
  const names = await readdir(DIR);
  const sources = names.filter((name) => SOURCE.test(name));
  for (const file of sources) await optimize(file);
  if (sources.length === 0) console.log("No <flower>-<color>.png files to optimise.");

  const after = new Set(await readdir(DIR));
  const complete = FLOWERS.every((flower) => COLORS.every((color) => after.has(`${flower}-${color}.webp`)));
  if (!complete) return;

  for (const file of LEGACY) {
    if (!after.has(file)) continue;
    await rm(path.join(DIR, file));
    console.log(`removed legacy portrait ${file}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
