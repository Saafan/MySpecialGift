/**
 * Bouquet arrangement geometry — where every bloom sits, seen from above.
 *
 * Two shapes are offered. Blooms are packed so they fill the circle or the
 * heart, with an even gap and no overlaps. The preview and the size diagrams
 * both read from here.
 */

export const ROUND_SIZES = [10, 15, 20] as const;
export const HEART_SIZES = [16, 24, 32] as const;
export const BOUQUET_SIZES = [...ROUND_SIZES, ...HEART_SIZES] as const;
export type BouquetSize = (typeof BOUQUET_SIZES)[number];
export type BouquetShape = "round" | "heart";

export function isBouquetSize(value: unknown): value is BouquetSize {
  return (BOUQUET_SIZES as readonly number[]).includes(value as number);
}

export function shapeForSize(size: BouquetSize): BouquetShape {
  return (HEART_SIZES as readonly number[]).includes(size) ? "heart" : "round";
}

export function sizesForShape(shape: BouquetShape): readonly BouquetSize[] {
  return shape === "heart" ? HEART_SIZES : ROUND_SIZES;
}

/** Keep the small, medium or large tier when the shape changes. */
export function sizeForShape(shape: BouquetShape, from: BouquetSize): BouquetSize {
  const current = sizesForShape(shapeForSize(from));
  const tier = Math.max(0, current.indexOf(from));
  return sizesForShape(shape)[tier] ?? sizesForShape(shape)[0];
}

/** Drawing surface every coordinate below is expressed in. Square, because the view is from above. */
export const CANVAS = { width: 640, height: 640 } as const;

const CENTER = { x: 320, y: 318 } as const;
/** Outermost bloom centre, before the paper collar. */
const CLUSTER = 176;

export interface BloomPlacement {
  /** Index into `BouquetConfig.stems`, top to bottom then left to right. */
  index: number;
  x: number;
  y: number;
  row: number;
  column: number;
  /** Half the bloom's drawn width. */
  radius: number;
  rotation: number;
  scale: number;
}

export interface BouquetGeometry {
  shape: BouquetShape;
  radius: number;
  blooms: BloomPlacement[];
  center: { x: number; y: number };
  /** Distance from the centre to the outermost bloom centre. */
  clusterHalfWidth: number;
}

interface LocalPoint {
  x: number;
  y: number;
}

const geometryCache = new Map<number, BouquetGeometry>();

export function bouquetGeometry(count: number): BouquetGeometry {
  const cached = geometryCache.get(count);
  if (cached) return cached;

  const shape: BouquetShape = isBouquetSize(count) && shapeForSize(count) === "heart" ? "heart" : "round";
  const local = pack(count, shape);
  const maxReach = Math.max(...local.map((point) => Math.hypot(point.x, point.y)), 0.001);
  const placed = local.map((point) => ({
    x: CENTER.x + (point.x / maxReach) * CLUSTER,
    y: CENTER.y + (point.y / maxReach) * CLUSTER,
  }));

  const radius = bloomRadius(placed);
  const ordered = placed
    .map((point, order) => ({ ...point, order }))
    .sort((a, b) => a.y - b.y || a.x - b.x);

  const blooms: BloomPlacement[] = ordered.map((point, index) => ({
    index,
    x: point.x,
    y: point.y,
    row: 0,
    column: point.order,
    radius,
    rotation: wobbleAt(index, 2) * 6,
    scale: 1,
  }));

  const clusterHalfWidth = Math.max(
    ...blooms.map((bloom) => Math.hypot(bloom.x - CENTER.x, bloom.y - CENTER.y)),
  );
  const geometry = { shape, radius, blooms, center: { ...CENTER }, clusterHalfWidth };
  geometryCache.set(count, geometry);
  return geometry;
}

/**
 * Outline of the arrangement, scaled so its farthest point sits `radius` px
 * from the centre. Round and heart share the same sampler so the paper collar
 * and the blooms use one shape.
 */
export function outlinePoints(
  shape: BouquetShape,
  cx: number,
  cy: number,
  radius: number,
): LocalPoint[] {
  const source = shape === "heart" ? HEART_NORMAL : circlePoints(64);
  const maxReach = Math.max(...source.map((point) => Math.hypot(point.x, point.y)), 0.001);
  return source.map((point) => ({
    x: cx + (point.x / maxReach) * radius,
    y: cy + (point.y / maxReach) * radius,
  }));
}

function circlePoints(samples: number): LocalPoint[] {
  return Array.from({ length: samples }, (_, index) => {
    const angle = -Math.PI / 2 + (index / samples) * Math.PI * 2;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  });
}

/** Even packing inside the shape: a spiral start, then each bloom settles into the middle of its share of the area. */
function pack(count: number, shape: BouquetShape): LocalPoint[] {
  const inside =
    shape === "heart"
      ? (point: LocalPoint) => pointInPolygon(point.x / 0.9, point.y / 0.9, HEART_NORMAL)
      : (point: LocalPoint) => point.x * point.x + point.y * point.y <= 0.9 * 0.9;
  const samples = shape === "heart" ? HEART_SAMPLES : CIRCLE_SAMPLES;
  const area = samples.length * 0.05 * 0.05;
  const minDist = Math.sqrt(area / count) * 0.82;
  return separate(relax(seed(count, inside), samples, inside), minDist, inside);
}

