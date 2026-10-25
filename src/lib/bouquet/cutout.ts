/**
 * Turn a plain white studio backdrop transparent.
 *
 * Only backdrop pixels that touch the edge of the frame are cleared, so a
 * white petal enclosed by the bloom stays. Near-white but warm pixels (the
 * white satin is around #f7f3ea) are not backdrop: the backdrop is neutral.
 */

export interface PixelBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function isBackdrop(r: number, g: number, b: number, a: number): boolean {
  if (a < 16) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return min >= 246 && max - min <= 8;
}

export function knockOutWhite(pixels: Uint8ClampedArray, width: number, height: number): void {
  if (width === 0 || height === 0) return;
  const seen = new Uint8Array(width * height);
  const stack: number[] = [];

  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = y * width + x;
    if (seen[index]) return;
    const offset = index * 4;
    if (!isBackdrop(pixels[offset], pixels[offset + 1], pixels[offset + 2], pixels[offset + 3])) return;
    seen[index] = 1;
    stack.push(index);
  };

  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }

  while (stack.length > 0) {
    const index = stack.pop() as number;
    const offset = index * 4;
    pixels[offset + 3] = 0;
    const x = index % width;
    const y = (index - x) / width;
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }

  // One-pixel light fringe left where the backdrop met the bloom.
  const alpha = new Uint8Array(width * height);
  for (let index = 0; index < width * height; index += 1) alpha[index] = pixels[index * 4 + 3];
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      if (alpha[index] === 0) continue;
      const touchesClear =
        alpha[index - 1] === 0 ||
        alpha[index + 1] === 0 ||
        alpha[index - width] === 0 ||
        alpha[index + width] === 0;
      if (!touchesClear) continue;
      const offset = index * 4;
      const max = Math.max(pixels[offset], pixels[offset + 1], pixels[offset + 2]);
      const min = Math.min(pixels[offset], pixels[offset + 1], pixels[offset + 2]);
      // Neutral light gray only. Warm white satin (around #f7f3ea) stays.
      if (min >= 236 && max - min <= 4) pixels[offset + 3] = 0;
    }
  }
}

/** Bounding box of pixels that are still visible, or null when the frame is empty. */
export function opaqueBounds(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): PixelBounds | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] < 8) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}
