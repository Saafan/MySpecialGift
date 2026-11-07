import type { Scene } from "@babylonjs/core/scene";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { PolygonMeshBuilder } from "@babylonjs/core/Meshes/polygonMesh";
import { Color3, Vector2, Vector3 } from "@babylonjs/core/Maths/math";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import earcut from "earcut";

/**
 * Shared building blocks for the procedural product models.
 *
 * Every model is generated in code — no glTF downloads — and every print
 * surface carries UVs in image space: u runs left → right and v runs
 * top → bottom of the artwork as the shopper sees it. Design textures are
 * created with `invertY = false`, so (0, 0) is the image's top-left texel and
 * no per-model flips are needed (the mug band keeps its legacy flips).
 *
 * World layout: +Y is up, the table top is y = 0, and the default cameras sit
 * on the -Z side, so an upright product faces -Z and a flat one keeps the top
 * of its artwork towards +Z.
 */

export type QualityTier = "low" | "medium" | "high";

export interface ModelContext {
  scene: Scene;
  tier: QualityTier;
  /** Product colour option (thermal bottle finish), as a hex string. */
  tint?: string;
}

export interface CameraPreset {
  alpha: number;
  beta: number;
  radius: number;
  targetY: number;
}

/** A soft contact shadow painted under (part of) the product. */
export interface ContactShadow {
  shape: "ellipse" | "rect";
  width: number;
  depth: number;
  x?: number;
  z?: number;
  /** Yaw in radians. */
  rotation?: number;
  /** Corner radius for rects, world units. */
  radius?: number;
  /** 0..1 darkness of the tight contact core. */
  strength?: number;
  /** Object height: taller things throw a longer, softer penumbra. */
  height?: number;
}

export interface PrintSurface {
  material: PBRMaterial;
  meshes: AbstractMesh[];
  /** Keep the surface visible with no design loaded (pillow face, canvas). */
  alwaysVisible?: boolean;
  /** Wrap, flip and alpha settings for a freshly loaded design texture. */
  configure: (texture: Texture) => void;
}

export interface ProductModel {
  camera: CameraPreset;
  shadows: ContactShadow[];
  print: PrintSurface;
}

/* ------------------------------------------------------------------ */
/* Detail levels                                                        */
/* ------------------------------------------------------------------ */

/** Tessellation for the tier: full on high, ~60% on medium, ~40% on low. */
export function segments(ctx: ModelContext, high: number, min = 8): number {
  const factor = ctx.tier === "high" ? 1 : ctx.tier === "medium" ? 0.6 : 0.4;
  return Math.max(min, Math.round(high * factor));
}

export function textureSize(ctx: ModelContext, high: number): number {
  return ctx.tier === "high" ? high : ctx.tier === "medium" ? high / 2 : high / 4;
}

/* ------------------------------------------------------------------ */
/* Materials                                                            */
/* ------------------------------------------------------------------ */

/** sRGB hex → linear colour, which is what PBR albedo expects. */
export function linear(hex: string): Color3 {
  return Color3.FromHexString(hex).toLinearSpace();
}

export interface SurfaceOptions {
  color: Color3;
  roughness: number;
  metallic?: number;
  /** Glossy lacquer on top (glaze, hard-case gloss). Roughness of the coat. */
  clearCoat?: number;
  /** Soft fabric sheen. Colour of the sheen lobe. */
  sheen?: Color3;
}

/**
 * Metallic-roughness PBR. Clear coat and sheen are skipped on the low tier:
 * they add a second specular lobe per pixel, which is what slows weak GPUs.
 */
export function surface(ctx: ModelContext, name: string, options: SurfaceOptions): PBRMaterial {
  const mat = new PBRMaterial(name, ctx.scene);
  mat.albedoColor = options.color;
  mat.metallic = options.metallic ?? 0;
  mat.roughness = options.roughness;
  const rich = ctx.tier !== "low";
  if (rich && options.clearCoat !== undefined) {
    mat.clearCoat.isEnabled = true;
    mat.clearCoat.intensity = 1;
    mat.clearCoat.roughness = options.clearCoat;
  }
  if (rich && options.sheen) {
    mat.sheen.isEnabled = true;
    mat.sheen.color = options.sheen;
    mat.sheen.intensity = 0.6;
    mat.sheen.roughness = 0.6;
  }
  return mat;
}

