import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Color3, Vector2, Vector3 } from "@babylonjs/core/Maths/math";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";

import { ARTBOARD_SIZES } from "@/lib/geometry";
import {
  alphaPrint,
  glass,
  hash2,
  linear,
  meshFrom,
  normalMapFromHeights,
  opaquePrint,
  printMaterial,
  remapPlanarUVs,
  roundedRect,
  segments,
  slab,
  surface,
  sweep,
  textureSize,
  weaveNormal,
  type ModelContext,
  type ProductModel,
} from "./kit";

function corner(ctx: ModelContext): number {
  return segments(ctx, 8, 3);
}

/** Closed loop through an outline in the XZ plane at height y. */
function loopAt(outline: Vector2[], y: number): Vector3[] {
  const start = Math.floor(outline.length / 8);
  const pts: Vector3[] = [];
  for (let i = 0; i <= outline.length; i++) {
    const p = outline[(start + i) % outline.length];
    pts.push(new Vector3(p.x, y, p.y));
  }
  return pts;
}

/* ------------------------------------------------------------------ */
/* Canvas tableau                                                       */
/* ------------------------------------------------------------------ */

interface Quad {
  corners: [Vector3, Vector3, Vector3, Vector3];
  uvs: [number, number][];
}

function quads(name: string, scene: Scene, list: Quad[], centre: Vector3): Mesh {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  list.forEach((q, i) => {
    q.corners.forEach((p) => positions.push(p.x, p.y, p.z));
    q.uvs.forEach(([u, v]) => uvs.push(u, v));
    const b = i * 4;
    indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
  });
  return meshFrom(name, scene, positions, indices, uvs, (x, y, z) => [
    x - centre.x,
    y - centre.y,
    z - centre.z,
  ]);
}

export function buildCanvas(ctx: ModelContext): ProductModel {
  const { scene } = ctx;
  const { width: aw, height: ah } = ARTBOARD_SIZES.canvas;
  // Landscape: the long side is the width, matching the 30 × 17 cm print.
  const w = 4.6;
  const h = (w * ah) / aw;
  const t = 0.17;
  const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
  const L = -w / 2;
  const R = w / 2;
  const F = -t / 2;
  const B = t / 2;
  // Gallery wrap: the sides mirror the strip of artwork next to each edge,
  // which is how stretched canvases are printed.
  const du = t / w;
  const dv = t / h;
  const face = quads(
    "canvasFace",
    scene,
    [
      { corners: [V(L, h, F), V(R, h, F), V(R, 0, F), V(L, 0, F)], uvs: [[0, 0], [1, 0], [1, 1], [0, 1]] },
      { corners: [V(R, h, F), V(R, h, B), V(R, 0, B), V(R, 0, F)], uvs: [[1, 0], [1 - du, 0], [1 - du, 1], [1, 1]] },
      { corners: [V(L, h, B), V(L, h, F), V(L, 0, F), V(L, 0, B)], uvs: [[du, 0], [0, 0], [0, 1], [du, 1]] },
      { corners: [V(L, h, B), V(R, h, B), V(R, h, F), V(L, h, F)], uvs: [[0, dv], [1, dv], [1, 0], [0, 0]] },
      { corners: [V(L, 0, F), V(R, 0, F), V(R, 0, B), V(L, 0, B)], uvs: [[0, 1], [1, 1], [1, 1 - dv], [0, 1 - dv]] },
    ],
    V(0, h / 2, 0),
  );

  const printMat = printMaterial(ctx, { color: new Color3(0.94, 0.93, 0.9), roughness: 0.82 });
  const weave = weaveNormal(ctx, "canvasWeave", 8, 2.2);
  weave.uScale = 22 * w;
  weave.vScale = 22 * h;
  weave.level = 0.45;
  printMat.bumpTexture = weave;
  face.material = printMat;

  // Open back: raw linen behind the face, framed by the wooden stretcher.
  const back = MeshBuilder.CreatePlane("canvasBack", { width: w, height: h }, scene);
  back.rotation.y = Math.PI;
  back.position.set(0, h / 2, F + 0.01);
  back.material = surface(ctx, "linen", { color: linear("#d9cfbd"), roughness: 0.95 });
  const wood = surface(ctx, "stretcher", { color: linear("#b88b5a"), roughness: 0.7 });
  const bar = 0.12;
  const barDepth = t - 0.03;
  for (const [bw, bh, x, y] of [
    [w - 0.02, bar, 0, h - bar / 2 - 0.01],
    [w - 0.02, bar, 0, bar / 2 + 0.01],
    [bar, h - 0.02, L + bar / 2 + 0.01, h / 2],
    [bar, h - 0.02, R - bar / 2 - 0.01, h / 2],
  ]) {
    const piece = MeshBuilder.CreateBox("stretcherBar", { width: bw, height: bh, depth: barDepth }, scene);
    piece.position.set(x, y, B - barDepth / 2);
    piece.material = wood;
  }

  return {
    camera: { alpha: -Math.PI / 2 + 0.42, beta: 1.28, radius: 8.2, targetY: h / 2 },
    shadows: [{ shape: "rect", width: w, depth: t, radius: 0.02, strength: 0.75, height: h }],
    print: { material: printMat, meshes: [face], alwaysVisible: true, configure: opaquePrint },
  };
}

