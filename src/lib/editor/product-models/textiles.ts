import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";

import { ARTBOARD_SIZES } from "@/lib/geometry";
import {
  alphaPrint,
  bezier,
  hash2,
  linear,
  opaquePrint,
  segments,
  surface,
  surfaceGrid,
  sweep,
  textureSize,
  weaveNormal,
  type ModelContext,
  type ProductModel,
} from "./kit";

/** Threads per world unit, so every fabric surface shares one weave scale. */
const WEAVE_DENSITY = 14;

function fabric(
  ctx: ModelContext,
  name: string,
  color: Color3,
  options: { width: number; height: number; roughness?: number; weave?: boolean; dye?: Color3 },
): PBRMaterial {
  // Sheen takes the dye's colour; a grey sheen washes cream cotton out to grey.
  const dye = options.dye ?? color;
  const mat = surface(ctx, name, {
    color,
    roughness: options.roughness ?? 0.9,
    sheen: dye.scale(0.55),
  });
  if (options.weave !== false) {
    const weave = weaveNormal(ctx, `${name}Weave`);
    weave.uScale = WEAVE_DENSITY * options.width;
    weave.vScale = WEAVE_DENSITY * options.height;
    weave.level = 0.4;
    mat.bumpTexture = weave;
  }
  return mat;
}

function rgb(color: Color3, factor = 1): string {
  const c = (v: number) => Math.round(Math.min(1, v * factor) * 255);
  return `rgb(${c(color.r)}, ${c(color.g)}, ${c(color.b)})`;
}

/* ------------------------------------------------------------------ */
/* T-shirt (flat lay)                                                   */
/* ------------------------------------------------------------------ */

// Square footprint keeps the painted texture power-of-two for WebGL1.
const TEE_W = 3.4;
const TEE_D = 3.4;

type Pt = [number, number];
const NECK: Pt = [0.38, 1.38];
const SHOULDER: Pt = [1.0, 1.22];
const CUFF_TOP: Pt = [1.5, 0.64];
const CUFF_BOTTOM: Pt = [1.2, 0.34];
const ARMPIT: Pt = [0.9, 0.56];
const HEM: Pt = [0.94, -1.5];

/** Tee outline in world XZ, top of the shirt towards +Z. */
function traceTee(c: CanvasRenderingContext2D, to: (p: Pt) => Pt): void {
  const m = (p: Pt): Pt => [-p[0], p[1]];
  const line = (p: Pt) => c.lineTo(...to(p));
  c.beginPath();
  c.moveTo(...to(m(NECK)));
  // Back neckline: the visible inside of the collar sits above the front one.
  c.quadraticCurveTo(...to([0, 1.3]), ...to(NECK));
  line(SHOULDER);
  line(CUFF_TOP);
  line(CUFF_BOTTOM);
  c.quadraticCurveTo(...to([0.98, 0.42]), ...to(ARMPIT));
  c.quadraticCurveTo(...to([0.9, -0.5]), ...to(HEM));
  c.quadraticCurveTo(...to([0, -1.57]), ...to(m(HEM)));
  c.quadraticCurveTo(...to([-0.9, -0.5]), ...to(m(ARMPIT)));
  c.quadraticCurveTo(...to([-0.98, 0.42]), ...to(m(CUFF_BOTTOM)));
  line(m(CUFF_TOP));
  line(m(SHOULDER));
  c.closePath();
}

function traceFrontNeck(c: CanvasRenderingContext2D, to: (p: Pt) => Pt): void {
  c.beginPath();
  c.moveTo(...to([-NECK[0], NECK[1]]));
  c.bezierCurveTo(...to([-0.36, 1.02]), ...to([0.36, 1.02]), ...to(NECK));
}

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
}

/**
 * Height of the lying shirt: a blurred silhouette mask, so the fabric
 * swells from a flat edge to a soft, filled-out body, plus gentle wrinkles.
 */
