import { describe, expect, it } from "vitest";
import {
  BOUQUET_SIZES,
  CANVAS,
  HEART_SIZES,
  ROUND_SIZES,
  bouquetGeometry,
  shapeForSize,
  sizeForShape,
} from "./layout";

describe("offered arrangements", () => {
  it("offers a round and a heart, and nothing else", () => {
    expect(ROUND_SIZES).toEqual([10, 15, 20]);
    expect(HEART_SIZES).toEqual([16, 24, 32]);
    expect(BOUQUET_SIZES).toEqual([10, 15, 20, 16, 24, 32]);
  });

  it("keeps the size tier when the shape changes", () => {
    expect(sizeForShape("heart", 10)).toBe(16);
    expect(sizeForShape("heart", 15)).toBe(24);
    expect(sizeForShape("heart", 20)).toBe(32);
    expect(sizeForShape("round", 16)).toBe(10);
    expect(sizeForShape("round", 24)).toBe(15);
    expect(sizeForShape("round", 32)).toBe(20);
  });
});

describe("bouquet geometry", () => {
  it("places every stem inside the frame with a gap between blooms", () => {
    for (const size of BOUQUET_SIZES) {
      const geometry = bouquetGeometry(size);
      expect(geometry.shape).toBe(shapeForSize(size));
      expect(geometry.blooms).toHaveLength(size);
      let nearest = Infinity;
      for (let i = 0; i < geometry.blooms.length; i += 1) {
        for (let j = i + 1; j < geometry.blooms.length; j += 1) {
          const dx = geometry.blooms[i].x - geometry.blooms[j].x;
          const dy = geometry.blooms[i].y - geometry.blooms[j].y;
          nearest = Math.min(nearest, Math.hypot(dx, dy));
        }
      }
      // Petals stay apart, and the gap is not so wide that the bouquet looks empty.
      expect(nearest).toBeGreaterThan(geometry.radius * 2);
      expect(nearest).toBeLessThan(geometry.radius * 2 * 2.4);
      for (const bloom of geometry.blooms) {
        expect(bloom.x - bloom.radius).toBeGreaterThan(8);
        expect(bloom.x + bloom.radius).toBeLessThan(CANVAS.width - 8);
        expect(bloom.y - bloom.radius).toBeGreaterThan(8);
        expect(bloom.y + bloom.radius).toBeLessThan(CANVAS.height - 8);
      }
    }
  });

  it("draws a round cluster as a disk and a heart as a taller shape", () => {
    for (const size of ROUND_SIZES) {
      const { blooms } = bouquetGeometry(size);
      const width = span(blooms, "x");
      const height = span(blooms, "y");
      expect(Math.abs(width - height)).toBeLessThan(width * 0.35);
    }
    for (const size of HEART_SIZES) {
      const { blooms } = bouquetGeometry(size);
      const ys = blooms.map((bloom) => bloom.y);
      const minY = Math.min(...ys);
      const height = Math.max(...ys) - minY;
      const widthOf = (band: typeof blooms) => span(band, "x");
      const middle = blooms.filter((bloom) => bloom.y > minY + height * 0.3 && bloom.y < minY + height * 0.7);
      const bottom = blooms.filter((bloom) => bloom.y > minY + height * 0.78);
      expect(middle.length).toBeGreaterThan(0);
      expect(bottom.length).toBeGreaterThan(0);
      expect(widthOf(middle)).toBeGreaterThan(widthOf(bottom) * 1.4);
    }
  });

  it("shrinks blooms as the arrangement gets denser", () => {
    expect(bouquetGeometry(10).radius).toBeGreaterThan(bouquetGeometry(20).radius);
    expect(bouquetGeometry(16).radius).toBeGreaterThan(bouquetGeometry(32).radius);
  });

  it("is deterministic", () => {
    expect(bouquetGeometry(15).blooms).toEqual(bouquetGeometry(15).blooms);
    expect(bouquetGeometry(24).blooms).toEqual(bouquetGeometry(24).blooms);
  });
});

function span(blooms: { x: number; y: number }[], axis: "x" | "y"): number {
  const values = blooms.map((bloom) => bloom[axis]);
  return Math.max(...values) - Math.min(...values);
}
