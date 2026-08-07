"use client";

import { useEffect, useRef } from "react";
import { ActiveSelection, Canvas, FabricObject, IText } from "fabric";
import { toast } from "sonner";
import type { ArtboardSize, ProductCategory } from "@/lib/geometry";
import {
  applyCanvasZoom,
  clampZoom,
  panCanvasViewport,
  resetCanvasViewport,
} from "@/lib/editor/viewport";
import {
  ARTBOARD_ID,
  createArtboard,
  ensureArtboardAtBack,
  getArtboard,
  getArtboardBounds,
  layoutArtboardInCanvas,
} from "@/lib/editor/artboard";
import { normalizeObjectOrigin } from "@/lib/editor/fabric-helpers";
import { applyTemplate } from "@/lib/editor/template-builders";
import type { DesignPayload } from "@/lib/editor/design-io";
import { useEditorStore } from "@/store/editor-store";
import { pushHistoryNow, schedulePushHistory } from "@/hooks/use-fabric-mutation";

// Fabric does not serialize `selectable`/`evented` by default — persist them so
// the artboard and locked layers stay non-interactive after undo/save/load
// (V1 defensive item D-1). `shapeName` keeps human-readable layer names for
// Path-based shapes (Star/Heart/Arrow) across serialisation.
FabricObject.customProperties = ["id", "selectable", "evented", "shapeName"];

export interface FabricCanvasConfig {
  category: ProductCategory;
  initialPayload: DesignPayload | null;
  templateId: string | null;
}

/**
 * Rescale content proportionally when the artboard layout changes (viewport
 * resize or print-size change) — ported from V1's syncArtboardLayout.
 */
function relayoutWithContent(canvas: Canvas, printSize: ArtboardSize) {
  const oldBounds = getArtboardBounds(canvas);
  layoutArtboardInCanvas(canvas, printSize);
  const newBounds = getArtboardBounds(canvas);

  if (oldBounds.width > 0 && oldBounds.height > 0) {
    const sx = newBounds.width / oldBounds.width;
    const sy = newBounds.height / oldBounds.height;
    if (Math.abs(sx - 1) > 0.01 || Math.abs(sy - 1) > 0.01) {
      canvas.getObjects().forEach((obj) => {
        if (obj.get("id") === ARTBOARD_ID) return;
        const ox = (obj.left || 0) - oldBounds.left;
        const oy = (obj.top || 0) - oldBounds.top;
        obj.set({
          left: newBounds.left + ox * sx,
          top: newBounds.top + oy * sy,
          scaleX: (obj.scaleX || 1) * sx,
          scaleY: (obj.scaleY || 1) * sy,
        });
        obj.setCoords();
      });
    }
  }

  resetCanvasViewport(canvas);
  useEditorStore.getState().setZoom(1);
  canvas.requestRenderAll();
}