function teeHeights(): (x: number, z: number) => number {
  const w = 160;
  const h = Math.round((w * TEE_D) / TEE_W);
  const c = makeCanvas(w, h);
  const scale = w / TEE_W;
  const to = (p: Pt): Pt => [(p[0] + TEE_W / 2) * scale + w * 2, (TEE_D / 2 - p[1]) * scale];
  c.shadowColor = "#fff";
  c.shadowBlur = 0.2 * scale;
  c.shadowOffsetX = -w * 2;
  c.fillStyle = "#fff";
  traceTee(c, to);
  c.fill();
  const data = c.getImageData(0, 0, w, h).data;
  const mask = (px: number, pz: number) => {
    const x = Math.min(w - 1, Math.max(0, px));
    const y = Math.min(h - 1, Math.max(0, pz));
    return data[(y * w + x) * 4 + 3] / 255;
  };
  return (x, z) => {
    const fx = (x + TEE_W / 2) * scale - 0.5;
    const fz = (TEE_D / 2 - z) * scale - 0.5;
    const x0 = Math.floor(fx);
    const z0 = Math.floor(fz);
    const tx = fx - x0;
    const tz = fz - z0;
    const m =
      (mask(x0, z0) * (1 - tx) + mask(x0 + 1, z0) * tx) * (1 - tz) +
      (mask(x0, z0 + 1) * (1 - tx) + mask(x0 + 1, z0 + 1) * tx) * tz;
    if (m <= 0.5) return 0.01 * (m / 0.5);
    const inner = Math.sqrt((m - 0.5) / 0.5);
    // Soft folds: a couple of long diagonal ripples plus shallow cross creases.
    const folds =
      0.022 * Math.sin(2.2 * x + 1.4 * z + 0.6) * Math.sin(1.7 * z - 0.9 * x) +
      0.012 * Math.sin(5.3 * x - 3.1 * z + 1.1) +
      0.008 * Math.sin(7.7 * z + 2.3 * x);
    // Ribbed collar stands a little proud of the body.
    const neck = Math.hypot(x / 0.4, (z - 1.38) / 0.27);
    const collar = 0.026 * Math.max(0, 1 - Math.abs(neck - 1) / 0.16) * (z < 1.36 ? 1 : 0);
    // The opening drops to the back layer, so the collar casts a visible lip.
    const opening = neck < 1 && z < 1.34 ? 0.03 * Math.min(1, (1 - neck) / 0.2) : 0;
    return 0.01 + inner * (0.12 + folds) + collar - opening;
  };
}

