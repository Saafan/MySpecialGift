"use client";

import { useCallback } from "react";
import type { Canvas as FabricCanvas, FabricObject } from "fabric";
import { useEditorStore } from "@/store/editor-store";

/**
 * The single write-path for programmatic Fabric mutations.
 *
 * V1's BUG-P01: Fabric mutates objects in place and fires no event for
 * programmatic `.set()`, so React re-rendered inspector inputs with stale
 * values — every control snapped back as you typed. The fix was a convention
 * ("remember to call canvas.fire after every set") spread across ten call
 * sites; forgetting it in an eleventh silently reintroduced the bug.
 *
 * Here the convention is a mechanism. `mutateObject` performs the mutation,
 * coordinate refresh, re-render, modification event (marked programmatic so
 * the canvas-level history listener doesn't double-record it) and a debounced
 * history push — in one place. A new control cannot forget any step.
 */

const HISTORY_DEBOUNCE_MS = 500;

let historyTimer: ReturnType<typeof setTimeout> | null = null;

export function schedulePushHistory(canvas: FabricCanvas) {
  if (historyTimer) clearTimeout(historyTimer);
  historyTimer = setTimeout(() => {
    historyTimer = null;
    useEditorStore.getState().pushHistory(JSON.stringify(canvas.toJSON()));
  }, HISTORY_DEBOUNCE_MS);
}

export function pushHistoryNow(canvas: FabricCanvas) {
  if (historyTimer) {
    clearTimeout(historyTimer);
    historyTimer = null;
  }
  useEditorStore.getState().pushHistory(JSON.stringify(canvas.toJSON()));
}

export type ProgrammaticModifiedEvent = { target: FabricObject; programmatic?: boolean };

export function useMutateObject() {
  return useCallback(
    (target: FabricObject | null | undefined, fn: (obj: FabricObject) => void) => {
      const canvas = useEditorStore.getState().canvas;
      if (!canvas || !target) return;

      fn(target);
      target.setCoords();
      canvas.requestRenderAll();
      canvas.fire("object:modified", {
        target,
        programmatic: true,
      } as never);
      schedulePushHistory(canvas);
    },
    [],
  );
}
