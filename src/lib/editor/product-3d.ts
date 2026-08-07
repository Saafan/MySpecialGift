import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { Vector3, Color3, Color4 } from "@babylonjs/core/Maths/math";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { PBRMetallicRoughnessMaterial } from "@babylonjs/core/Materials/PBR/pbrMetallicRoughnessMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { CubeTexture } from "@babylonjs/core/Materials/Textures/cubeTexture";
import { Vector4 } from "@babylonjs/core/Maths/math.vector";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { ImageProcessingConfiguration } from "@babylonjs/core/Materials/imageProcessingConfiguration";
import { Layer } from "@babylonjs/core/Layers/layer";
import earcut from "earcut";

import "@babylonjs/core/Rendering/depthRendererSceneComponent";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import "@babylonjs/core/Cameras/Inputs/arcRotateCameraPointersInput";
import "@babylonjs/core/Cameras/Inputs/arcRotateCameraMouseWheelInput";
import "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader";

import {
  ARTBOARD_SIZES,
  MUG_3D_PRINT,
  mugBandRadii,
  type ProductCategory,
} from "@/lib/geometry";

/**
 * Babylon.js product scene — ported from V1, where it was the most valuable
 * artifact in the repository: four hand-built product meshes with hard-won
 * geometry constants and eleven documented defensive behaviours. Every one of
 * those comments is preserved below; treat all numeric constants as
 * load-bearing (see Docs/invariants.md).
 *
 * The only structural changes from V1: geometry constants are imported from
 * the shared module (one source of truth with the 2D artboard, enforced by a
 * unit test), and the 3D texture assets are compressed WebP.
 */

export type QualityTier = "low" | "high";

export interface ProductSceneOptions {
  category: ProductCategory;
  tier: QualityTier;
  interactive: boolean;
  autoRotate: boolean;
}

export interface ProductSceneHandle {
  setDesignDataUrl: (dataUrl: string | null) => void;
  requestRender: () => void;
  resize: () => void;
  dispose: () => void;
}

interface CameraPreset {
  alpha: number;
  beta: number;
  radius: number;
  targetY: number;
}

const CAMERA_PRESETS: Record<ProductCategory, CameraPreset> = {
  cup: { alpha: -Math.PI / 2.3, beta: 1.12, radius: 5.6, targetY: 0.95 },
  "t-shirt": { alpha: -Math.PI / 2, beta: 0.52, radius: 6.8, targetY: 0.05 },
  sticker: { alpha: -Math.PI / 2, beta: 0.5, radius: 4.6, targetY: 0.02 },
  badge: { alpha: -Math.PI / 2, beta: 0.55, radius: 4.4, targetY: 0.02 },
};

export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/* ------------------------------- mug ------------------------------- */

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

function buildHandlePath(steps: number): Vector3[] {
  const p0 = new Vector3(0.78, 1.62, 0);
  const p1 = new Vector3(1.5, 1.5, 0);
  const p2 = new Vector3(1.5, 0.52, 0);
  const p3 = new Vector3(0.78, 0.48, 0);
  const path: Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    path.push(
      new Vector3(
        mt ** 3 * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t ** 3 * p3.x,
        mt ** 3 * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t ** 3 * p3.y,
        0,
      ),
    );
  }
  return path;
}