/**
 * Thin clear glass. Alpha blending plus "specular over alpha" keeps
 * reflections bright where the body is see-through, and the separate culling
 * pass draws the far wall before the near one so the walls sort correctly.
 */
export function glass(ctx: ModelContext, name: string, tint = "#e8f3f2", alpha = 0.2): PBRMaterial {
  const mat = new PBRMaterial(name, ctx.scene);
  mat.albedoColor = linear(tint);
  mat.alpha = alpha;
  mat.metallic = 0;
  // Slightly soft so the key light leaves a visible streak, not a pinpoint.
  mat.roughness = 0.06;
  mat.indexOfRefraction = 1.5;
  mat.environmentIntensity = 1.8;
  mat.useRadianceOverAlpha = true;
  mat.useSpecularOverAlpha = true;
  mat.backFaceCulling = false;
  mat.twoSidedLighting = true;
  mat.separateCullingPass = true;
  return mat;
}

/** The material the artwork is shown with. */
export function printMaterial(ctx: ModelContext, options: Partial<SurfaceOptions> = {}): PBRMaterial {
  return surface(ctx, "printMat", {
    color: options.color ?? new Color3(1, 1, 1),
    roughness: options.roughness ?? 0.4,
    clearCoat: options.clearCoat,
    sheen: options.sheen,
  });
}

/** Opaque artwork, clamped so edge texels never smear around the surface. */
export function opaquePrint(texture: Texture): void {
  texture.wrapU = Texture.CLAMP_ADDRESSMODE;
  texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  texture.hasAlpha = false;
}

/** Artwork with transparent areas (die-cut stickers, prints on glass). */
export function alphaPrint(material: PBRMaterial) {
  return (texture: Texture) => {
    texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    texture.hasAlpha = true;
    material.useAlphaFromAlbedoTexture = true;
    material.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
  };
}

/* ------------------------------------------------------------------ */
/* Procedural textures                                                  */
/* ------------------------------------------------------------------ */

function canvasTexture(ctx: ModelContext, name: string, size: number, gamma: boolean) {
  const tex = new DynamicTexture(name, { width: size, height: size }, ctx.scene, true);
  tex.gammaSpace = gamma;
  const context = tex.getContext() as unknown as CanvasRenderingContext2D;
  return { tex, context };
}

/** Tangent-space normal map from a height field (values 0..1, row-major). */
export function normalMapFromHeights(
  ctx: ModelContext,
  name: string,
  heights: Float32Array,
  size: number,
  strength: number,
  wrap: boolean,
): DynamicTexture {
  const { tex, context } = canvasTexture(ctx, name, size, false);
  const image = context.createImageData(size, size);
  const at = (x: number, y: number) => {
    if (wrap) {
      x = (x + size) % size;
      y = (y + size) % size;
    } else {
      x = Math.min(size - 1, Math.max(0, x));
      y = Math.min(size - 1, Math.max(0, y));
    }
    return heights[y * size + x];
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      image.data[i] = Math.round(((-dx / len) * 0.5 + 0.5) * 255);
      image.data[i + 1] = Math.round(((dy / len) * 0.5 + 0.5) * 255);
      image.data[i + 2] = Math.round(((1 / len) * 0.5 + 0.5) * 255);
      image.data[i + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  tex.update(false);
  return tex;
}

/** Deterministic hash noise, 0..1. */
export function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Tiling plain-weave normal map: threads alternate over and under, which is
 * what makes cotton and canvas read as cloth instead of plastic.
 */
export function weaveNormal(ctx: ModelContext, name: string, threads = 8, strength = 3): DynamicTexture {
  const size = 64;
  const cell = size / threads;
  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = Math.floor(x / cell);
      const j = Math.floor(y / cell);
      const fx = (x % cell) / cell;
      const fy = (y % cell) / cell;
      const warpOnTop = (i + j) % 2 === 0;
      const across = Math.sin(Math.PI * (warpOnTop ? fx : fy));
      const along = 0.65 + 0.35 * Math.sin(Math.PI * (warpOnTop ? fy : fx));
      heights[y * size + x] = across * along * (0.85 + 0.15 * hash2(x, y));
    }
  }
  const tex = normalMapFromHeights(ctx, name, heights, size, strength, true);
  tex.anisotropicFilteringLevel = 4;
  return tex;
}

