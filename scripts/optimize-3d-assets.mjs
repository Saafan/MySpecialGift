/**
 * One-off: compress V1's 3D scene textures for V2.
 * V1 shipped 5.3 MB of JPEG textures eagerly on every editor mount to fill a
 * 144px thumbnail (wood-table.jpg alone was 3.4 MB). WebP at capped dimensions
 * keeps the visual quality at a fraction of the bytes.
 *
 * Usage: node scripts/optimize-3d-assets.mjs
 */
import sharp from "sharp";
import { mkdir } from "fs/promises";

const SOURCE = "D:/Tools/MyLovelyGift/apps/web/public/3d";
const DEST = "public/3d";

await mkdir(DEST, { recursive: true });

const jobs = [
  // Full-screen backdrop layer — soft-focus photo, tolerant of compression.
  { src: `${SOURCE}/studio-bg.jpg`, dest: `${DEST}/studio-bg.webp`, width: 1600, quality: 72 },
  // Table-top photo — mapped once across the round top, not repeated.
  { src: `${SOURCE}/wood-table.jpg`, dest: `${DEST}/wood-table.webp`, width: 1024, quality: 74 },
];

for (const job of jobs) {
  const output = await sharp(job.src)
    .resize({ width: job.width, withoutEnlargement: true })
    .webp({ quality: job.quality })
    .toFile(job.dest);
  console.log(`${job.dest}: ${(output.size / 1024).toFixed(0)} KB`);
}