export function useFabricCanvas(
  canvasElRef: React.RefObject<HTMLCanvasElement | null>,
  containerRef: React.RefObject<HTMLDivElement | null>,
  config: FabricCanvasConfig,
) {
  const fabricRef = useRef<Canvas | null>(null);
  const spaceHeldRef = useRef(false);

  /* ------------------------- create / destroy ------------------------- */
  useEffect(() => {
    const container = containerRef.current;
    const canvasEl = canvasElRef.current;
    if (!container || !canvasEl) return;

    let disposed = false;
    let canvas: Canvas | null = null;
    let cleanupInteractions: (() => void) | null = null;

    // Initialise as soon as the container has real dimensions. V1 used a
    // 100ms timer and silently never initialised if layout wasn't done yet;
    // the observer makes the "container is laid out" signal explicit.
    const initObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || disposed || fabricRef.current) return;
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) return;
      initObserver.disconnect();
      canvas = initialise(width, height);
    });
    initObserver.observe(container);

    function initialise(width: number, height: number): Canvas {
      const store = useEditorStore.getState();
      const created = new Canvas(canvasEl!, {
        width,
        height,
        backgroundColor: "#ece7dd",
        selection: true,
        preserveObjectStacking: true, // keep z-order stable when selecting (D-39)
      });
      fabricRef.current = created;

      created.add(createArtboard(100, 100));
      layoutArtboardInCanvas(created, store.printSize);

      cleanupInteractions = registerInteractions(created, container!);
      registerCanvasEvents(created);

      useEditorStore.getState().setCanvas(created);

      void loadInitialContent(created);
      return created;
    }

    async function loadInitialContent(target: Canvas) {
      const store = useEditorStore.getState();

      if (config.initialPayload) {
        try {
          await target.loadFromJSON(config.initialPayload.canvas as object);
          // Reattach: the artboard came from the payload, or add a fresh one.
          if (!getArtboard(target)) target.add(createArtboard(100, 100));
          ensureArtboardAtBack(target);
          relayoutWithContent(target, config.initialPayload.printSize);
        } catch {
          toast.error("This design could not be restored — starting fresh.");
        }
      } else if (config.templateId) {
        const background = applyTemplate(target, config.templateId);
        if (background) {
          store.setBackgroundColor(background);
          store.setActiveTemplate(config.templateId);
        }
      }

      syncBackgroundFromArtboard(target);
      target.renderAll();
      useEditorStore.getState().resetHistory(JSON.stringify(target.toJSON()));
      useEditorStore.getState().markClean();
    }

    return () => {
      disposed = true;
      initObserver.disconnect();
      cleanupInteractions?.();
      const store = useEditorStore.getState();
      // Release the canvas from the store — V1 kept a reference to the
      // disposed instance (plus 50 history snapshots) alive after unmount.
      store.setCanvas(null);
      store.resetHistory("");
      canvas?.dispose();
      fabricRef.current = null;
    };
    // The editor is remounted per design/product route; config is stable for a mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----------------------- store-driven effects ----------------------- */
  useEffect(() => {
    const unsubscribe = useEditorStore.subscribe((state, prev) => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      if (state.zoom !== prev.zoom) {
        applyCanvasZoom(canvas, state.zoom);
      }

      if (state.tool !== prev.tool) {
        applyInteractionMode(canvas, state.tool === "pan");
      }

      if (
        state.printSize.width !== prev.printSize.width ||
        state.printSize.height !== prev.printSize.height
      ) {
        relayoutWithContent(canvas, state.printSize);
        schedulePushHistory(canvas);
      }
    });
    return unsubscribe;
    // applyInteractionMode only touches refs and its arguments; recreating the
    // subscription per render would churn the store listener for no benefit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------- helpers --------------------------- */

  function syncBackgroundFromArtboard(canvas: Canvas) {
    const fill = getArtboard(canvas)?.get("fill");
    if (typeof fill === "string") {
      useEditorStore.getState().setBackgroundColor(fill);
    }
  }

  function applyInteractionMode(canvas: Canvas, panMode: boolean) {
    canvas.selection = !panMode;
    canvas.skipTargetFind = panMode;
    canvas.defaultCursor = panMode ? "grab" : "default";
    canvas.hoverCursor = panMode ? "grab" : "move";
    const container = containerRef.current;
    if (container) container.style.cursor = panMode ? "grab" : "default";
  }

  function registerCanvasEvents(canvas: Canvas) {
    // Centre snapping against the artboard (10px threshold).
    canvas.on("object:moving", (e) => {
      const obj = e.target;
      if (!obj || obj.get("id") === ARTBOARD_ID) return;
      const snapThreshold = 10;
      const center = obj.getCenterPoint();
      const print = getArtboardBounds(canvas);
      if (Math.abs(center.x - print.centerX) < snapThreshold) {
        obj.set("left", print.centerX - (center.x - (obj.left || 0)));
      }
      if (Math.abs(center.y - print.centerY) < snapThreshold) {
        obj.set("top", print.centerY - (center.y - (obj.top || 0)));
      }
    });

    canvas.on("object:added", (e) => {
      const obj = e.target;
      if (!obj || obj.get("id") === ARTBOARD_ID) return;
      normalizeObjectOrigin(obj);
      ensureArtboardAtBack(canvas);
      canvas.requestRenderAll();
    });

    // History for direct user gestures (drag/scale/rotate ends). Programmatic
    // mutations flow through useMutateObject, which records its own debounced
    // entry — the flag prevents double-recording.
    canvas.on("object:modified", (e) => {
      if ((e as { programmatic?: boolean }).programmatic) return;
      if (useEditorStore.getState().isRestoring) return;
      pushHistoryNow(canvas);
    });
  }

  function registerInteractions(canvas: Canvas, container: HTMLDivElement) {
    let isPanning = false;
    let lastPos = { x: 0, y: 0 };

    const isPanActive = () =>
      useEditorStore.getState().tool === "pan" || spaceHeldRef.current;

    const startPan = (x: number, y: number) => {
      isPanning = true;
      canvas.selection = false;
      canvas.defaultCursor = "grabbing";
      container.style.cursor = "grabbing";
      lastPos = { x, y };
    };

    const movePan = (x: number, y: number) => {
      if (!isPanning) return;
      panCanvasViewport(canvas, x - lastPos.x, y - lastPos.y);
      lastPos = { x, y };
    };

    const endPan = () => {
      if (!isPanning) return;
      isPanning = false;
      applyInteractionMode(canvas, useEditorStore.getState().tool === "pan");
    };

    canvas.on("mouse:down", (opt) => {
      const evt = opt.e as MouseEvent;
      if (!isPanActive() && evt.button !== 1) return;
      startPan(evt.clientX, evt.clientY);
    });
    canvas.on("mouse:move", (opt) => {
      const evt = opt.e as MouseEvent;
      movePan(evt.clientX, evt.clientY);
    });
    canvas.on("mouse:up", endPan);
    canvas.on("mouse:out", endPan);

    canvas.on("mouse:wheel", (opt) => {
      const evt = opt.e as WheelEvent;
      evt.preventDefault();
      evt.stopPropagation();
      const currentZoom = useEditorStore.getState().zoom;
      const delta = evt.deltaY > 0 ? -0.1 : 0.1;
      const nextZoom = clampZoom(currentZoom + delta);
      useEditorStore.getState().setZoom(nextZoom);
      applyCanvasZoom(canvas, nextZoom);
    });

    /* container-level pan + resize */
    const onContainerMouseDown = (e: MouseEvent) => {
      if (e.button !== 1 && !isPanActive()) return;
      if (
        e.target === canvasElRef.current ||
        (e.target as HTMLElement).closest(".upper-canvas")
      ) {
        return;
      }
      startPan(e.clientX, e.clientY);
    };
    const onContainerMouseMove = (e: MouseEvent) => movePan(e.clientX, e.clientY);
    const onContainerMouseUp = () => endPan();

    container.addEventListener("mousedown", onContainerMouseDown);
    container.addEventListener("mousemove", onContainerMouseMove);
    container.addEventListener("mouseup", onContainerMouseUp);
    container.addEventListener("mouseleave", onContainerMouseUp);

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w <= 0 || h <= 0) return;
      canvas.setDimensions({ width: w, height: h });
      relayoutWithContent(canvas, useEditorStore.getState().printSize);
    });
    resizeObserver.observe(container);

    /* keyboard */
    const isTypingTarget = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      return (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const store = useEditorStore.getState();

      // Space = temporary pan; never while typing in a field (D-36).
      if (e.code === "Space" && !e.repeat && !isTypingTarget(e)) {
        e.preventDefault();
        spaceHeldRef.current = true;
        container.style.cursor = "grab";
        canvas.defaultCursor = "grab";
        return;
      }

      if (e.ctrlKey && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        store.undo();
        return;
      }
      if (e.ctrlKey && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        store.redo();
        return;
      }
      if (e.ctrlKey && e.key === "0") {
        e.preventDefault();
        store.setZoom(1);
        resetCanvasViewport(canvas);
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === "a" && !isTypingTarget(e)) {
        e.preventDefault();
        const objects = canvas
          .getObjects()
          .filter((o) => o.selectable !== false && o.get("id") !== ARTBOARD_ID);
        if (objects.length > 0) {
          canvas.discardActiveObject();
          const selection = new ActiveSelection(objects, { canvas });
          canvas.setActiveObject(selection);
          canvas.renderAll();
        }
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const active = canvas.getActiveObject();
        if (active && active.get("id") !== ARTBOARD_ID) {
          active.clone().then((cloned: FabricObject) => {
            cloned.set({ left: (active.left || 0) + 20, top: (active.top || 0) + 20 });
            canvas.add(cloned);
            canvas.setActiveObject(cloned);
            canvas.renderAll();
            pushHistoryNow(canvas);
          });
        }
        return;
      }

      if (isTypingTarget(e)) return;

      // Delete — but never while editing text inline (D-37).
      if (e.key === "Delete" || e.key === "Backspace") {
        const active = canvas.getActiveObject();
        if (
          active &&
          active.get("id") !== ARTBOARD_ID &&
          !(active instanceof IText && active.isEditing)
        ) {
          e.preventDefault();
          const targets =
            active instanceof ActiveSelection ? active.getObjects() : [active];
          targets.forEach((obj) => canvas.remove(obj));
          canvas.discardActiveObject();
          canvas.renderAll();
          pushHistoryNow(canvas);
        }
        return;
      }

      if (e.key === "Escape") {
        canvas.discardActiveObject();
        canvas.renderAll();
        return;
      }

      // Arrow-key nudge — the keyboard alternative V1 never had.
      const NUDGE: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      if (e.key in NUDGE) {
        const active = canvas.getActiveObject();
        if (active && active.get("id") !== ARTBOARD_ID) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const [dx, dy] = NUDGE[e.key];
          active.set({
            left: (active.left || 0) + dx * step,
            top: (active.top || 0) + dy * step,
          });
          active.setCoords();
          canvas.requestRenderAll();
          schedulePushHistory(canvas);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeldRef.current = false;
        applyInteractionMode(canvas, useEditorStore.getState().tool === "pan");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener("mousedown", onContainerMouseDown);
      container.removeEventListener("mousemove", onContainerMouseMove);
      container.removeEventListener("mouseup", onContainerMouseUp);
      container.removeEventListener("mouseleave", onContainerMouseUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }

  return fabricRef;
}
