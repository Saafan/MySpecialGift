import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { Vector3, Color3, Color4 } from "@babylonjs/core/Maths/math";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { PBRMetallicRoughnessMaterial } from "@babylonjs/core/Materials/PBR/pbrMetallicRoughnessMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { CubeTexture } from "@babylonjs/core/Materials/Textures/cubeTexture";
import { ImageProcessingConfiguration } from "@babylonjs/core/Materials/imageProcessingConfiguration";
import { Layer } from "@babylonjs/core/Layers/layer";

import "@babylonjs/core/Cameras/Inputs/arcRotateCameraPointersInput";
import "@babylonjs/core/Cameras/Inputs/arcRotateCameraMouseWheelInput";
import "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader";

import type { ProductCategory } from "@/lib/geometry";
import {
  buildContactShadows,
  buildProductModel,
  type QualityTier,
} from "@/lib/editor/product-models";

/**
 * Babylon.js product scene. The product meshes live in
 * `src/lib/editor/product-models/` — one procedural model per product, no
 * downloads. This file owns the studio: engine, lighting, table, backdrop,
 * the design texture and on-demand rendering (see Docs/invariants.md).
 *
 * Performance budget: no post-processing and no shadow maps. Anti-aliasing is
 * the GPU's native MSAA, shadows are painted once into small textures, world
 * matrices and materials are frozen once ready, and frames render only when
 * something changes.
 */

export type { QualityTier };

export interface ProductSceneOptions {
  category: ProductCategory;
  /** Picks the exact model within a category (the glass mug). */
  productSlug?: string;
  /** Product colour option as a hex string (thermal bottle finish). */
  tint?: string;
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

export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

const STUDIO_PHOTO_ASPECT = 1536 / 1024;

/**
 * Crop the studio photo so it fills the view without stretching, and without
 * sitting in the world. A mesh behind the product turns into a card as soon
 * as the camera orbits: its edges swing through the frame. A background layer
 * is glued to the screen, so the plant stays put and upright.
 * The plant is on the left of the picture, so a horizontal crop keeps that side.
 */
function frameStudioPhoto(texture: Texture, canvas: HTMLCanvasElement): void {
  const viewAspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
  if (viewAspect >= STUDIO_PHOTO_ASPECT) {
    const vSpan = STUDIO_PHOTO_ASPECT / viewAspect;
    texture.uScale = 1;
    texture.uOffset = 0;
    texture.vScale = vSpan;
    texture.vOffset = (1 - vSpan) * 0.35;
  } else {
    const uSpan = viewAspect / STUDIO_PHOTO_ASPECT;
    texture.uScale = uSpan;
    texture.uOffset = 0;
    texture.vScale = 1;
    texture.vOffset = 0;
  }
}

function buildStudioBackdrop(scene: Scene, canvas: HTMLCanvasElement): Texture {
  const layer = new Layer("backdrop", "/3d/studio-bg.webp", scene, true);
  const texture = layer.texture as Texture;
  texture.wrapU = Texture.CLAMP_ADDRESSMODE;
  texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  texture.anisotropicFilteringLevel = 4;
  frameStudioPhoto(texture, canvas);
  return texture;
}

/** GPU pixels per CSS pixel. MSAA keeps edges clean, so 2× is plenty. */
function pixelRatioCap(tier: QualityTier): number {
  return tier === "high" ? 2 : tier === "medium" ? 1.75 : 1.25;
}

/* ------------------------------ scene ------------------------------ */

export function createProductScene(
  canvas: HTMLCanvasElement,
  options: ProductSceneOptions,
): ProductSceneHandle {
  const { category, productSlug, tint, tier, interactive, autoRotate } = options;
  const highQuality = tier === "high";
  const detailed = tier !== "low";

  const engine = new Engine(
    canvas,
    true,
    {
      preserveDrawingBuffer: false,
      stencil: false,
      powerPreference: highQuality ? "high-performance" : "default",
      failIfMajorPerformanceCaveat: false,
    },
    true,
  );
  // The scaling level is absolute: render size = CSS size / level. Render at
  // the screen's density (often 3 on phones) up to the tier's cap.
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  engine.setHardwareScalingLevel(1 / Math.min(dpr, pixelRatioCap(tier)));

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.976, 0.961, 0.93, 1);
  scene.skipPointerMovePicking = true;

  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType =
    ImageProcessingConfiguration.TONEMAPPING_ACES;
  scene.imageProcessingConfiguration.exposure = 1.05;
  scene.imageProcessingConfiguration.contrast = 1.12;

  // Image-based lighting does the soft fill and every reflection; one key
  // light from the front-left adds direction and highlights.
  const envTex = CubeTexture.CreateFromPrefilteredData("/3d/studio.env", scene);
  scene.environmentTexture = envTex;
  scene.environmentIntensity = highQuality ? 0.95 : detailed ? 0.9 : 0.85;

  const key = new DirectionalLight("key", new Vector3(0.5, -1, 0.55), scene);
  key.intensity = 2.1;
  key.diffuse = new Color3(1, 0.97, 0.92);