function seed(count: number, inside: (point: LocalPoint) => boolean): LocalPoint[] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, index) => {
    const radius = Math.sqrt((index + 0.5) / count);
    const angle = index * golden;
    return project({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }, inside);
  });
}

function relax(
  points: LocalPoint[],
  samples: LocalPoint[],
  inside: (point: LocalPoint) => boolean,
): LocalPoint[] {
  let current = points.map((point) => ({ ...point }));
  for (let iteration = 0; iteration < 22; iteration += 1) {
    const sum = current.map(() => ({ x: 0, y: 0, n: 0 }));
    for (const sample of samples) {
      let best = 0;
      let bestDistance = Infinity;
      for (let index = 0; index < current.length; index += 1) {
        const dx = sample.x - current[index].x;
        const dy = sample.y - current[index].y;
        const distance = dx * dx + dy * dy;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = index;
        }
      }
      sum[best].x += sample.x;
      sum[best].y += sample.y;
      sum[best].n += 1;
    }
    current = current.map((point, index) => {
      if (sum[index].n === 0) return point;
      return project({ x: sum[index].x / sum[index].n, y: sum[index].y / sum[index].n }, inside);
    });
  }
  return current;
}

function separate(
  points: LocalPoint[],
  minDist: number,
  inside: (point: LocalPoint) => boolean,
): LocalPoint[] {
  const next = points.map((point) => ({ ...point }));
  for (let pass = 0; pass < 10; pass += 1) {
    for (let i = 0; i < next.length; i += 1) {
      for (let j = i + 1; j < next.length; j += 1) {
        const dx = next[j].x - next[i].x;
        const dy = next[j].y - next[i].y;
        const distance = Math.hypot(dx, dy) || 0.0001;
        if (distance >= minDist) continue;
        const push = (minDist - distance) / 2;
        const ux = dx / distance;
        const uy = dy / distance;
        next[i] = project({ x: next[i].x - ux * push, y: next[i].y - uy * push }, inside);
        next[j] = project({ x: next[j].x + ux * push, y: next[j].y + uy * push }, inside);
      }
    }
  }
  return next;
}

function project(point: LocalPoint, inside: (point: LocalPoint) => boolean): LocalPoint {
  if (inside(point)) return point;
  let lo = 0;
  let hi = 1;
  for (let step = 0; step < 14; step += 1) {
    const mid = (lo + hi) / 2;
    if (inside({ x: point.x * mid, y: point.y * mid })) lo = mid;
    else hi = mid;
  }
  return { x: point.x * lo, y: point.y * lo };
}

function samplesWhere(contains: (x: number, y: number) => boolean): LocalPoint[] {
  const points: LocalPoint[] = [];
  for (let y = -1; y <= 1; y += 0.05) {
    for (let x = -1; x <= 1; x += 0.05) {
      if (contains(x, y)) points.push({ x, y });
    }
  }
  return points;
}

/** Classic heart, point downward, normalised into a box of half-extent 1. */
function heartOutlineRaw(samples: number): LocalPoint[] {
  const raw: LocalPoint[] = [];
  for (let index = 0; index < samples; index += 1) {
    const t = (index / samples) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    raw.push({ x, y });
  }
  const minX = Math.min(...raw.map((point) => point.x));
  const maxX = Math.max(...raw.map((point) => point.x));
  const minY = Math.min(...raw.map((point) => point.y));
  const maxY = Math.max(...raw.map((point) => point.y));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const half = Math.max(maxX - minX, maxY - minY) / 2;
  return raw.map((point) => ({ x: (point.x - cx) / half, y: (point.y - cy) / half }));
}

const HEART_NORMAL = heartOutlineRaw(140);
const CIRCLE_SAMPLES = samplesWhere((x, y) => x * x + y * y <= 0.9 * 0.9);
const HEART_SAMPLES = samplesWhere((x, y) => pointInPolygon(x / 0.9, y / 0.9, HEART_NORMAL));

function pointInPolygon(x: number, y: number, polygon: LocalPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const yi = polygon[i].y;
    const yj = polygon[j].y;
    const intersect =
      yi > y !== yj > y &&
      x < ((polygon[j].x - polygon[i].x) * (y - yi)) / (yj - yi || 1e-9) + polygon[i].x;
    if (intersect) inside = !inside;
  }
  return inside;
}

function bloomRadius(points: LocalPoint[]): number {
  let nearest = Infinity;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      nearest = Math.min(nearest, Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y));
    }
  }
  // Petals stay just apart: a little over half the centre-to-centre distance is flower.
  return Math.min(52, nearest * 0.47);
}

function wobbleAt(index: number, channel: number): number {
  const x = Math.sin((index + 1) * 127.1 + channel * 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}