/** Laminated bamboo: warm strips with fine grain, for lids and trims. */
export function bambooTexture(ctx: ModelContext): DynamicTexture {
  const size = textureSize(ctx, 512);
  const { tex, context } = canvasTexture(ctx, "bamboo", size, true);
  const strip = size / 9;
  for (let s = 0; s < 9; s++) {
    const tone = 0.9 + hash2(s, 3) * 0.16;
    context.fillStyle = `rgb(${Math.round(196 * tone)}, ${Math.round(150 * tone)}, ${Math.round(96 * tone)})`;
    context.fillRect(s * strip, 0, strip + 1, size);
    for (let g = 0; g < 14; g++) {
      const x = s * strip + hash2(s, g) * strip;
      context.strokeStyle = `rgba(110, 72, 36, ${0.12 + hash2(g, s) * 0.18})`;
      context.lineWidth = Math.max(1, size / 512);
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x + (hash2(g, s + 9) - 0.5) * strip * 0.4, size);
      context.stroke();
    }
    context.fillStyle = "rgba(90, 58, 28, 0.35)";
    context.fillRect(s * strip, 0, Math.max(1, size / 400), size);
  }
  tex.update();
  return tex;
}

/* ------------------------------------------------------------------ */
/* Contact shadows                                                      */
/* ------------------------------------------------------------------ */

/**
 * Soft shadow painted once into a small texture and laid on the table.
 * Costs one quad and no per-frame work, unlike a shadow map, and reads
 * softer and more like a studio photo.
 */
export function buildContactShadows(scene: Scene, shadows: ContactShadow[]): Mesh[] {
  return shadows.map((spec, index) => {
    const height = spec.height ?? 0.3;
    // The key light shines towards +X/+Z, so the penumbra drifts that way.
    const drift = Math.min(0.6, height * 0.16);
    const margin = Math.max(spec.width, spec.depth) * 0.2 + 0.7 + drift;
    const planeW = spec.width + margin * 2;
    const planeD = spec.depth + margin * 2;
    const px = 256;
    const tex = new DynamicTexture(`contactShadowTex${index}`, { width: px, height: px }, scene, true);
    tex.hasAlpha = true;
    const c = tex.getContext() as unknown as CanvasRenderingContext2D;
    c.clearRect(0, 0, px, px);
    const sx = px / planeW;
    const sy = px / planeD;
    // Canvas +x is world +X and canvas +y is world +Z (the texture uploads
    // flipped onto a quad whose v runs from +Z to -Z).
    const shape = (grow: number, dx: number, dz: number) => {
      const w = (spec.width + grow) * sx;
      const h = (spec.depth + grow) * sy;
      const cx = px / 2 + dx * sx;
      const cy = px / 2 + dz * sy;
      c.beginPath();
      if (spec.shape === "ellipse") {
        c.ellipse(cx, cy, Math.max(1, w / 2), Math.max(1, h / 2), 0, 0, Math.PI * 2);
      } else {
        const r = Math.min((spec.radius ?? 0.05) * sx + (grow * sx) / 2, w / 2, h / 2);
        c.roundRect(cx - w / 2, cy - h / 2, Math.max(1, w), Math.max(1, h), Math.max(0, r));
      }
    };
    // Shadow-only drawing: the shape itself is pushed off canvas and only its
    // blurred shadow lands. Canvas `filter` would be simpler but Safari lacks it.
    const pass = (blurWorld: number, alpha: number, grow: number, dx = 0, dz = 0) => {
      c.save();
      c.shadowColor = `rgba(18, 12, 6, ${alpha})`;
      c.shadowBlur = blurWorld * sx;
      c.shadowOffsetX = px * 2;
      c.translate(-px * 2, 0);
      shape(grow, dx, dz);
      c.fill();
      c.restore();
    };
    const strength = spec.strength ?? 0.55;
    // Broad penumbra, then ambient occlusion hugging the footprint.
    pass(0.45 + height * 0.12, 0.45, 0.3 + height * 0.05, drift * 0.67, drift * 0.74);
    pass(0.16, 0.5 * strength, 0.18);
    pass(0.06, strength, 0.07);
    tex.update();

    const mat = new StandardMaterial(`contactShadowMat${index}`, scene);
    mat.disableLighting = true;
    mat.diffuseColor = new Color3(0, 0, 0);
    mat.specularColor = new Color3(0, 0, 0);
    mat.emissiveColor = new Color3(0, 0, 0);
    mat.opacityTexture = tex;
    mat.backFaceCulling = false;

    const plane = new Mesh(`contactShadow${index}`, scene);
    const hw = planeW / 2;
    const hd = planeD / 2;
    const data = new VertexData();
    data.positions = [-hw, 0, -hd, hw, 0, -hd, hw, 0, hd, -hw, 0, hd];
    data.indices = [0, 1, 2, 0, 2, 3];
    data.normals = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
    data.uvs = [0, 1, 1, 1, 1, 0, 0, 0];
    data.applyToMesh(plane);
    plane.position.set(spec.x ?? 0, 0.004 + index * 0.001, spec.z ?? 0);
    plane.rotation.y = spec.rotation ?? 0;
    plane.material = mat;
    plane.isPickable = false;
    // Lies on the table under everything else that blends.
    plane.alphaIndex = -1;
    return plane;
  });
}