/* ------------------------------------------------------------------ */
/* Acrylic coaster                                                      */
/* ------------------------------------------------------------------ */

export function buildCoaster(ctx: ModelContext): ProductModel {
  const { scene } = ctx;
  const size = 2.2;
  const thick = 0.13;
  const outline = roundedRect(size, size, 0.2, corner(ctx));

  // Reverse-printed acrylic: artwork on a white backing under a clear block.
  const backing = slab("coasterBacking", scene, outline, { top: 0.012, depth: 0.012 });
  backing.material = surface(ctx, "backing", { color: new Color3(0.93, 0.93, 0.92), roughness: 0.6 });

  const inset = roundedRect(size - 0.06, size - 0.06, 0.17, corner(ctx));
  const print = slab("printArea", scene, inset, { top: 0.016, depth: 0.003 });
  const printMat = printMaterial(ctx, { color: new Color3(0.95, 0.95, 0.94), roughness: 0.55 });
  print.material = printMat;

  const block = slab("acrylic", scene, outline, { top: thick, depth: thick - 0.018 });
  // A convex slab: only the near faces are needed, and each extra layer veils the print.
  const acrylic = glass(ctx, "acrylicMat", "#e4f2ee", 0.08);
  acrylic.backFaceCulling = true;
  acrylic.twoSidedLighting = false;
  acrylic.separateCullingPass = false;
  block.material = acrylic;

  return {
    camera: { alpha: -Math.PI / 2 + 0.2, beta: 0.8, radius: 4.8, targetY: 0.06 },
    shadows: [{ shape: "rect", width: size, depth: size, radius: 0.2, strength: 0.5 }],
    print: { material: printMat, meshes: [print], alwaysVisible: true, configure: opaquePrint },
  };
}

/* ------------------------------------------------------------------ */
/* Chocolate gift box                                                   */
/* ------------------------------------------------------------------ */

function valueNoise(size: number, cells: number, seed: number): Float32Array {
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * cells;
      const fy = (y / size) * cells;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const sx = fx - x0;
      const sy = fy - y0;
      const at = (i: number, j: number) => hash2(((i % cells) + cells) % cells + seed, ((j % cells) + cells) % cells);
      const top = at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx;
      const bottom = at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx;
      out[y * size + x] = top * (1 - sy) + bottom * sy;
    }
  }
  return out;
}

/** Crumpled foil: two octaves of sharp noise make the facets catch light. */
function foilNormal(ctx: ModelContext): DynamicTexture {
  const size = textureSize(ctx, 128);
  const a = valueNoise(size, 6, 1);
  const b = valueNoise(size, 14, 7);
  const heights = new Float32Array(size * size);
  for (let i = 0; i < heights.length; i++) heights[i] = Math.abs(a[i] - 0.5) * 1.4 + b[i] * 0.4;
  return normalMapFromHeights(ctx, "foilNormal", heights, size, 6, true);
}

