import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";

import { BOTTLE_3D, GLASS_3D, MUG_3D_PRINT, mugBandRadii, wrapBandHeight } from "@/lib/geometry";
import {
  alphaPrint,
  bambooTexture,
  bezier,
  glass,
  linear,
  printMaterial,
  segments,
  surface,
  sweep,
  wrapBand,
  type ModelContext,
  type ProductModel,
} from "./kit";

function lathe(ctx: ModelContext, name: string, coords: [number, number][], tessellation: number): Mesh {
  return MeshBuilder.CreateLathe(
    name,
    {
      shape: coords.map(([r, y]) => new Vector3(r, y, 0)),
      tessellation,
      sideOrientation: Mesh.FRONTSIDE,
    },
    ctx.scene,
  );
}

/** Lathes don't promise a winding, so light both sides correctly instead. */
function twoSided(material: PBRMaterial): PBRMaterial {
  material.backFaceCulling = false;
  material.twoSidedLighting = true;
  return material;
}

/* ------------------------------------------------------------------ */
/* Ceramic mug                                                          */
/* ------------------------------------------------------------------ */

// Must stay consistent with MUG_WALL_CONTROL in src/lib/geometry.ts.
function buildMugProfile(): Vector3[] {
  const coords: [number, number][] = [
    [0.0, 0.0],
    [0.78, 0.0],
    [0.8, 0.06],
    [0.845, 1.0],
    [0.87, 1.95],
    [0.875, 2.02],
    [0.85, 2.05],
    [0.81, 2.04],
    [0.78, 1.9],
    [0.74, 0.12],
    [0.7, 0.1],
    [0.0, 0.1],
  ];
  return coords.map(([x, y]) => new Vector3(x, y, 0));
}

export function buildMug(ctx: ModelContext): ProductModel {
  const { scene } = ctx;
  const glaze = surface(ctx, "glaze", {
    color: new Color3(0.94, 0.93, 0.9),
    roughness: 0.24,
    clearCoat: 0.04,
  });

  const body = MeshBuilder.CreateLathe(
    "mugBody",
    { shape: buildMugProfile(), tessellation: segments(ctx, 96, 36), sideOrientation: Mesh.DOUBLESIDE },
    scene,
  );
  body.material = glaze;

  // D-shaped handle with an oval grip: wider front-to-back than it is thick,
  // which is what makes a real mug handle read as ceramic rather than wire.
  // Both ends sink into the wall so no caps are needed.
  const handlePath = bezier(
    new Vector3(0.78, 1.66, 0),
    new Vector3(1.56, 1.6, 0),
    new Vector3(1.52, 0.5, 0),
    new Vector3(0.78, 0.46, 0),
    segments(ctx, 40, 16),
  );
  const handle = sweep("mugHandle", scene, handlePath, {
    binormal: new Vector3(0, 0, 1),
    radii: (t) => {
      const swell = 1 + 0.12 * Math.sin(Math.PI * t);
      return [0.075 * swell, 0.125 * swell];
    },
    ring: segments(ctx, 20, 8),
  });
  handle.material = glaze;
  // Centre the handle in the un-printed gap (opposite the front-facing print)
  // so the artwork can wrap nearly all the way around without touching it.
  handle.rotation.y = -Math.PI / 2;

  // The print sits under the glaze, so it shares the glaze's gloss.
  const decalMat = printMaterial(ctx, { roughness: 0.24, clearCoat: 0.04 });

  // Print band as a thin truncated cone that follows the mug wall's taper, so
  // the artwork hugs the curved surface instead of floating as an oversized
  // cylinder shell. A tapered cylinder keeps the standard wrap-around UVs.
  const bandBottom = MUG_3D_PRINT.bandBottom;
  const bandTop = MUG_3D_PRINT.bandTop;
  // The band radii include a small epsilon so the band clears the body wall's
  // mid-height bulge — without it the body z-fights through the artwork.
  const radii = mugBandRadii();
  // Wrap the artwork around the mug until just before the handle (centred
  // in the remaining gap). See MUG_3D_PRINT.handleGapDeg.
  //
  // The resulting band aspect ratio (arc length / band height) determines the
  // cup artboard proportions (ARTBOARD_SIZES.cup) so the design maps 1:1 with
  // no stretching — enforced by src/lib/geometry.test.ts.
  const wrap = 1 - MUG_3D_PRINT.handleGapDeg / 360;
  const decal = MeshBuilder.CreateCylinder(
    "printBand",
    {
      height: bandTop - bandBottom,
      diameterBottom: radii.bottom * 2,
      diameterTop: radii.top * 2,
      arc: wrap,
      tessellation: segments(ctx, 96, 48),
      cap: Mesh.NO_CAP,
      sideOrientation: Mesh.FRONTSIDE,
    },
    scene,
  );
  decal.position.y = (bandBottom + bandTop) / 2;
  // Centre the printed arc on the camera-facing side of the mug, opposite the
  // handle so the design never wraps onto it.
  decal.rotation.y = Math.PI / 2 - wrap * Math.PI;
  decal.material = decalMat;

  return {
    camera: { alpha: -Math.PI / 2.3, beta: 1.12, radius: 5.6, targetY: 0.98 },
    shadows: [{ shape: "ellipse", width: 1.58, depth: 1.58, strength: 0.7, height: 2.05 }],
    print: {
      material: decalMat,
      meshes: [decal],
      configure: (tex: Texture) => {
        tex.wrapU = Texture.CLAMP_ADDRESSMODE;
        tex.wrapV = Texture.CLAMP_ADDRESSMODE;
        // Opaque wrap — PNG edge alpha otherwise bilinear-filters to black and
        // draws a hairline around the print band.
        tex.hasAlpha = false;
        decalMat.transparencyMode = 0;
        // Mirror horizontally so text reads correctly from outside the cylinder.
        tex.uScale = -1;
        tex.uOffset = 1;
        tex.vScale = -1;
        tex.vOffset = 1;
      },
    },
  };
}

