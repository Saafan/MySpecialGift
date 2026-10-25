import { describe, expect, it } from "vitest";
import { knockOutWhite, opaqueBounds } from "./cutout";

function frame(width: number, height: number, paint: (x: number, y: number) => [number, number, number, number]) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = paint(x, y);
      const offset = (y * width + x) * 4;
      pixels[offset] = r;
      pixels[offset + 1] = g;
      pixels[offset + 2] = b;
      pixels[offset + 3] = a;
    }
  }
  return pixels;
}

function alphaAt(pixels: Uint8ClampedArray, width: number, x: number, y: number): number {
  return pixels[(y * width + x) * 4 + 3];
}

describe("white backdrop removal", () => {
  it("clears white connected to the edge and keeps a warm satin petal", () => {
    const width = 7;
    const height = 7;
    const pixels = frame(width, height, (x, y) => {
      if (x === 3 && y === 3) return [247, 243, 234, 255];
      return [255, 255, 255, 255];
    });

    knockOutWhite(pixels, width, height);

    expect(alphaAt(pixels, width, 0, 0)).toBe(0);
    expect(alphaAt(pixels, width, 3, 3)).toBe(255);
    expect(opaqueBounds(pixels, width, height)).toEqual({ x: 3, y: 3, width: 1, height: 1 });
  });

  it("keeps white that is enclosed by the bloom", () => {
    const width = 7;
    const height = 7;
    const pixels = frame(width, height, (x, y) => {
      const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      if (edge) return [255, 255, 255, 255];
      const ring = x === 1 || y === 1 || x === width - 2 || y === height - 2;
      if (ring) return [180, 40, 70, 255];
      return [255, 255, 255, 255];
    });

    knockOutWhite(pixels, width, height);

    expect(alphaAt(pixels, width, 0, 0)).toBe(0);
    expect(alphaAt(pixels, width, 3, 3)).toBe(255);
    expect(alphaAt(pixels, width, 1, 1)).toBe(255);
  });
});