export function buildChocolateBox(ctx: ModelContext): ProductModel {
  const { scene } = ctx;
  const size = 2.6;
  const lidSize = size + 0.08;
  const lidTop = 0.98;
  const satin = surface(ctx, "boxSatin", {
    color: linear("#4a2a1e"),
    roughness: 0.46,
    sheen: new Color3(0.55, 0.42, 0.34),
  });
  const gold = surface(ctx, "gold", { color: new Color3(1, 0.77, 0.4), metallic: 1, roughness: 0.28 });

  const base = slab("boxBase", scene, roundedRect(size, size, 0.05, corner(ctx)), { top: 0.64, depth: 0.64 });
  base.material = satin;
  const lidOutline = roundedRect(lidSize, lidSize, 0.06, corner(ctx));
  const lid = slab("boxLid", scene, lidOutline, { top: lidTop, depth: 0.38 });
  lid.material = satin;

  const trimRing = sweep("lidTrim", scene, loopAt(lidOutline, lidTop - 0.3), {
    binormal: new Vector3(0, 1, 0),
    radii: () => [0.014, 0.014],
    ring: 6,
  });
  trimRing.material = gold;

  const printSize = size - 0.26;
  const printOutline = roundedRect(printSize, printSize, 0.03, corner(ctx));
  const print = slab("printArea", scene, printOutline, { top: lidTop + 0.004, depth: 0.004 });
  const printMat = printMaterial(ctx, { roughness: 0.3, clearCoat: 0.12 });
  print.material = printMat;
  const frame = sweep(
    "printFrame",
    scene,
    loopAt(roundedRect(printSize + 0.05, printSize + 0.05, 0.05, corner(ctx)), lidTop + 0.004),
    { binormal: new Vector3(0, 1, 0), radii: () => [0.012, 0.006], ring: 6 },
  );
  frame.material = gold;

  // Two foil-wrapped pralines beside the box sell the "chocolate" at a glance.
  const foil = surface(ctx, "foil", { color: new Color3(1, 0.8, 0.45), metallic: 1, roughness: 0.32 });
  foil.bumpTexture = foilNormal(ctx);
  const cupMat = surface(ctx, "paperCup", { color: linear("#5b3a22"), roughness: 0.75 });
  const pralines: [number, number][] = [
    [1.95, -1.15],
    [2.35, -0.45],
  ];
  for (const [x, z] of pralines) {
    const cup = MeshBuilder.CreateCylinder(
      "praline cup",
      { diameterTop: 0.5, diameterBottom: 0.38, height: 0.13, tessellation: segments(ctx, 24, 12) },
      scene,
    );
    cup.position.set(x, 0.065, z);
    cup.material = cupMat;
    const ball = MeshBuilder.CreateSphere(
      "praline",
      { diameter: 0.46, segments: segments(ctx, 20, 10) },
      scene,
    );
    ball.position.set(x, 0.3, z);
    ball.rotation.set(hash2(x, z) * 3, hash2(z, x) * 3, 0);
    ball.material = foil;
  }

  return {
    camera: { alpha: -Math.PI / 2 + 0.36, beta: 0.98, radius: 7.4, targetY: 0.45 },
    shadows: [
      { shape: "rect", width: lidSize, depth: lidSize, radius: 0.06, strength: 0.7, height: 1 },
      ...pralines.map(([x, z]) => ({
        shape: "ellipse" as const,
        width: 0.4,
        depth: 0.4,
        x,
        z,
        strength: 0.6,
        height: 0.5,
      })),
    ],
    print: { material: printMat, meshes: [print], configure: opaquePrint },
  };
}

/* ------------------------------------------------------------------ */
/* iPhone case                                                          */
/* ------------------------------------------------------------------ */

