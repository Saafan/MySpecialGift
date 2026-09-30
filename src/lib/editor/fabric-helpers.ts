import { FabricImage, Rect, type Canvas as FabricCanvas, type FabricObject } from "fabric";
import { ensureArtboardAtBack, getArtboardBounds } from "@/lib/editor/artboard";

/**
 * Image loading and object placement helpers, ported from V1 with all four
 * defensive behaviours intact (see Docs/invariants.md):
 *
 * - D-4: SVG sources are rasterised to an offscreen canvas — Fabric's live
 *   canvas often fails to paint vector sources, leaving invisible images.
 * - D-5: `crossOrigin = "anonymous"` on non-same-origin images keeps the
 *   canvas untainted. Removing it breaks export, thumbnails and the entire
 *   3D preview at once with a SecurityError.
 * - D-41: `objectCaching: false` on images so filter changes repaint.
 * - D-42: origin normalisation skips images to avoid double conversion.
 */

export const CENTER_ORIGIN = {
  originX: "center" as const,
  originY: "center" as const,
};

export function normalizeObjectOrigin(obj: FabricObject) {
  if (obj.type === "image") return obj;
  if (obj.originX === "center" && obj.originY === "center") return obj;
  const center = obj.getCenterPoint();
  obj.set({ ...CENTER_ORIGIN, left: center.x, top: center.y });
  obj.setCoords();
  return obj;
}

export function placeAtCenter(obj: FabricObject, centerX: number, centerY: number) {
  obj.set({ ...CENTER_ORIGIN, left: centerX, top: centerY });
  obj.setCoords();
  return obj;
}

async function loadImageSource(url: string): Promise<HTMLImageElement | HTMLCanvasElement> {
  const img = new Image();
  const isSameOrigin =
    typeof window !== "undefined" && url.startsWith(window.location.origin);
  if (!isSameOrigin) img.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });

  const isSvg = url.includes(".svg") || img.src.includes(".svg");
  if (!isSvg) return img;

  // Rasterize SVGs — Fabric's live canvas often fails to paint vector sources.
  const w = img.naturalWidth || 200;
  const h = img.naturalHeight || 200;
  const raster = document.createElement("canvas");
  raster.width = w;
  raster.height = h;
  const ctx = raster.getContext("2d");
  if (ctx) ctx.drawImage(img, 0, 0, w, h);
  return raster;
}

export async function addImageFromUrl(
  canvas: FabricCanvas,
  src: string,
  targetSize = 160,
) {
  const url =
    typeof window !== "undefined" && src.startsWith("/")
      ? `${window.location.origin}${src}`
      : src;

  const source = await loadImageSource(url);
  const naturalW =
    source instanceof HTMLCanvasElement ? source.width : source.naturalWidth || targetSize;
  const naturalH =
    source instanceof HTMLCanvasElement ? source.height : source.naturalHeight || targetSize;
  const scale = Math.min(targetSize / naturalW, targetSize / naturalH);
  const { centerX, centerY } = getArtboardBounds(canvas);

  const fabricImg = new FabricImage(source, {
    ...CENTER_ORIGIN,
    left: centerX,
    top: centerY,
    scaleX: scale,
    scaleY: scale,
    objectCaching: false,
  });
  fabricImg.setCoords();

  canvas.add(fabricImg);
  ensureArtboardAtBack(canvas);
  canvas.setActiveObject(fabricImg);
  canvas.requestRenderAll();
  return fabricImg;
}

/** Place an image covering a box (photo-slot replacement). */
export async function placeImageCovering(
  canvas: FabricCanvas,
  src: string,
  box: { left: number; top: number; width: number; height: number; angle?: number },
) {
  const url =
    typeof window !== "undefined" && src.startsWith("/")
      ? `${window.location.origin}${src}`
      : src;

  const source = await loadImageSource(url);
  const naturalW =
    source instanceof HTMLCanvasElement ? source.width : source.naturalWidth || box.width;
  const naturalH =
    source instanceof HTMLCanvasElement ? source.height : source.naturalHeight || box.height;
  const scale = Math.min(box.width / naturalW, box.height / naturalH);
  const radius = Math.min(14, Math.min(box.width, box.height) * 0.06);

  const fabricImg = new FabricImage(source, {
    ...CENTER_ORIGIN,
    left: box.left,
    top: box.top,
    angle: box.angle ?? 0,
    scaleX: scale,
    scaleY: scale,
    objectCaching: false,
    clipPath: new Rect({
      ...CENTER_ORIGIN,
      width: box.width / scale,
      height: box.height / scale,
      rx: radius / scale,
      ry: radius / scale,
    }),
  });
  fabricImg.setCoords();

  canvas.add(fabricImg);
  ensureArtboardAtBack(canvas);
  canvas.setActiveObject(fabricImg);
  canvas.requestRenderAll();
  return fabricImg;
}

/**
 * Downscale a user file in the browser before upload so full-resolution phone
 * photos never enter the pipeline. V1 embedded originals as base64 in the
 * canvas JSON — one photo could exceed the localStorage quota, balloon the
 * undo stack to hundreds of MB, and hang serialisation.
 */
export async function downscaleImageFile(
  file: File,
  maxDimension = 2000,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));

  if (scale === 1 && file.size < 1_500_000) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const hasAlpha = file.type === "image/png" || file.type === "image/webp";
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, hasAlpha ? "image/png" : "image/jpeg", 0.88),
  );
  return blob ?? file;
}
