import { Rect, Shadow, type Canvas as FabricCanvas, type FabricObject } from "fabric";
import type { ArtboardSize } from "@/lib/geometry";

/**
 * Artboard model, ported from V1 with one structural change: every function
 * takes its inputs explicitly. V1's version imported the Zustand store into
 * this "pure geometry" module, which made three editor libs untestable and
 * hid a real dependency behind a discarded `category` parameter.
 *
 * The artboard is a non-interactive Rect whose bounds ARE the print area and
 * the export crop — what you see is what prints.
 */

export const ARTBOARD_ID = "artboard";

export interface ArtboardBounds {
  left: number;
  top: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export function createArtboard(width: number, height: number): Rect {
  return new Rect({
    id: ARTBOARD_ID,
    left: 0,
    top: 0,
    width,
    height,
    fill: "#ffffff",
    stroke: undefined,
    strokeWidth: 0,
    selectable: false,
    evented: false,
    hoverCursor: "default",
    shadow: new Shadow({ color: "rgba(0,0,0,0.08)", blur: 18, offsetX: 0, offsetY: 6 }),
  });
}

export function getArtboard(canvas: FabricCanvas): FabricObject | undefined {
  return canvas.getObjects().find((obj) => obj.get("id") === ARTBOARD_ID);
}

function rectBounds(obj: FabricObject): ArtboardBounds {
  const width = (obj.width || 0) * (obj.scaleX || 1);
  const height = (obj.height || 0) * (obj.scaleY || 1);
  const left = obj.left || 0;
  const top = obj.top || 0;
  return { left, top, width, height, centerX: left + width / 2, centerY: top + height / 2 };
}

/** Printable region — the artboard itself. */
export function getArtboardBounds(canvas: FabricCanvas): ArtboardBounds {
  const artboard = getArtboard(canvas);
  if (!artboard) {
    return {
      left: 0,
      top: 0,
      width: canvas.getWidth(),
      height: canvas.getHeight(),
      centerX: canvas.getWidth() / 2,
      centerY: canvas.getHeight() / 2,
    };
  }
  return rectBounds(artboard);
}

/**
 * Size the artboard to the product print aspect ratio inside the workspace.
 * Landscape products (mugs) fill the available width; portrait products
 * (t-shirts) fill the available height — the editor matches the 3D print
 * area with no hidden crop region.
 */
export function computeArtboardLayout(
  containerWidth: number,
  containerHeight: number,
  printSize: ArtboardSize,
  margin = 32,
) {
  const aspect = printSize.width / printSize.height;
  const availW = Math.max(1, containerWidth - margin);
  const availH = Math.max(1, containerHeight - margin);

  let width: number;
  let height: number;

  if (aspect >= 1) {
    width = availW;
    height = width / aspect;
    if (height > availH) {
      height = availH;
      width = height * aspect;
    }
  } else {
    height = availH;
    width = height * aspect;
    if (width > availW) {
      width = availW;
      height = width / aspect;
    }
  }

  return {
    left: (containerWidth - width) / 2,
    top: (containerHeight - height) / 2,
    width,
    height,
  };
}

/** Position and size the artboard to the computed print layout. */
export function layoutArtboardInCanvas(canvas: FabricCanvas, printSize: ArtboardSize) {
  const artboard = getArtboard(canvas);
  if (!artboard) return null;

  const layout = computeArtboardLayout(canvas.getWidth(), canvas.getHeight(), printSize);

  artboard.set({
    left: layout.left,
    top: layout.top,
    width: layout.width,
    height: layout.height,
    scaleX: 1,
    scaleY: 1,
  });
  artboard.setCoords();
  canvas.requestRenderAll();
  return layout;
}

export function setArtboardBackground(canvas: FabricCanvas, color: string) {
  const artboard = getArtboard(canvas);
  if (artboard) {
    artboard.set("fill", color);
    canvas.renderAll();
  }
}

/**
 * Keep the artboard behind all content. Without this, Fabric raises freshly
 * added or restored objects and the white artboard covers the design.
 */
export function ensureArtboardAtBack(canvas: FabricCanvas) {
  const artboard = getArtboard(canvas);
  if (artboard) {
    canvas.sendObjectToBack(artboard);
    canvas.requestRenderAll();
  }
}

/** Export exactly the artboard region (the print area) as a data URL. */
export function exportArtboardDataUrl(
  canvas: FabricCanvas,
  options?: {
    multiplier?: number;
    format?: "png" | "jpeg";
    /** Export the default white artboard fill as transparent (unprinted). */
    clearBackground?: boolean;
  },
) {
  const bounds = getArtboardBounds(canvas);
  const artboard = getArtboard(canvas);
  const prevShadow = artboard?.shadow;
  const prevStroke = artboard?.stroke;
  const prevStrokeWidth = artboard?.strokeWidth;
  const prevFill = artboard?.fill;
  const prevBackground = canvas.backgroundColor;
  const clear =
    options?.clearBackground &&
    typeof prevFill === "string" &&
    ["#ffffff", "#fff", "white"].includes(prevFill.toLowerCase());
  // Drop the drop-shadow and any hairline stroke so they cannot bake into the
  // print wrap as a dark rim around the mug.
  artboard?.set({ shadow: null, stroke: undefined, strokeWidth: 0 });
  if (clear) {
    artboard?.set({ fill: "" });
    canvas.backgroundColor = "";
  }
  try {
    return canvas.toDataURL({
      format: options?.format ?? "png",
      quality: options?.format === "jpeg" ? 0.92 : 1,
      multiplier: options?.multiplier ?? 1,
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
    });
  } finally {
    artboard?.set({ shadow: prevShadow, stroke: prevStroke, strokeWidth: prevStrokeWidth });
    if (clear) {
      artboard?.set({ fill: prevFill });
      canvas.backgroundColor = prevBackground;
    }
  }
}