function buildMug(scene: Scene, highQuality: boolean, ceramic: PBRMetallicRoughnessMaterial) {
  const body = MeshBuilder.CreateLathe(
    "mugBody",
    {
      shape: buildMugProfile(),
      tessellation: highQuality ? 96 : 40,
      sideOrientation: Mesh.DOUBLESIDE,
    },
    scene,
  );
  body.material = ceramic;

  const handle = MeshBuilder.CreateTube(
    "mugHandle",
    {
      path: buildHandlePath(highQuality ? 48 : 24),
      radius: 0.1,
      tessellation: highQuality ? 20 : 8,
      cap: Mesh.CAP_ALL,
    },
    scene,
  );
  handle.material = ceramic;
  // Centre the handle in the un-printed gap (opposite the front-facing print)
  // so the artwork can wrap nearly all the way around without touching it.
  handle.rotation.y = -Math.PI / 2;

  const decalMat = new PBRMetallicRoughnessMaterial("decalMat", scene);
  decalMat.baseColor = new Color3(1, 1, 1);
  decalMat.metallic = 0;
  decalMat.roughness = 0.34;

  // Print band as a thin truncated cone that follows the mug wall's taper, so
  // the artwork hugs the curved surface instead of floating as an oversized
  // cylinder shell. A tapered cylinder keeps the standard wrap-around UVs.
  const bandBottom = MUG_3D_PRINT.bandBottom;
  const bandTop = MUG_3D_PRINT.bandTop;
  const bandHeight = bandTop - bandBottom;
  // The band radii include a small epsilon so the band clears the body wall's
  // mid-height bulge — without it the body z-fights through the artwork.
  const radii = mugBandRadii();
  // Wrap the artwork around nearly the full circumference, leaving only a gap
  // for the handle (which is centred in that gap).
  //
  // The resulting band aspect ratio (arc length / band height) determines the
  // cup artboard proportions (ARTBOARD_SIZES.cup) so the design maps 1:1 with
  // no stretching — enforced by src/lib/geometry.test.ts.
  const wrap = 1 - MUG_3D_PRINT.handleGapDeg / 360;

  const decal = MeshBuilder.CreateCylinder(
    "printBand",
    {
      height: bandHeight,
      diameterBottom: radii.bottom * 2,
      diameterTop: radii.top * 2,
      arc: wrap,
      tessellation: highQuality ? 96 : 48,
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
  decal.isVisible = false;

  return {
    casters: [body, handle],
    decal,
    decalMat,
    applyTexture: (tex: Texture) => {
      tex.wrapU = Texture.CLAMP_ADDRESSMODE;
      tex.wrapV = Texture.CLAMP_ADDRESSMODE;
      // Mirror horizontally so text reads correctly from outside the cylinder.
      tex.uScale = -1;
      tex.uOffset = 1;
      tex.vScale = -1;
      tex.vOffset = 1;
    },
  };
}

/* ----------------------------- t-shirt ----------------------------- */

// Subtle white cotton weave, generated procedurally.
function createCottonTexture(scene: Scene): DynamicTexture {
  const size = 256;
  const tex = new DynamicTexture("cotton", { width: size, height: size }, scene, true);
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  ctx.fillStyle = "#f4f4f5";
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      const v = 240 + Math.floor(Math.random() * 14);
      const shade = (x + y) % 4 === 0 ? v - 6 : v;
      ctx.fillStyle = `rgb(${shade},${shade},${Math.min(255, shade + 1)})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  tex.update();
  return tex;
}

function buildTShirt(scene: Scene, highQuality: boolean) {
  // Flat-lay tee silhouette in the XoZ plane (+z = collar/top of shirt).
  const outline: Vector3[] = [
    new Vector3(-0.38, 0, 1.4),
    new Vector3(-0.14, 0, 1.27),
    new Vector3(0.14, 0, 1.27),
    new Vector3(0.38, 0, 1.4),
    new Vector3(1.08, 0, 1.18),
    new Vector3(1.48, 0, 0.52),
    new Vector3(0.95, 0, 0.28),
    new Vector3(0.88, 0, -1.42),
    new Vector3(-0.88, 0, -1.42),
    new Vector3(-0.95, 0, 0.28),
    new Vector3(-1.48, 0, 0.52),
    new Vector3(-1.08, 0, 1.18),
  ];

  const fabricTex = createCottonTexture(scene);
  fabricTex.uScale = 4;
  fabricTex.vScale = 4;

  const fabricMat = new PBRMetallicRoughnessMaterial("fabricMat", scene);
  fabricMat.baseTexture = fabricTex;
  fabricMat.metallic = 0;
  fabricMat.roughness = 0.92;

  const shirt = MeshBuilder.ExtrudePolygon(
    "tshirt",
    { shape: outline, depth: 0.14, sideOrientation: Mesh.DOUBLESIDE },
    scene,
    earcut,
  );
  shirt.position.y = 0.14;
  shirt.material = fabricMat;

  // Collar rib: subtle torus at the neckline.
  const collar = MeshBuilder.CreateTorus(
    "collar",
    { diameter: 0.62, thickness: 0.07, tessellation: highQuality ? 48 : 24 },
    scene,
  );
  collar.position.set(0, 0.15, 1.3);
  collar.scaling.z = 0.55;
  collar.material = fabricMat;

  // Chest print area (portrait), floating just above the fabric.
  const { width: aw, height: ah } = ARTBOARD_SIZES["t-shirt"];
  const printW = 1.15;
  const printH = (printW * ah) / aw;
  const decalMat = new PBRMetallicRoughnessMaterial("decalMat", scene);
  decalMat.baseColor = new Color3(1, 1, 1);
  decalMat.metallic = 0;
  decalMat.roughness = 0.9;

  const decal = MeshBuilder.CreateGround("printArea", { width: printW, height: printH }, scene);
  decal.position.set(0, 0.155, 0.1);
  decal.material = decalMat;
  decal.isVisible = false;

  return {
    casters: [shirt, collar],
    decal,
    decalMat,
    applyTexture: (tex: Texture) => {
      tex.wrapU = Texture.CLAMP_ADDRESSMODE;
      tex.wrapV = Texture.CLAMP_ADDRESSMODE;
      // Orient upright for the top-down camera view.
      tex.vScale = -1;
      tex.vOffset = 1;
      tex.hasAlpha = true;
      decalMat.transparencyMode = 2; // alpha blend so transparent areas show fabric
    },
  };
}

/* ----------------------------- sticker ----------------------------- */

function roundedRectOutline(w: number, h: number, r: number, segments: number): Vector3[] {
  const pts: Vector3[] = [];
  const corners: [number, number, number][] = [
    [w / 2 - r, h / 2 - r, 0],
    [-(w / 2 - r), h / 2 - r, Math.PI / 2],
    [-(w / 2 - r), -(h / 2 - r), Math.PI],
    [w / 2 - r, -(h / 2 - r), (3 * Math.PI) / 2],
  ];
  for (const [cx, cz, start] of corners) {
    for (let i = 0; i <= segments; i++) {
      const a = start + (i / segments) * (Math.PI / 2);
      pts.push(new Vector3(cx + r * Math.cos(a), 0, cz + r * Math.sin(a)));
    }
  }
  return pts;
}

function buildSticker(scene: Scene, highQuality: boolean) {
  const outline = roundedRectOutline(2.3, 2.3, 0.28, highQuality ? 8 : 4);

  // Glossy white vinyl base with a slight sheen.
  const vinyl = new PBRMetallicRoughnessMaterial("vinyl", scene);
  vinyl.baseColor = new Color3(0.99, 0.99, 0.99);
  vinyl.metallic = 0;
  vinyl.roughness = 0.25;

  const base = MeshBuilder.ExtrudePolygon(
    "stickerBase",
    { shape: outline, depth: 0.035, sideOrientation: Mesh.DOUBLESIDE },
    scene,
    earcut,
  );
  base.position.y = 0.035;
  base.material = vinyl;

  const decalMat = new PBRMetallicRoughnessMaterial("decalMat", scene);
  decalMat.baseColor = new Color3(1, 1, 1);
  decalMat.metallic = 0;
  decalMat.roughness = 0.28;

  // Design surface with a small white border around it (die-cut look).
  const decal = MeshBuilder.CreateGround("stickerart", { width: 2.08, height: 2.08 }, scene);
  decal.position.y = 0.045;
  decal.material = decalMat;
  decal.isVisible = false;

  return {
    casters: [base],
    decal,
    decalMat,
    applyTexture: (tex: Texture) => {
      tex.wrapU = Texture.CLAMP_ADDRESSMODE;
      tex.wrapV = Texture.CLAMP_ADDRESSMODE;
      tex.vScale = -1;
      tex.vOffset = 1;
    },
  };
}

/* ------------------------------ badge ------------------------------ */

function buildBadge(scene: Scene, highQuality: boolean) {
  const tess = highQuality ? 96 : 48;

  // Face cylinder: design is printed on the top cap (texture circle-cropped).
  const faceUV: Vector4[] = [
    new Vector4(0, 0, 1, 1), // bottom cap
    new Vector4(0, 0, 0.02, 0.02), // tube — tiny corner sample (plain)
    new Vector4(0, 0, 1, 1), // top cap (design)
  ];

  const decalMat = new PBRMetallicRoughnessMaterial("decalMat", scene);
  decalMat.baseColor = new Color3(1, 1, 1);
  decalMat.metallic = 0.05;
  decalMat.roughness = 0.2;

  const face = MeshBuilder.CreateCylinder(
    "badgeFace",
    { diameter: 2.0, height: 0.16, tessellation: tess, faceUV },
    scene,
  );
  face.position.y = 0.16;
  face.material = decalMat;

  // Metallic rim ring.
  const rimMat = new PBRMetallicRoughnessMaterial("rimMat", scene);
  rimMat.baseColor = new Color3(0.85, 0.86, 0.88);
  rimMat.metallic = 0.95;
  rimMat.roughness = 0.25;

  const rim = MeshBuilder.CreateTorus(
    "badgeRim",
    { diameter: 2.0, thickness: 0.12, tessellation: tess },
    scene,
  );
  rim.position.y = 0.2;
  rim.material = rimMat;

  return {
    casters: [face, rim],
    decal: face,
    decalMat,
    applyTexture: (tex: Texture) => {
      tex.wrapU = Texture.CLAMP_ADDRESSMODE;
      tex.wrapV = Texture.CLAMP_ADDRESSMODE;
      // Orient upright for the top-down camera view.
      tex.vScale = -1;
      tex.vOffset = 1;
    },
  };
}

/* ------------------------------ scene ------------------------------ */

export function createProductScene(
  canvas: HTMLCanvasElement,
  options: ProductSceneOptions,
): ProductSceneHandle {
  const { category, tier, interactive, autoRotate } = options;
  const highQuality = tier === "high";

  const engine = new Engine(
    canvas,
    highQuality,
    {
      preserveDrawingBuffer: false,
      stencil: false,
      powerPreference: highQuality ? "high-performance" : "low-power",
      failIfMajorPerformanceCaveat: false,
    },
    true,
  );
  engine.setHardwareScalingLevel(highQuality ? 1 : 1.5);

  const scene = new Scene(engine);
  // Solid studio backdrop — post-processing pipelines don't preserve canvas alpha.
  scene.clearColor = new Color4(0.976, 0.961, 0.93, 1);

  // Photographic backdrop rendered as a full-screen layer behind the product.
  new Layer("backdrop", "/3d/studio-bg.webp", scene, true);
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType =
    ImageProcessingConfiguration.TONEMAPPING_ACES;
  scene.imageProcessingConfiguration.exposure = 1.05;
  scene.imageProcessingConfiguration.contrast = 1.12;

  // Image-based lighting for realistic PBR reflections.
  const envTex = CubeTexture.CreateFromPrefilteredData("/3d/studio.env", scene);
  scene.environmentTexture = envTex;
  scene.environmentIntensity = highQuality ? 0.9 : 0.7;

  const preset = CAMERA_PRESETS[category];
  const camera = new ArcRotateCamera(
    "cam",
    preset.alpha,
    preset.beta,
    preset.radius,
    new Vector3(0, preset.targetY, 0),
    scene,
  );
  camera.minZ = 0.1;
  camera.wheelDeltaPercentage = 0.01;
  if (interactive) {
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = preset.radius * 0.55;
    camera.upperRadiusLimit = preset.radius * 2.2;
    camera.lowerBetaLimit = 0.15;
    camera.upperBetaLimit = Math.PI / 2 - 0.05;
    camera.panningSensibility = 1200;
  }

  const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.4;
  hemi.groundColor = new Color3(0.45, 0.4, 0.34);

  const key = new DirectionalLight("key", new Vector3(-0.55, -1, -0.45), scene);
  key.position = new Vector3(4, 7, 4);
  key.intensity = 1.8;

  const rimLight = new DirectionalLight("rim", new Vector3(0.6, -0.3, 0.5), scene);
  rimLight.intensity = 0.35;
  rimLight.diffuse = new Color3(1, 0.92, 0.82);

  // Shared ceramic material (mug).
  const ceramic = new PBRMetallicRoughnessMaterial("ceramic", scene);
  ceramic.baseColor = new Color3(0.98, 0.98, 0.97);
  ceramic.metallic = 0;
  ceramic.roughness = 0.3;

  // Warm wooden plank table.
  const woodTex = new Texture("/3d/wood-table.webp", scene);
  woodTex.uScale = 1.3;
  woodTex.vScale = 1.3;
  woodTex.anisotropicFilteringLevel = 8;
  const tableMat = new PBRMetallicRoughnessMaterial("tableMat", scene);
  tableMat.baseTexture = woodTex;
  tableMat.baseColor = new Color3(1, 0.98, 0.93);
  tableMat.metallic = 0;
  tableMat.roughness = 0.58;

  const table = MeshBuilder.CreateCylinder(
    "table",
    { height: 0.14, diameter: 9, tessellation: highQuality ? 80 : 40 },
    scene,
  );
  table.position.y = -0.07;
  table.material = tableMat;
  table.receiveShadows = true;

  // Product model
  const product =
    category === "cup"
      ? buildMug(scene, highQuality, ceramic)
      : category === "t-shirt"
        ? buildTShirt(scene, highQuality)
        : category === "sticker"
          ? buildSticker(scene, highQuality)
          : buildBadge(scene, highQuality);

  if (highQuality) {
    const shadowGen = new ShadowGenerator(1024, key);
    shadowGen.useBlurExponentialShadowMap = true;
    shadowGen.blurKernel = 32;
    shadowGen.darkness = 0.5;
    product.casters.forEach((m) => shadowGen.addShadowCaster(m));
  } else {
    const fake = MeshBuilder.CreateDisc(
      "fakeShadow",
      { radius: category === "cup" ? 1.05 : 1.6, tessellation: 24 },
      scene,
    );
    fake.rotation.x = Math.PI / 2;
    fake.position.y = 0.005;
    const fakeMat = new PBRMetallicRoughnessMaterial("fakeShadowMat", scene);
    fakeMat.baseColor = new Color3(0, 0, 0);
    fakeMat.alpha = 0.16;
    fakeMat.roughness = 1;
    fake.material = fakeMat;
  }

  if (highQuality) {
    const pipeline = new DefaultRenderingPipeline("pipeline", true, scene, [camera]);
    pipeline.fxaaEnabled = true;
    pipeline.samples = 4;
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.9;
    pipeline.bloomWeight = 0.1;
    pipeline.bloomScale = 0.5;
  }

  /* design texture */
  let designTexture: Texture | null = null;
  const setDesignDataUrl = (dataUrl: string | null) => {
    if (designTexture) {
      designTexture.dispose();
      designTexture = null;
    }
    if (!dataUrl) {
      if (product.decal.name !== "badgeFace") product.decal.isVisible = false;
      requestRender();
      return;
    }
    const tex = new Texture(
      dataUrl,
      scene,
      false,
      false,
      Texture.TRILINEAR_SAMPLINGMODE,
      () => {
        product.decalMat.baseTexture = tex;
        product.decal.isVisible = true;
        requestRender();
      },
      () => {
        if (product.decal.name !== "badgeFace") product.decal.isVisible = false;
      },
    );
    tex.hasAlpha = true;
    // Sharpen the artwork when the surface is viewed at an angle (e.g. the
    // curved mug band), which otherwise blurs/pixelates the design.
    tex.anisotropicFilteringLevel = 8;
    product.applyTexture(tex);
    designTexture = tex;
  };

  /* render scheduling — on demand, not a continuous loop */
  let running = false;
  let pendingFrames = 0;
  let sceneReady = false;

  scene.executeWhenReady(() => {
    sceneReady = true;
    pendingFrames = Math.max(pendingFrames, 3);
  });

  const loop = () => {
    if (autoRotate) {
      camera.alpha += 0.0045;
      scene.render();
      return;
    }
    // Keep rendering until shaders/textures are compiled, then on demand.
    if (!sceneReady || pendingFrames > 0) {
      if (pendingFrames > 0) pendingFrames -= 1;
      scene.render();
    }
  };

  const start = () => {
    if (running) return;
    running = true;
    engine.runRenderLoop(loop);
  };

  const requestRender = () => {
    pendingFrames = 3;
  };

  if (interactive && !autoRotate) {
    scene.onPointerObservable.add(() => requestRender());
    camera.onViewMatrixChangedObservable.add(() => {
      pendingFrames = 2;
    });
  }

  // Re-render once env/textures finish loading so first frame isn't dark.
  envTex.onLoadObservable.addOnce(() => requestRender());
  woodTex.onLoadObservable.addOnce(() => requestRender());

  const onVisibility = () => {
    if (document.hidden) {
      if (running) {
        engine.stopRenderLoop();
        running = false;
      }
    } else {
      start();
      requestRender();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  start();
  requestRender();

  return {
    setDesignDataUrl,
    requestRender,
    resize: () => {
      engine.resize();
      requestRender();
    },
    dispose: () => {
      document.removeEventListener("visibilitychange", onVisibility);
      engine.stopRenderLoop();
      designTexture?.dispose();
      scene.dispose();
      engine.dispose();
    },
  };
}