  // One continuous plank photo on the round top. wood-table.webp is 1024×683
  // and does not tile — repeating it (the old uScale/vScale of 1.3) cut a
  // hard seam across the right side of the table. Crop the wide image down
  // to a square texel footprint so the planks keep their proportions.
  const woodTex = new Texture("/3d/wood-table.webp", scene);
  woodTex.wrapU = Texture.CLAMP_ADDRESSMODE;
  woodTex.wrapV = Texture.CLAMP_ADDRESSMODE;
  const woodUSpan = 683 / 1024;
  woodTex.uScale = woodUSpan;
  woodTex.uOffset = (1 - woodUSpan) / 2;
  woodTex.anisotropicFilteringLevel = detailed ? 16 : 4;
  const tableMat = new PBRMetallicRoughnessMaterial("tableMat", scene);
  tableMat.baseTexture = woodTex;
  tableMat.baseColor = new Color3(1, 0.98, 0.93);
  tableMat.metallic = 0;
  tableMat.roughness = 0.58;

  const tableTop = MeshBuilder.CreateDisc(
    "tableTop",
    {
      radius: 4.5,
      tessellation: detailed ? 64 : 40,
      sideOrientation: Mesh.DOUBLESIDE,
    },
    scene,
  );
  // Disc is built in XY. Tip it flat; doubleside keeps the top visible
  // whichever way the normal ends up pointing.
  tableTop.rotation.x = -Math.PI / 2;
  tableTop.material = tableMat;

  const rimMat = new PBRMetallicRoughnessMaterial("tableRim", scene);
  rimMat.baseColor = new Color3(0.24, 0.13, 0.07);
  rimMat.metallic = 0;
  rimMat.roughness = 0.72;
  const tableRim = MeshBuilder.CreateCylinder(
    "tableRim",
    {
      height: 0.14,
      diameter: 9,
      tessellation: detailed ? 64 : 40,
      cap: Mesh.NO_CAP,
    },
    scene,
  );
  tableRim.position.y = -0.07;
  tableRim.material = rimMat;

  const model = buildProductModel({ scene, tier, tint }, category, productSlug);
  buildContactShadows(scene, model.shadows);

  const preset = model.camera;
  const camera = new ArcRotateCamera(
    "cam",
    preset.alpha,
    preset.beta,
    preset.radius,
    new Vector3(0, preset.targetY, 0),
    scene,
  );
  camera.minZ = 0.1;
  camera.maxZ = 80;
  camera.wheelDeltaPercentage = 0.01;
  if (interactive) {
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = preset.radius * 0.55;
    camera.upperRadiusLimit = preset.radius * 2.2;
    camera.lowerBetaLimit = 0.15;
    camera.upperBetaLimit = Math.PI / 2 - 0.05;
    camera.panningSensibility = 1200;
  }

  // Screen-space photo, so orbiting the product never swings the background.
  const backdropTex = buildStudioBackdrop(scene, canvas);

  // Nothing in the studio moves; only the camera does.
  for (const mesh of scene.meshes) {
    mesh.isPickable = false;
    mesh.freezeWorldMatrix();
    mesh.doNotSyncBoundingInfo = true;
  }

  /* design texture */
  const print = model.print;
  const blankColor = print.material.albedoColor.clone();
  const showPrint = (hasDesign: boolean) => {
    for (const mesh of print.meshes) mesh.isVisible = hasDesign || !!print.alwaysVisible;
  };
  showPrint(false);

  let designTexture: Texture | null = null;
  let designRequest = 0;
  const setDesignDataUrl = (dataUrl: string | null) => {
    const request = ++designRequest;
    if (!dataUrl) {
      print.material.albedoTexture = null;
      print.material.albedoColor = blankColor.clone();
      designTexture?.dispose();
      designTexture = null;
      showPrint(false);
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
        // A newer design arrived while this one decoded.
        if (request !== designRequest) {
          tex.dispose();
          return;
        }
        // Swap only once the new image is ready, so the print never blinks.
        print.material.albedoTexture = tex;
        print.material.albedoColor = new Color3(1, 1, 1);
        designTexture?.dispose();
        designTexture = tex;
        showPrint(true);
        requestRender();
      },
      () => {
        tex.dispose();
      },
    );
    tex.hasAlpha = true;
    // Sharpen the artwork when the surface is viewed at an angle (e.g. the
    // curved mug band), which otherwise blurs/pixelates the design.
    tex.anisotropicFilteringLevel = 8;
    print.configure(tex);
  };

  /* render scheduling — on demand, not a continuous loop */
  let running = false;
  let pendingFrames = 0;
  let sceneReady = false;

  scene.executeWhenReady(() => {
    sceneReady = true;
    pendingFrames = Math.max(pendingFrames, 3);
    // Everything but the print is final now; frozen materials skip the
    // per-frame dirty checks.
    for (const material of scene.materials) {
      if (material !== print.material) material.freeze();
    }
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
  backdropTex.onLoadObservable.addOnce(() => requestRender());

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
      frameStudioPhoto(backdropTex, canvas);
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