export function buildPhoneCase(ctx: ModelContext): ProductModel {
  const { scene } = ctx;
  const { width: aw, height: ah } = ARTBOARD_SIZES.phone;
  const length = 3.25;
  const width = (length * aw) / ah;
  const thick = 0.2;
  const steps = corner(ctx) + 2;

  const caseMat = surface(ctx, "tpu", { color: linear("#1c1c1e"), roughness: 0.5 });
  const shell = slab("caseShell", scene, roundedRect(width, length, 0.27, steps), { top: thick, depth: thick });
  shell.material = caseMat;

  // Camera cut-out: top-left when looking at the back.
  const island = 0.66;
  const islandX = -width / 2 + 0.1 + island / 2;
  const islandZ = length / 2 - 0.1 - island / 2;
  const islandOutline = roundedRect(island, island, 0.16, steps).map(
    (p) => new Vector2(p.x + islandX, p.y + islandZ),
  );

  const printW = width - 0.06;
  const printL = length - 0.06;
  const printOutline = roundedRect(printW, printL, 0.24, steps);
  const print = slab("printArea", scene, printOutline, {
    top: thick + 0.004,
    depth: 0.004,
    holes: [islandOutline.slice().reverse()],
  });
  const printMat = printMaterial(ctx, { roughness: 0.18, clearCoat: 0.05 });
  print.material = printMat;

  const lip = slab("islandLip", scene, roundedRect(island + 0.04, island + 0.04, 0.18, steps), {
    top: thick + 0.03,
    depth: 0.03,
    holes: [roundedRect(island - 0.04, island - 0.04, 0.14, steps).reverse()],
  });
  lip.position.x = islandX;
  lip.position.z = islandZ;
  lip.material = caseMat;

  const plateau = slab("cameraGlass", scene, roundedRect(island - 0.04, island - 0.04, 0.14, steps), {
    top: thick + 0.045,
    depth: 0.05,
  });
  plateau.position.x = islandX;
  plateau.position.z = islandZ;
  plateau.material = surface(ctx, "frostedGlass", { color: linear("#2c2c2f"), roughness: 0.35, clearCoat: 0.05 });

  const ringMat = surface(ctx, "lensRing", { color: new Color3(0.55, 0.56, 0.58), metallic: 1, roughness: 0.25 });
  const lensMat = surface(ctx, "lens", { color: linear("#08090c"), roughness: 0.05, clearCoat: 0.02 });
  const tess = segments(ctx, 28, 12);
  for (const [dx, dz] of [
    [-0.14, 0.14],
    [-0.14, -0.14],
    [0.14, 0],
  ]) {
    const ring = MeshBuilder.CreateCylinder("lensRing", { diameter: 0.25, height: 0.05, tessellation: tess }, scene);
    ring.position.set(islandX + dx, thick + 0.07, islandZ + dz);
    ring.material = ringMat;
    const lens = MeshBuilder.CreateCylinder("lensGlass", { diameter: 0.17, height: 0.012, tessellation: tess }, scene);
    lens.position.set(islandX + dx, thick + 0.096, islandZ + dz);
    lens.material = lensMat;
  }
  const flash = MeshBuilder.CreateCylinder("flash", { diameter: 0.07, height: 0.01, tessellation: 12 }, scene);
  flash.position.set(islandX + 0.14, thick + 0.05, islandZ + 0.16);
  flash.material = surface(ctx, "flashMat", { color: linear("#f3e7c4"), roughness: 0.3 });

  // Button covers on the case rim (mirrored, since we see the back).
  const buttons: [number, number, number][] = [
    [width / 2, 0.95, 0.22],
    [width / 2, 0.62, 0.22],
    [-width / 2, 0.75, 0.36],
  ];
  for (const [x, z, len] of buttons) {
    const b = MeshBuilder.CreateBox("caseButton", { width: 0.05, height: 0.07, depth: len }, scene);
    b.position.set(x + Math.sign(x) * 0.015, thick / 2, z);
    b.material = caseMat;
  }

  return {
    camera: { alpha: -Math.PI / 2 + 0.3, beta: 0.66, radius: 6, targetY: 0.1 },
    shadows: [{ shape: "rect", width, depth: length, radius: 0.27, strength: 0.6 }],
    print: { material: printMat, meshes: [print], configure: opaquePrint },
  };
}