/* ------------------------------------------------------------------ */
/* Mesh helpers                                                         */
/* ------------------------------------------------------------------ */

/**
 * Mesh from raw buffers. If the normals mostly point against `outward`, the
 * winding is flipped so front faces (and lighting) face out.
 */
export function meshFrom(
  name: string,
  scene: Scene,
  positions: number[],
  indices: number[],
  uvs: number[] | null,
  outward: (x: number, y: number, z: number, vertex: number) => [number, number, number],
): Mesh {
  let normals: number[] = [];
  VertexData.ComputeNormals(positions, indices, normals);
  let dot = 0;
  for (let i = 0; i < positions.length; i += 3) {
    const [ox, oy, oz] = outward(positions[i], positions[i + 1], positions[i + 2], i / 3);
    dot += normals[i] * ox + normals[i + 1] * oy + normals[i + 2] * oz;
  }
  if (dot < 0) {
    for (let i = 0; i < indices.length; i += 3) {
      const t = indices[i + 1];
      indices[i + 1] = indices[i + 2];
      indices[i + 2] = t;
    }
    normals = [];
    VertexData.ComputeNormals(positions, indices, normals);
  }
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.normals = normals;
  if (uvs) data.uvs = uvs;
  const mesh = new Mesh(name, scene);
  data.applyToMesh(mesh);
  return mesh;
}

/** Grid indices for (cols + 1) × (rows + 1) vertices laid out row by row. */
export function gridIndices(cols: number, rows: number): number[] {
  const indices: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c;
      const b = a + 1;
      const d = a + cols + 1;
      const e = d + 1;
      indices.push(a, d, b, b, d, e);
    }
  }
  return indices;
}

/** Closed rounded-rectangle outline, counter-clockwise, centred on 0. */
export function roundedRect(w: number, h: number, r: number, cornerSteps: number): Vector2[] {
  const pts: Vector2[] = [];
  const corners: [number, number, number][] = [
    [w / 2 - r, h / 2 - r, 0],
    [-(w / 2 - r), h / 2 - r, Math.PI / 2],
    [-(w / 2 - r), -(h / 2 - r), Math.PI],
    [w / 2 - r, -(h / 2 - r), (3 * Math.PI) / 2],
  ];
  for (const [cx, cy, start] of corners) {
    for (let i = 0; i <= cornerSteps; i++) {
      const a = start + (i / cornerSteps) * (Math.PI / 2);
      pts.push(new Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a)));
    }
  }
  return pts;
}

/**
 * Horizontal slab from an outline in the XZ plane (Vector2.y → world z),
 * top face at `top`. UVs are rewritten in image space over `uvBounds`
 * (defaults to the outline's own bounds), so the top shows artwork upright.
 */
export function slab(
  name: string,
  scene: Scene,
  outline: Vector2[],
  options: {
    top: number;
    depth: number;
    holes?: Vector2[][];
    uvBounds?: { minX: number; maxX: number; minZ: number; maxZ: number };
  },
): Mesh {
  const builder = new PolygonMeshBuilder(name, outline, scene, earcut);
  for (const hole of options.holes ?? []) builder.addHole(hole);
  const mesh = builder.build(false, options.depth);
  mesh.position.y = options.top;
  const bounds =
    options.uvBounds ??
    outline.reduce(
      (b, p) => ({
        minX: Math.min(b.minX, p.x),
        maxX: Math.max(b.maxX, p.x),
        minZ: Math.min(b.minZ, p.y),
        maxZ: Math.max(b.maxZ, p.y),
      }),
      { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity },
    );
  remapPlanarUVs(mesh, bounds);
  return mesh;
}