/* ------------------------------------------------------------------ */
/* Round glass mug with bamboo lid and glass straw                      */
/* ------------------------------------------------------------------ */

export function buildGlassMug(ctx: ModelContext): ProductModel {
  const { scene } = ctx;
  const { radius, height } = GLASS_3D;
  const tess = segments(ctx, 72, 32);
  const wall = 0.045;
  const floor = 0.24;

  // Iced latte first: the glass is drawn over it, so it needs to be opaque.
  // Iced latte: milk settles at the bottom, espresso floats on top, and the
  // wall needs enough rings for the vertex colours to blend between them.
  const liquidTop = 1.86;
  const liquidR = radius - wall - 0.004;
  const wallRings: [number, number][] = [];
  for (let y = floor + 0.03; y < liquidTop; y += 0.07) wallRings.push([liquidR, y]);
  const liquid = lathe(
    ctx,
    "latte",
    [
      [0, floor + 0.002],
      [liquidR - 0.021, floor + 0.002],
      ...wallRings,
      [liquidR, liquidTop],
      [0, liquidTop],
    ],
    tess,
  );
  const milk = linear("#f1e8da");
  const caramel = linear("#c8915d");
  const espresso = linear("#6e3f1f");
  const crema = linear("#b98352");
  const positions = liquid.getVerticesData("position") ?? [];
  const colors: number[] = [];
  const smooth = (a: number, b: number, y: number) => {
    const t = Math.min(1, Math.max(0, (y - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  for (let i = 0; i < positions.length; i += 3) {
    const y = positions[i + 1];
    const c =
      y >= liquidTop - 0.001
        ? crema
        : Color3.Lerp(Color3.Lerp(milk, caramel, smooth(0.95, 1.4, y)), espresso, smooth(1.35, 1.8, y));
    colors.push(c.r, c.g, c.b, 1);
  }
  liquid.setVerticesData("color", colors);
  liquid.material = twoSided(
    surface(ctx, "latteMat", { color: new Color3(1, 1, 1), roughness: 0.32 }),
  );

  const lidBottom = height - 0.06;
  const ring = MeshBuilder.CreateCylinder(
    "lidSeal",
    { diameter: (radius - wall + 0.004) * 2, height: 0.09, tessellation: tess, cap: Mesh.NO_CAP },
    scene,
  );
  ring.position.y = lidBottom + 0.03;
  ring.material = surface(ctx, "silicone", { color: linear("#d9d6cf"), roughness: 0.65 });

  const bamboo = surface(ctx, "bambooMat", { color: new Color3(1, 1, 1), roughness: 0.5, clearCoat: 0.3 });
  bamboo.albedoTexture = bambooTexture(ctx);
  const lid = MeshBuilder.CreateCylinder(
    "lid",
    { diameter: (radius + 0.012) * 2, height: 0.13, tessellation: tess },
    scene,
  );
  lid.position.y = height + 0.04;
  lid.material = bamboo;

  // Glass straw through a silicone grommet, leaning back and to the right.
  const strawTilt = 0.09;
  const strawFoot = new Vector3(0.22, floor + 0.05, 0.16);
  const strawLength = 3.35;
  const straw = MeshBuilder.CreateCylinder(
    "straw",
    { diameter: 0.1, height: strawLength, tessellation: segments(ctx, 20, 10), cap: Mesh.NO_CAP },
    scene,
  );
  straw.rotation.z = -strawTilt;
  straw.position = strawFoot.add(
    new Vector3(Math.sin(strawTilt) * (strawLength / 2), Math.cos(strawTilt) * (strawLength / 2), 0),
  );
  const grommetY = lid.position.y + 0.07;
  const grommet = MeshBuilder.CreateTorus(
    "grommet",
    { diameter: 0.15, thickness: 0.05, tessellation: segments(ctx, 24, 12) },
    scene,
  );
  grommet.position.set(strawFoot.x + Math.tan(strawTilt) * (grommetY - strawFoot.y), grommetY, strawFoot.z);
  grommet.material = surface(ctx, "grommetMat", { color: linear("#3b3a38"), roughness: 0.6 });

  // Thick-bottomed glass: outer wall, rounded rim, inner wall, heavy floor.
  const body = lathe(
    ctx,
    "glassBody",
    [
      [0, 0],
      [radius - 0.08, 0],
      [radius - 0.02, 0.02],
      [radius, 0.08],
      [radius, height - 0.02],
      [radius - 0.012, height],
      [radius - wall + 0.01, height],
      [radius - wall, height - 0.02],
      [radius - wall, floor + 0.04],
      [radius - wall - 0.04, floor],
      [0, floor],
    ],
    tess,
  );
  const glassMat = glass(ctx, "glass");
  body.material = glassMat;
  const strawMat = glass(ctx, "strawGlass", "#eef6f4", 0.28);
  straw.material = strawMat;

  const bandRadius = radius + GLASS_3D.bandEps;
  const bandHeight = wrapBandHeight(bandRadius);
  const band = wrapBand("printBand", scene, {
    radius: bandRadius,
    yBottom: GLASS_3D.bandCenter - bandHeight / 2,
    yTop: GLASS_3D.bandCenter + bandHeight / 2,
    wrap: 1,
    segments: tess,
  });
  const decalMat = printMaterial(ctx, { roughness: 0.08 });
  // Seen through the glass from the front, the far half of the wrap shows
  // mirrored, like a real printed glass.
  decalMat.backFaceCulling = false;
  decalMat.twoSidedLighting = true;
  band.material = decalMat;

  // Transparent draw order: glass, then the print on its surface, then straw.
  body.alphaIndex = 0;
  band.alphaIndex = 1;
  straw.alphaIndex = 2;

  return {
    camera: { alpha: -Math.PI / 2.3, beta: 1.2, radius: 6.4, targetY: 1.3 },
    shadows: [{ shape: "ellipse", width: radius * 1.9, depth: radius * 1.9, strength: 0.5, height: 2.6 }],
    print: { material: decalMat, meshes: [band], configure: alphaPrint(decalMat) },
  };
}

/* ------------------------------------------------------------------ */
/* Thermal bottle                                                       */
/* ------------------------------------------------------------------ */

export function buildThermalBottle(ctx: ModelContext): ProductModel {
  const { scene } = ctx;
  const { radius, shoulder } = BOTTLE_3D;
  const tess = segments(ctx, 72, 32);

  // Powder coat: soft satin, never a perfect white or black so PBR keeps detail.
  const base = Color3.FromHexString(ctx.tint ?? "#1F2937");
  const clamped = new Color3(
    Math.min(0.92, Math.max(0.06, base.r)),
    Math.min(0.92, Math.max(0.06, base.g)),
    Math.min(0.92, Math.max(0.06, base.b)),
  ).toLinearSpace();
  const coat = twoSided(surface(ctx, "powderCoat", { color: clamped, roughness: 0.52 }));

  const neckR = 0.42;
  const body = lathe(
    ctx,
    "bottleBody",
    [
      [0, 0],
      [radius - 0.1, 0],
      [radius - 0.03, 0.025],
      [radius, 0.1],
      [radius, shoulder],
      [radius - 0.008, shoulder + 0.12],
      [radius - 0.035, shoulder + 0.23],
      [radius - 0.09, shoulder + 0.33],
      [neckR + 0.06, shoulder + 0.42],
      [neckR + 0.01, shoulder + 0.47],
      [neckR, shoulder + 0.5],
      [neckR, shoulder + 0.56],
      [0, shoulder + 0.56],
    ],
    tess,
  );
  body.material = coat;

  const steel = surface(ctx, "brushedSteel", {
    color: new Color3(0.82, 0.83, 0.85),
    metallic: 1,
    roughness: 0.3,
  });
  const collar = MeshBuilder.CreateCylinder(
    "collar",
    { diameter: (neckR + 0.012) * 2, height: 0.1, tessellation: tess },
    scene,
  );
  collar.position.y = shoulder + 0.6;
  collar.material = steel;

  const capBottom = shoulder + 0.65;
  const cap = lathe(
    ctx,
    "cap",
    [
      [0, capBottom],
      [neckR + 0.02, capBottom],
      [neckR + 0.035, capBottom + 0.03],
      [neckR + 0.035, capBottom + 0.5],
      [neckR + 0.01, capBottom + 0.57],
      [neckR - 0.06, capBottom + 0.6],
      [0, capBottom + 0.6],
    ],
    tess,
  );
  cap.material = coat;

  const loopPath = bezier(
    new Vector3(-0.22, capBottom + 0.56, 0),
    new Vector3(-0.24, capBottom + 0.98, 0),
    new Vector3(0.24, capBottom + 0.98, 0),
    new Vector3(0.22, capBottom + 0.56, 0),
    segments(ctx, 28, 12),
  );
  const loop = sweep("capLoop", scene, loopPath, {
    binormal: new Vector3(0, 0, 1),
    radii: () => [0.055, 0.1],
    ring: segments(ctx, 14, 8),
  });
  loop.material = coat;

  const bandRadius = radius + BOTTLE_3D.bandEps;
  const bandHeight = wrapBandHeight(bandRadius);
  const band = wrapBand("printBand", scene, {
    radius: bandRadius,
    yBottom: BOTTLE_3D.bandCenter - bandHeight / 2,
    yTop: BOTTLE_3D.bandCenter + bandHeight / 2,
    wrap: 1,
    segments: tess,
  });
  const decalMat = printMaterial(ctx, { roughness: 0.48 });
  band.material = decalMat;

  return {
    camera: { alpha: -Math.PI / 2.25, beta: 1.22, radius: 8.2, targetY: 2.15 },
    shadows: [{ shape: "ellipse", width: radius * 1.9, depth: radius * 1.9, strength: 0.7, height: 4.6 }],
    print: { material: decalMat, meshes: [band], configure: alphaPrint(decalMat) },
  };
}