function teeTexture(ctx: ModelContext, color: Color3): DynamicTexture {
  const w = textureSize(ctx, 1024);
  const h = Math.round((w * TEE_D) / TEE_W);
  const tex = new DynamicTexture("teeTex", { width: w, height: h }, ctx.scene, true);
  const c = tex.getContext() as unknown as CanvasRenderingContext2D;
  const scale = w / TEE_W;
  const to = (p: Pt): Pt => [(p[0] + TEE_W / 2) * scale, (TEE_D / 2 - p[1]) * scale];
  const stitch = (from: Pt, toPt: Pt, alpha = 0.16) => {
    c.save();
    c.strokeStyle = `rgba(60, 50, 40, ${alpha})`;
    c.lineWidth = Math.max(1, 0.008 * scale);
    c.setLineDash([0.025 * scale, 0.018 * scale]);
    c.beginPath();
    c.moveTo(...to(from));
    c.lineTo(...to(toPt));
    c.stroke();
    c.restore();
  };

  c.clearRect(0, 0, w, h);
  traceTee(c, to);
  c.fillStyle = rgb(color);
  c.fill();
  c.save();
  traceTee(c, to);
  c.clip();

  // Inside of the back, seen through the neck opening, in the collar's shade.
  c.save();
  c.beginPath();
  c.moveTo(...to([-NECK[0], NECK[1]]));
  c.quadraticCurveTo(...to([0, 1.3]), ...to(NECK));
  c.bezierCurveTo(...to([0.36, 1.02]), ...to([-0.36, 1.02]), ...to([-NECK[0], NECK[1]]));
  const [, innerTop] = to([0, 1.34]);
  const [, innerBottom] = to([0, 1.11]);
  const inside = c.createLinearGradient(0, innerTop, 0, innerBottom);
  inside.addColorStop(0, "rgba(70, 60, 50, 0.3)");
  inside.addColorStop(1, "rgba(50, 40, 32, 0.75)");
  c.fillStyle = inside;
  c.fill();
  c.restore();

  // Back collar rib, then the front rib band with its own shading.
  c.beginPath();
  c.moveTo(...to([-NECK[0], NECK[1]]));
  c.quadraticCurveTo(...to([0, 1.3]), ...to(NECK));
  c.strokeStyle = rgb(color, 0.9);
  c.lineWidth = 0.05 * scale;
  c.stroke();
  traceFrontNeck(c, to);
  c.strokeStyle = rgb(color, 0.78);
  c.lineWidth = 0.13 * scale;
  c.stroke();
  c.strokeStyle = rgb(color, 0.97);
  c.lineWidth = 0.1 * scale;
  c.stroke();
  // Fine vertical ribbing across the band.
  c.save();
  traceFrontNeck(c, to);
  c.lineWidth = 0.1 * scale;
  c.strokeStyle = "rgba(60, 50, 40, 0.1)";
  c.setLineDash([Math.max(1, 0.006 * scale), Math.max(1, 0.012 * scale)]);
  c.stroke();
  c.restore();
  c.save();
  c.translate(0, 0.055 * scale);
  traceFrontNeck(c, to);
  c.strokeStyle = "rgba(60, 50, 40, 0.22)";
  c.lineWidth = Math.max(1, 0.008 * scale);
  c.setLineDash([0.025 * scale, 0.018 * scale]);
  c.stroke();
  c.restore();

  // Seams and hems.
  for (const side of [1, -1]) {
    const s = (p: Pt): Pt => [p[0] * side, p[1]];
    stitch(s(SHOULDER), s([0.96, 0.6]), 0.2);
    stitch(s([NECK[0] + 0.02, NECK[1] - 0.03]), s([SHOULDER[0] - 0.02, SHOULDER[1] - 0.03]), 0.1);
    stitch(s([1.44, 0.69]), s([1.14, 0.39]));
    stitch(s([0.9, 0.2]), s([0.93, -1.42]), 0.08);
  }
  c.save();
  c.strokeStyle = "rgba(60, 50, 40, 0.16)";
  c.lineWidth = Math.max(1, 0.008 * scale);
  c.setLineDash([0.025 * scale, 0.018 * scale]);
  c.beginPath();
  c.moveTo(...to([-0.92, -1.42]));
  c.quadraticCurveTo(...to([0, -1.49]), ...to([0.92, -1.42]));
  c.stroke();
  c.restore();

  // Faint uneven dye and handling marks so the cotton isn't a flat colour.
  for (let i = 0; i < 26; i++) {
    const x = (hash2(i, 1) - 0.5) * 2.6;
    const z = (hash2(i, 2) - 0.5) * 2.8;
    const r = (0.2 + hash2(i, 3) * 0.5) * scale;
    const [px, py] = to([x, z]);
    const g = c.createRadialGradient(px, py, 0, px, py, r);
    const tone = hash2(i, 4) > 0.5 ? "255, 255, 255" : "80, 70, 60";
    g.addColorStop(0, `rgba(${tone}, 0.035)`);
    g.addColorStop(1, `rgba(${tone}, 0)`);
    c.fillStyle = g;
    c.fillRect(px - r, py - r, r * 2, r * 2);
  }
  c.restore();
  tex.update(false);
  tex.hasAlpha = true;
  tex.anisotropicFilteringLevel = 4;
  return tex;
}

