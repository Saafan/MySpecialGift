import { Point, type Canvas } from "fabric";

/**
 * Zoom bounds — defined once. V1 duplicated [0.25, 3] in two files
 * (editor-store.ts and canvas-viewport.ts) that could silently drift.
 */
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 3;

export function clampZoom(zoom: number) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
}

export function applyCanvasZoom(canvas: Canvas, zoom: number) {
  const clamped = clampZoom(zoom);
  const center = new Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
  canvas.zoomToPoint(center, clamped);
  clampCanvasPan(canvas);
  canvas.requestRenderAll();
  return clamped;
}

export function clampCanvasPan(canvas: Canvas) {
  const zoom = canvas.getZoom();
  const vpt = canvas.viewportTransform;
  if (!vpt) return;

  const width = canvas.getWidth();
  const height = canvas.getHeight();
  // Photoshop-like: allow panning the artboard well beyond the viewport edges.
  const maxX = width * zoom;
  const maxY = height * zoom;

  vpt[4] = Math.min(maxX, Math.max(-maxX, vpt[4]));
  vpt[5] = Math.min(maxY, Math.max(-maxY, vpt[5]));
  canvas.setViewportTransform(vpt);
}

export function resetCanvasViewport(canvas: Canvas) {
  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  canvas.requestRenderAll();
}

export function panCanvasViewport(canvas: Canvas, deltaX: number, deltaY: number) {
  const vpt = canvas.viewportTransform;
  if (!vpt) return;

  vpt[4] += deltaX;
  vpt[5] += deltaY;
  clampCanvasPan(canvas);
  canvas.setViewportTransform(vpt);
  canvas.requestRenderAll();
}