/* ------------------------------------------------------------------ */
/* Jigsaw puzzle                                                        */
/* ------------------------------------------------------------------ */

const PUZZLE = { size: 2.7, pieces: 8, missing: [5, 5] as const };

/** One knobbed edge in (along, out) units of the edge length. */
const KNOB: [number, number][] = (() => {
  const pts: [number, number][] = [
    [0, 0],
    [0.2, 0.012],
    [0.37, -0.005],
    [0.425, 0.045],
    [0.41, 0.09],
  ];
  const cx = 0.5;
  const cy = 0.175;
  const r = 0.105;
  const a0 = Math.atan2(0.09 - cy, 0.41 - cx);
  const a1 = Math.atan2(0.09 - cy, 0.59 - cx) - Math.PI * 2;
  for (let i = 1; i < 12; i++) {
    const a = a0 + ((a1 - a0) * i) / 12;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  pts.push([0.59, 0.09], [0.575, 0.045], [0.63, -0.005], [0.8, 0.012], [1, 0]);
  return pts;
})();

/** Edge from A to B in world XZ; sign 0 keeps the straight board border. */
function edge(a: Vector2, b: Vector2, sign: number): Vector2[] {
  if (sign === 0) return [a, b];
  const dx = b.x - a.x;
  const dz = b.y - a.y;
  return KNOB.map(([t, o]) => new Vector2(a.x + dx * t - dz * o * sign, a.y + dz * t + dx * o * sign));
}

function puzzleLayout() {
  const { size, pieces } = PUZZLE;
  const cell = size / pieces;
  const corner = (c: number, r: number) => new Vector2(-size / 2 + c * cell, size / 2 - r * cell);
  const hSign = (c: number, r: number) =>
    r === 0 || r === pieces ? 0 : hash2(c + 3, r + 17) > 0.5 ? 1 : -1;
  const vSign = (c: number, r: number) =>
    c === 0 || c === pieces ? 0 : hash2(c + 29, r + 5) > 0.5 ? 1 : -1;
  const horizontal = (c: number, r: number) => edge(corner(c, r), corner(c + 1, r), hSign(c, r));
  const vertical = (c: number, r: number) => edge(corner(c, r), corner(c, r + 1), vSign(c, r));
  const piece = (c: number, r: number) => {
    const parts = [
      horizontal(c, r),
      vertical(c + 1, r),
      horizontal(c, r + 1).slice().reverse(),
      vertical(c, r).slice().reverse(),
    ];
    return parts.flatMap((p) => p.slice(0, -1));
  };
  const cuts: Vector2[][] = [];
  for (let i = 1; i < pieces; i++) {
    for (let j = 0; j < pieces; j++) {
      cuts.push(horizontal(j, i), vertical(i, j));
    }
  }
  return { piece, cuts };
}

/** Groove shading for the cut lines: ambient occlusion plus a normal map. */
function puzzleGrooves(ctx: ModelContext, cuts: Vector2[][]) {
  const size = textureSize(ctx, 1024);
  const ao = new DynamicTexture("puzzleAO", { width: size, height: size }, ctx.scene, true);
  const c = ao.getContext() as unknown as CanvasRenderingContext2D;
  const s = PUZZLE.size;
  const px = (p: Vector2): [number, number] => [((p.x + s / 2) / s) * size, ((s / 2 - p.y) / s) * size];
  c.fillStyle = "#fff";
  c.fillRect(0, 0, size, size);
  c.lineJoin = "round";
  const stroke = (width: number, color: string) => {
    c.strokeStyle = color;
    c.lineWidth = Math.max(1, (width / s) * size);
    for (const cut of cuts) {
      c.beginPath();
      c.moveTo(...px(cut[0]));
      for (const p of cut.slice(1)) c.lineTo(...px(p));
      c.stroke();
    }
  };
  stroke(0.028, "rgba(0, 0, 0, 0.12)");
  stroke(0.007, "rgba(0, 0, 0, 0.75)");
  const pixels = c.getImageData(0, 0, size, size).data;
  ao.update(false);

  const heights = new Float32Array(size * size);
  for (let i = 0; i < heights.length; i++) heights[i] = pixels[i * 4] / 255;
  const normal = normalMapFromHeights(ctx, "puzzleNormal", heights, size, 2.5, false);
  return { ao, normal };
}

export function buildPuzzle(ctx: ModelContext): ProductModel {
  const { scene } = ctx;
  const { size } = PUZZLE;
  const thick = 0.06;
  const { piece, cuts } = puzzleLayout();
  const [mc, mr] = PUZZLE.missing;
  const gap = piece(mc, mr);
  const board = [
    new Vector2(size / 2, size / 2),
    new Vector2(-size / 2, size / 2),
    new Vector2(-size / 2, -size / 2),
    new Vector2(size / 2, -size / 2),
  ];
  const bounds = { minX: -size / 2, maxX: size / 2, minZ: -size / 2, maxZ: size / 2 };

  const printMat = printMaterial(ctx, { color: new Color3(0.95, 0.95, 0.94), roughness: 0.42 });
  const { ao, normal } = puzzleGrooves(ctx, cuts);
  printMat.ambientTexture = ao;
  printMat.bumpTexture = normal;
  normal.level = 0.8;
  const card = surface(ctx, "puzzleCard", { color: linear("#b9b2a6"), roughness: 0.9 });

  const top = slab("printArea", scene, board, { top: thick, depth: 0, holes: [gap], uvBounds: bounds });
  top.material = printMat;
  const body = slab("puzzleBody", scene, board, { top: thick - 0.001, depth: thick - 0.001, holes: [gap] });
  body.material = card;

  // The missing piece, lying beside the board with its slice of the artwork.
  const loose = new TransformNode("loosePiece", scene);
  const cell = size / PUZZLE.pieces;
  const centre = new Vector3(-size / 2 + (mc + 0.5) * cell, 0, size / 2 - (mr + 0.5) * cell);
  const pieceTop = slab("printPiece", scene, gap, { top: thick, depth: 0, uvBounds: bounds });
  pieceTop.material = printMat;
  const pieceBody = slab("pieceBody", scene, gap, { top: thick - 0.001, depth: thick - 0.001 });
  pieceBody.material = card;
  for (const m of [pieceTop, pieceBody]) {
    m.parent = loose;
    m.position.x = -centre.x;
    m.position.z = -centre.z;
  }
  loose.position.set(size / 2 + 0.6, 0, -size / 2 + 0.55);
  loose.rotation.y = 0.5;

  return {
    camera: { alpha: -Math.PI / 2 + 0.22, beta: 0.72, radius: 6.4, targetY: 0.05 },
    shadows: [
      { shape: "rect", width: size, depth: size, radius: 0.02, strength: 0.45 },
      { shape: "rect", width: cell, depth: cell, x: loose.position.x, z: loose.position.z, rotation: 0.5, radius: 0.08, strength: 0.4 },
    ],
    print: { material: printMat, meshes: [top, pieceTop], alwaysVisible: true, configure: opaquePrint },
  };
}

/* ------------------------------------------------------------------ */
/* NFC card                                                             */
/* ------------------------------------------------------------------ */

export function buildNfcCard(ctx: ModelContext): ProductModel {
  const { scene } = ctx;
  const { width: aw, height: ah } = ARTBOARD_SIZES.nfc;
  const w = 3.1;
  const d = (w * ah) / aw;
  const thick = 0.035;
  const outline = roundedRect(w, d, 0.13, corner(ctx) + 2);

  const card = new TransformNode("nfcCard", scene);
  const core = slab("cardCore", scene, outline, { top: thick, depth: thick });
  core.material = surface(ctx, "pvc", {
    color: ctx.tint ? linear(ctx.tint) : new Color3(0.92, 0.92, 0.91),
    roughness: 0.35,
  });
  core.parent = card;

  const print = slab("printArea", scene, outline, { top: thick + 0.002, depth: 0.002 });
  const printMat = printMaterial(ctx, { color: new Color3(0.95, 0.95, 0.94), roughness: 0.16, clearCoat: 0.04 });
  print.material = printMat;
  print.parent = card;
  card.rotation.y = -0.14;

  return {
    camera: { alpha: -Math.PI / 2 + 0.12, beta: 0.74, radius: 5.2, targetY: 0.02 },
    shadows: [{ shape: "rect", width: w, depth: d, rotation: -0.14, radius: 0.13, strength: 0.55 }],
    print: { material: printMat, meshes: [print], alwaysVisible: true, configure: opaquePrint },
  };
}

/* ------------------------------------------------------------------ */
/* Sticker and badge                                                    */
/* ------------------------------------------------------------------ */

export function buildSticker(ctx: ModelContext): ProductModel {
  const { scene } = ctx;
  const base = slab("stickerBase", scene, roundedRect(2.3, 2.3, 0.28, corner(ctx)), { top: 0.02, depth: 0.02 });
  base.material = surface(ctx, "vinyl", { color: new Color3(0.95, 0.95, 0.95), roughness: 0.22, clearCoat: 0.04 });

  const print = slab("printArea", scene, roundedRect(2.08, 2.08, 0.18, corner(ctx)), { top: 0.023, depth: 0.002 });
  const printMat = printMaterial(ctx, { roughness: 0.22, clearCoat: 0.04 });
  print.material = printMat;

  return {
    camera: { alpha: -Math.PI / 2, beta: 0.55, radius: 4.6, targetY: 0.02 },
    shadows: [{ shape: "rect", width: 2.3, depth: 2.3, radius: 0.28, strength: 0.45 }],
    print: { material: printMat, meshes: [print], configure: alphaPrint(printMat) },
  };
}

export function buildBadge(ctx: ModelContext): ProductModel {
  const { scene } = ctx;
  const radius = 1;
  const tess = segments(ctx, 72, 32);
  const domeRows = segments(ctx, 12, 6);
  const profile: Vector3[] = [new Vector3(0, 0.2 + 0.12, 0)];
  for (let i = 1; i <= domeRows; i++) {
    const r = (i / domeRows) * radius;
    profile.push(new Vector3(r, 0.2 + 0.12 * Math.sqrt(1 - (r / radius) ** 2), 0));
  }
  const dome = MeshBuilder.CreateLathe("printArea", { shape: profile, tessellation: tess }, scene);
  remapPlanarUVs(dome, { minX: -radius, maxX: radius, minZ: -radius, maxZ: radius });
  const printMat = printMaterial(ctx, { color: new Color3(0.95, 0.95, 0.94), roughness: 0.14, clearCoat: 0.03 });
  printMat.backFaceCulling = false;
  printMat.twoSidedLighting = true;
  dome.material = printMat;

  const metal = surface(ctx, "badgeMetal", { color: new Color3(0.85, 0.86, 0.88), metallic: 1, roughness: 0.25 });
  const shell = MeshBuilder.CreateCylinder("badgeShell", { diameter: radius * 2 + 0.06, height: 0.2, tessellation: tess }, scene);
  shell.position.y = 0.1;
  shell.material = metal;
  const rim = MeshBuilder.CreateTorus("badgeRim", { diameter: radius * 2, thickness: 0.09, tessellation: tess }, scene);
  rim.position.y = 0.2;
  rim.material = metal;

  return {
    camera: { alpha: -Math.PI / 2, beta: 0.6, radius: 4.4, targetY: 0.05 },
    shadows: [{ shape: "ellipse", width: radius * 2.06, depth: radius * 2.06, strength: 0.55 }],
    print: { material: printMat, meshes: [dome], alwaysVisible: true, configure: opaquePrint },
  };
}