export function buildTShirt(ctx: ModelContext): ProductModel {
  const { scene } = ctx;
  const color = ctx.tint ? Color3.FromHexString(ctx.tint) : Color3.FromHexString("#f6f5f1");
  const shown = new Color3(Math.min(color.r, 0.96), Math.min(color.g, 0.96), Math.min(color.b, 0.95));
  const height = teeHeights();

  const mat = fabric(ctx, "teeFabric", new Color3(1, 1, 1), {
    width: TEE_W,
    height: TEE_D,
    dye: shown.toLinearSpace(),
  });
  mat.albedoTexture = teeTexture(ctx, shown);
  // Blended rather than alpha-tested: MSAA can't smooth an alpha-test edge,
  // and the silhouette edge is most of what sells the shape.
  mat.useAlphaFromAlbedoTexture = true;
  mat.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
  mat.backFaceCulling = false;

  const cols = segments(ctx, 110, 44);
  const rows = Math.round((cols * TEE_D) / TEE_W);
  const shirt = surfaceGrid(
    "tshirt",
    scene,
    cols,
    rows,
    (u, v) => {
      const x = (u - 0.5) * TEE_W;
      const z = (0.5 - v) * TEE_D;
      return [x, height(x, z), z];
    },
    [0, 1, 0],
  );
  shirt.material = mat;

  // Chest print follows the fabric's swell instead of floating above it.
  const { width: aw, height: ah } = ARTBOARD_SIZES["t-shirt"];
  const pw = 1.2;
  const ph = (pw * ah) / aw;
  const centreZ = 0.02;
  const printMat = fabric(ctx, "printMat", new Color3(1, 1, 1), { width: pw, height: ph, roughness: 0.86 });
  const pc = segments(ctx, 40, 16);
  const print = surfaceGrid(
    "printArea",
    scene,
    pc,
    Math.round((pc * ph) / pw),
    (u, v) => {
      const x = (u - 0.5) * pw;
      const z = centreZ + (0.5 - v) * ph;
      return [x, height(x, z) + 0.004, z];
    },
    [0, 1, 0],
  );
  print.material = printMat;
  shirt.alphaIndex = 0;
  print.alphaIndex = 1;

  return {
    camera: { alpha: -Math.PI / 2, beta: 0.55, radius: 6.5, targetY: 0.05 },
    shadows: [
      { shape: "rect", width: 1.8, depth: 2.85, z: -0.12, radius: 0.2, strength: 0.32, height: 0.1 },
      { shape: "rect", width: 0.55, depth: 0.36, x: 1.2, z: 0.62, rotation: 0.8, radius: 0.1, strength: 0.26, height: 0.08 },
      { shape: "rect", width: 0.55, depth: 0.36, x: -1.2, z: 0.62, rotation: -0.8, radius: 0.1, strength: 0.26, height: 0.08 },
    ],
    print: { material: printMat, meshes: [print], configure: alphaPrint(printMat) },
  };
}

/* ------------------------------------------------------------------ */
/* Tote bag                                                             */
/* ------------------------------------------------------------------ */

const TOTE_W = 2.6;
const TOTE_H = 2.95;

/** Distance of the front panel from the bag's mid-plane. */
function toteBulge(x: number, y: number): number {
  const across = Math.pow(Math.max(0, 1 - Math.pow(Math.abs((2 * x) / TOTE_W), 2.4)), 0.8);
  const along = 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, Math.max(0, y / TOTE_H)));
  const drape = 0.012 * Math.sin(7.3 * x + 2 * y) * across;
  return 0.006 + 0.15 * across * along + drape;
}

function canvasPanelTexture(ctx: ModelContext, color: Color3): DynamicTexture {
  const size = textureSize(ctx, 512);
  const tex = new DynamicTexture("toteTex", { width: size, height: size }, ctx.scene, true);
  const c = tex.getContext() as unknown as CanvasRenderingContext2D;
  c.fillStyle = rgb(color);
  c.fillRect(0, 0, size, size);
  // Folded top hem: a slightly darker band and its stitch line.
  const hem = (0.16 / TOTE_H) * size;
  c.fillStyle = "rgba(70, 55, 35, 0.06)";
  c.fillRect(0, 0, size, hem);
  c.strokeStyle = "rgba(70, 55, 35, 0.3)";
  c.lineWidth = Math.max(1, size / 400);
  c.setLineDash([size / 90, size / 140]);
  c.beginPath();
  c.moveTo(0, hem);
  c.lineTo(size, hem);
  c.stroke();
  // Side and bottom seams darken where the fabric folds over.
  const edge = (horizontal: boolean, at: number, toward: number) => {
    const g = horizontal
      ? c.createLinearGradient(0, at, 0, toward)
      : c.createLinearGradient(at, 0, toward, 0);
    g.addColorStop(0, "rgba(60, 45, 30, 0.14)");
    g.addColorStop(1, "rgba(60, 45, 30, 0)");
    c.fillStyle = g;
    if (horizontal) c.fillRect(0, Math.min(at, toward), size, Math.abs(toward - at));
    else c.fillRect(Math.min(at, toward), 0, Math.abs(toward - at), size);
  };
  edge(false, 0, size * 0.04);
  edge(false, size, size * 0.96);
  edge(true, size, size * 0.95);
  tex.update(false);
  return tex;
}

