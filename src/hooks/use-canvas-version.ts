"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import type { Canvas as FabricCanvas } from "fabric";

/**
 * Subscribe React to Fabric canvas events via useSyncExternalStore.
 *
 * V1 bridged Fabric's in-place mutations to React with `forceUpdate` counters
 * re-rendering a 953-line component on every `object:moving` frame (~60/s
 * during a drag). This hook is the structural replacement: components declare
 * the events they care about, updates are throttled, and React subscribes
 * through its official external-store contract.
 */
const THROTTLE_MS = 50;

const DEFAULT_EVENTS = [
  "selection:created",
  "selection:updated",
  "selection:cleared",
  "object:modified",
  "object:added",
  "object:removed",
] as const;

export function useCanvasVersion(
  canvas: FabricCanvas | null,
  events: readonly string[] = DEFAULT_EVENTS,
): number {
  const versionRef = useRef(0);
  const eventsKey = events.join(",");

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!canvas) return () => {};

      let last = 0;
      let trailing: ReturnType<typeof setTimeout> | null = null;

      const bump = () => {
        const now = Date.now();
        if (now - last >= THROTTLE_MS) {
          last = now;
          versionRef.current += 1;
          onStoreChange();
        } else if (!trailing) {
          trailing = setTimeout(() => {
            trailing = null;
            last = Date.now();
            versionRef.current += 1;
            onStoreChange();
          }, THROTTLE_MS);
        }
      };

      const names = eventsKey.split(",");
      names.forEach((name) => canvas.on(name as never, bump as never));
      return () => {
        if (trailing) clearTimeout(trailing);
        names.forEach((name) => canvas.off(name as never, bump as never));
      };
    },
    [canvas, eventsKey],
  );

  return useSyncExternalStore(
    subscribe,
    () => versionRef.current,
    () => 0,
  );
}