/** Image-space UVs from a top-down projection of the mesh's local XZ. */
export function remapPlanarUVs(
  mesh: Mesh,
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
): void {
  const positions = mesh.getVerticesData("position");
  if (!positions) return;
  const uvs: number[] = [];
  const w = bounds.maxX - bounds.minX || 1;
  const d = bounds.maxZ - bounds.minZ || 1;
  for (let i = 0; i < positions.length; i += 3) {
    uvs.push((positions[i] - bounds.minX) / w, (bounds.maxZ - positions[i + 2]) / d);
  }
  mesh.setVerticesData("uv", uvs);
}

/**
 * Elliptical tube swept along a planar path. Unlike CreateTube the
 * cross-section can be oval and vary along the path (mug handle, spoon), and
 * its orientation is fixed by `binormal` instead of Path3D's guessed frame.
 */
export function sweep(
  name: string,
  scene: Scene,
  path: Vector3[],
  options: {
    /** Normal of the plane the path lies in. */
    binormal: Vector3;
    /** Half-extents [in the path plane, along the binormal] at t ∈ 0..1. */
    radii: (t: number) => [number, number];
    ring: number;
  },
): Mesh {
  const positions: number[] = [];
  const count = path.length;
  const b = options.binormal.normalizeToNew();
  for (let i = 0; i < count; i++) {
    const prev = path[Math.max(0, i - 1)];
    const next = path[Math.min(count - 1, i + 1)];
    const tangent = next.subtract(prev).normalize();
    const n = Vector3.Cross(b, tangent).normalize();
    const [ra, rb] = options.radii(i / (count - 1));
    for (let s = 0; s <= options.ring; s++) {
      const phi = (s / options.ring) * Math.PI * 2;
      const p = path[i]
        .add(n.scale(ra * Math.cos(phi)))
        .add(b.scale(rb * Math.sin(phi)));
      positions.push(p.x, p.y, p.z);
    }
  }
  return meshFrom(name, scene, positions, gridIndices(options.ring, count - 1), null, (x, y, z, vertex) => {
    const centre = path[Math.floor(vertex / (options.ring + 1))];
    return [x - centre.x, y - centre.y, z - centre.z];
  });
}

/**
 * Surface sampled over a (cols + 1) × (rows + 1) grid. `at` receives u, v in
 * 0..1 (image space: v = 0 is the top edge) and those are also the UVs.
 */
export function surfaceGrid(
  name: string,
  scene: Scene,
  cols: number,
  rows: number,
  at: (u: number, v: number) => [number, number, number],
  outward: [number, number, number],
): Mesh {
  const positions: number[] = [];
  const uvs: number[] = [];
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      const v = r / rows;
      positions.push(...at(u, v));
      uvs.push(u, v);
    }
  }
  return meshFrom(name, scene, positions, gridIndices(cols, rows), uvs, () => outward);
}

/** Points along a cubic Bézier. */
export function bezier(p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, steps: number): Vector3[] {
  const out: Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    out.push(
      p0
        .scale(mt * mt * mt)
        .add(p1.scale(3 * mt * mt * t))
        .add(p2.scale(3 * mt * t * t))
        .add(p3.scale(t * t * t)),
    );
  }
  return out;
}

/**
 * Open band around the Y axis, centred on the camera side (-Z). u runs left
 * to right as seen from the front, v from the top edge down.
 */
export function wrapBand(
  name: string,
  scene: Scene,
  options: {
    radius: number;
    yBottom: number;
    yTop: number;
    /** Fraction of the circumference covered. */
    wrap: number;
    segments: number;
    rows?: number;
    /** Radius at a given height, for tapered or curved walls. */
    radiusAt?: (y: number) => number;
  },
): Mesh {
  const rows = options.rows ?? 1;
  const positions: number[] = [];
  const uvs: number[] = [];
  const span = options.wrap * Math.PI * 2;
  for (let r = 0; r <= rows; r++) {
    const v = r / rows;
    const y = options.yTop + (options.yBottom - options.yTop) * v;
    const radius = options.radiusAt ? options.radiusAt(y) : options.radius;
    for (let s = 0; s <= options.segments; s++) {
      const u = s / options.segments;
      const theta = (u - 0.5) * span;
      positions.push(radius * Math.sin(theta), y, -radius * Math.cos(theta));
      uvs.push(u, v);
    }
  }
  return meshFrom(name, scene, positions, gridIndices(options.segments, rows), uvs, (x, _y, z) => [x, 0, z]);
}