export function buildToteBag(ctx: ModelContext): ProductModel {
  const { scene } = ctx;
  const base = Color3.FromHexString(ctx.tint ?? "#EADCC4");
  const panelMat = fabric(ctx, "toteFabric", new Color3(1, 1, 1), {
    width: TOTE_W,
    height: TOTE_H,
    roughness: 0.94,
    dye: base.toLinearSpace(),
  });
  panelMat.albedoTexture = canvasPanelTexture(ctx, base);
  panelMat.backFaceCulling = false;
  panelMat.twoSidedLighting = true;

  const cols = segments(ctx, 48, 20);
  const rows = segments(ctx, 48, 20);
  const panel = (name: string, side: -1 | 1) => {
    const mesh = surfaceGrid(
      name,
      scene,
      cols,
      rows,
      (u, v) => {
        const x = (u - 0.5) * TOTE_W * -side;
        const y = (1 - v) * TOTE_H;
        return [x, y, side * toteBulge(x, y)];
      },
      [0, 0, side],
    );
    mesh.material = panelMat;
    return mesh;
  };
  panel("toteFront", -1);
  panel("toteBack", 1);

  const bottom = surfaceGrid(
    "toteBottom",
    scene,
    cols,
    1,
    (u, v) => {
      const x = (u - 0.5) * TOTE_W;
      const z = toteBulge(x, 0) * (2 * v - 1);
      return [x, 0.001, z];
    },
    [0, -1, 0],
  );
  bottom.material = panelMat;

  // Shade inside the mouth so the opening reads as depth, not a lit sheet.
  const insideY = TOTE_H - 0.3;
  const inside = surfaceGrid(
    "toteInside",
    scene,
    cols,
    1,
    (u, v) => {
      const x = (u - 0.5) * TOTE_W;
      return [x, insideY, toteBulge(x, insideY) * (2 * v - 1) * 0.97];
    },
    [0, 1, 0],
  );
  inside.material = surface(ctx, "toteInsideMat", { color: linear("#3a3026"), roughness: 1 });

  const trimColor = Color3.FromHexString(rgbHex(base, 0.97)).toLinearSpace();
  const trim = surface(ctx, "toteTrim", {
    color: trimColor,
    roughness: 0.95,
    sheen: trimColor.scale(0.5),
  });

  // Folded hem along each panel's mouth.
  for (const side of [-1, 1] as const) {
    const steps = segments(ctx, 30, 12);
    const path: Vector3[] = [];
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps - 0.5) * TOTE_W;
      path.push(new Vector3(x, TOTE_H - 0.005, side * (toteBulge(x, TOTE_H) + 0.006)));
    }
    const hem = sweep(`toteHem${side}`, scene, path, {
      binormal: new Vector3(0, 1, 0),
      radii: () => [0.016, 0.012],
      ring: 6,
    });
    hem.material = trim;
  }

  // Straps: a stitched tab on each panel and an arch leaning outwards.
  const strapX = 0.56;
  for (const side of [-1, 1] as const) {
    const z = side * (toteBulge(strapX, TOTE_H) + 0.014);
    for (const sx of [-strapX, strapX]) {
      const tab = sweep(
        `toteTab${side}${sx}`,
        scene,
        [new Vector3(sx, TOTE_H - 0.34, z), new Vector3(sx, TOTE_H + 0.002, z)],
        { binormal: new Vector3(0, 0, 1), radii: () => [0.075, 0.012], ring: 8 },
      );
      tab.material = trim;
    }
    const pivot = new TransformNode(`toteStrap${side}`, scene);
    pivot.position.set(0, TOTE_H, z);
    pivot.rotation.x = side * 0.3;
    const arch = sweep(
      `toteArch${side}`,
      scene,
      bezier(
        new Vector3(-strapX, 0, 0),
        new Vector3(-strapX * 1.12, 1.55, 0),
        new Vector3(strapX * 1.12, 1.55, 0),
        new Vector3(strapX, 0, 0),
        segments(ctx, 32, 14),
      ),
      { binormal: new Vector3(0, 0, 1), radii: () => [0.075, 0.012], ring: 8 },
    );
    arch.parent = pivot;
    arch.material = trim;
  }

  const { width: aw, height: ah } = ARTBOARD_SIZES.bag;
  const pw = 1.86;
  const ph = (pw * ah) / aw;
  const centreY = 1.33;
  const printMat = fabric(ctx, "printMat", new Color3(1, 1, 1), {
    width: pw,
    height: ph,
    roughness: 0.9,
    dye: base.toLinearSpace(),
  });
  const print = surfaceGrid(
    "printArea",
    scene,
    segments(ctx, 36, 16),
    segments(ctx, 40, 18),
    (u, v) => {
      const x = (u - 0.5) * pw;
      const y = centreY + (0.5 - v) * ph;
      return [x, y, -toteBulge(x, y) - 0.004];
    },
    [0, 0, -1],
  );
  print.material = printMat;

  return {
    camera: { alpha: -Math.PI / 2 + 0.28, beta: 1.32, radius: 8.6, targetY: 1.95 },
    shadows: [{ shape: "rect", width: 2.6, depth: 0.32, radius: 0.15, strength: 0.65, height: 3 }],
    print: { material: printMat, meshes: [print], configure: alphaPrint(printMat) },
  };
}

function rgbHex(color: Color3, factor: number): string {
  return new Color3(color.r * factor, color.g * factor, color.b * factor).toHexString();
}

/* ------------------------------------------------------------------ */
/* Pillow                                                               */
/* ------------------------------------------------------------------ */

const PILLOW = { size: 2.7, puff: 0.5, lift: 0.1, lean: 0.1 };

/** Point on the pillow surface for s, t ∈ [-1, 1]; side -1 is the front. */
function pillowPoint(s: number, t: number, side: number): [number, number, number] {
  const half = PILLOW.size / 2;
  const fill = Math.pow(Math.max(0, 1 - s * s), 0.78) * Math.pow(Math.max(0, 1 - t * t), 0.78);
  // Edges pull in between the corners, as stuffing does to a sewn square.
  const x = s * half * (1 - 0.085 * (1 - t * t));
  const y = PILLOW.lift + half + t * half * (1 - 0.085 * (1 - s * s)) - 0.06 * fill;
  const crease = 0.012 * Math.sin(6 * (s + t)) * (1 - fill) * fill * 4;
  return [x, y, side * (PILLOW.puff * fill + crease)];
}

export function buildPillow(ctx: ModelContext): ProductModel {
  const { scene } = ctx;
  const base = linear(ctx.tint ?? "#F7F1E8");
  const pillow = new TransformNode("pillow", scene);
  pillow.rotation.x = PILLOW.lean;

  const n = segments(ctx, 56, 22);
  const face = (name: string, side: -1 | 1) =>
    surfaceGrid(
      name,
      scene,
      n,
      n,
      (u, v) => pillowPoint((2 * u - 1) * -side, 1 - 2 * v, side),
      [0, 0, side],
    );

  // The front face is the print surface: plain fabric until a design loads.
  const faceMat = fabric(ctx, "printMat", base.clone(), {
    width: PILLOW.size,
    height: PILLOW.size,
    roughness: 0.8,
  });
  const front = face("pillowFront", -1);
  front.material = faceMat;
  front.parent = pillow;

  const back = face("pillowBack", 1);
  back.material = fabric(ctx, "pillowBackMat", base.clone(), {
    width: PILLOW.size,
    height: PILLOW.size,
    roughness: 0.8,
  });
  back.parent = pillow;

  // Piping along the seam, starting mid-edge so the loop closes on a straight.
  const per = segments(ctx, 36, 14);
  const seam: Vector3[] = [];
  const edges: [number, number, number, number][] = [
    [0, 1, 1, 1],
    [1, 1, 1, -1],
    [1, -1, -1, -1],
    [-1, -1, -1, 1],
    [-1, 1, 0, 1],
  ];
  edges.forEach(([s0, t0, s1, t1], e) => {
    const steps = e === 0 || e === 4 ? per / 2 : per;
    for (let i = 0; i < steps; i++) {
      const k = i / steps;
      seam.push(new Vector3(...pillowPoint(s0 + (s1 - s0) * k, t0 + (t1 - t0) * k, 0)));
    }
  });
  seam.push(seam[0].clone());
  const piping = sweep("piping", scene, seam, {
    binormal: new Vector3(0, 0, 1),
    radii: () => [0.034, 0.034],
    ring: segments(ctx, 10, 6),
  });
  piping.material = surface(ctx, "pipingMat", {
    color: base.scale(0.92),
    roughness: 0.85,
    sheen: base.scale(0.5),
  });
  piping.parent = pillow;

  return {
    camera: { alpha: -Math.PI / 2 + 0.32, beta: 1.36, radius: 6.8, targetY: 1.45 },
    shadows: [{ shape: "ellipse", width: 2.3, depth: 0.7, z: 0.12, strength: 0.6, height: 2.8 }],
    print: { material: faceMat, meshes: [front], alwaysVisible: true, configure: opaquePrint },
  };
}
